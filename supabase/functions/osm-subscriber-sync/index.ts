// Edge function: sincroniza eleitores com a OSM NxTV (assinantes plano SEAC)
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const OSM_BASE_URL = "https://osm.2dwtecnologia.com.br";
const OSM_API_KEY = (Deno.env.get("OSM_API_KEY") ?? "").trim();

let cachedSeacPlanId: number | null = null;

async function osmFetch(path: string, init: RequestInit = {}) {
  const res = await fetch(`${OSM_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${OSM_API_KEY}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* ignore */ }
  return { ok: res.ok, status: res.status, body: json, raw: text };
}

async function resolveSeacPlanId(): Promise<number> {
  if (cachedSeacPlanId) return cachedSeacPlanId;
  const { ok, body, status, raw } = await osmFetch("/api/provider/plans", { method: "GET" });
  const list = Array.isArray(body) ? body : (Array.isArray(body?.data) ? body.data : null);
  if (!ok || !list) {
    throw new Error(`Falha ao listar planos OSM (${status}): ${raw?.slice(0, 200)}`);
  }
  const seac = list.find((p: any) =>
    String(p?.name || "").toLowerCase().includes("seac")
  );
  if (!seac?.id) throw new Error("Plano SEAC não encontrado na OSM");
  cachedSeacPlanId = Number(seac.id);
  return cachedSeacPlanId;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!OSM_API_KEY) throw new Error("OSM_API_KEY não configurada");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseService = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await authClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action as "create" | "update" | "delete" | undefined;
    const eleitorId = body?.eleitor_id as string | undefined;
    if (!action || !eleitorId || !["create", "update", "delete"].includes(action)) {
      return new Response(JSON.stringify({ error: "Body inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, supabaseService);
    const { data: eleitor, error: eErr } = await admin
      .from("eleitores")
      .select("*")
      .eq("id", eleitorId)
      .maybeSingle();
    if (eErr) throw eErr;
    if (!eleitor) {
      return new Response(JSON.stringify({ error: "Eleitor não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const extras = (eleitor.custom_field_values || {}) as Record<string, any>;
    const senha = extras?.senha ? String(extras.senha) : undefined;

    async function markError(msg: string) {
      await admin
        .from("eleitores")
        .update({
          osm_sync_status: "error",
          osm_sync_error: msg.slice(0, 1000),
        })
        .eq("id", eleitorId);
    }

    // DELETE
    if (action === "delete") {
      if (!eleitor.osm_subscriber_id) {
        return new Response(JSON.stringify({ ok: true, skipped: "no_external_id" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const r = await osmFetch(`/api/provider/subscribers/${eleitor.osm_subscriber_id}`, {
        method: "DELETE",
      });
      if (!r.ok) {
        await markError(`DELETE OSM ${r.status}: ${r.raw?.slice(0, 200)}`);
        return new Response(JSON.stringify({ error: "Falha ao excluir na OSM", detail: r.body || r.raw }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // CREATE or UPDATE
    const planId = await resolveSeacPlanId();

    // OSM exige email válido e password no cadastro.
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    let email = (eleitor.email || "").trim();
    if (!emailRegex.test(email)) {
      const digits = String(eleitor.whatsapp || "").replace(/\D/g, "") || eleitorId.replace(/-/g, "").slice(0, 12);
      email = `eleitor.${digits}@nxtv.local`;
    }
    const password = senha || `Nx${eleitorId.replace(/-/g, "").slice(0, 10)}!`;

    const payload: Record<string, any> = {
      name: eleitor.nome,
      email,
      password,
      phone: eleitor.whatsapp || undefined,
      plan_id: planId,
    };
    if ((eleitor as any).cpf) payload.cpf = (eleitor as any).cpf;

    const isUpdate = action === "update" && eleitor.osm_subscriber_id;

    const r = isUpdate
      ? await osmFetch(`/api/provider/subscribers/${eleitor.osm_subscriber_id}`, {
          method: "PUT",
          body: JSON.stringify({ ...payload, status: 1 }),
        })
      : await osmFetch("/api/provider/subscribers", {
          method: "POST",
          body: JSON.stringify(payload),
        });
    if (!r.ok) {
      let friendly = `${isUpdate ? "PUT" : "POST"} OSM ${r.status}`;
      const errs = r.body?.errors;
      if (errs && typeof errs === "object") {
        const parts: string[] = [];
        for (const [field, msgs] of Object.entries(errs)) {
          const m = Array.isArray(msgs) ? msgs.join(" ") : String(msgs);
          parts.push(`${field}: ${m}`);
        }
        if (parts.length) friendly = parts.join(" | ");
      } else if (r.body?.error) {
        friendly = String(r.body.error);
      } else if (r.raw) {
        friendly = r.raw.slice(0, 200);
      }
      await markError(friendly);
      return new Response(JSON.stringify({ error: friendly, detail: r.body || r.raw }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    const data = r.body?.data || r.body || {};
    const newSubId = data?.id ? Number(data.id) : eleitor.osm_subscriber_id;

    await admin
      .from("eleitores")
      .update({
        osm_subscriber_id: newSubId,
        osm_sync_status: "synced",
        osm_sync_error: null,
        osm_synced_at: new Date().toISOString(),
      })
      .eq("id", eleitorId);

    return new Response(JSON.stringify({ ok: true, subscriber_id: newSubId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("osm-subscriber-sync error", err);
    return new Response(JSON.stringify({ error: err?.message || "erro" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
