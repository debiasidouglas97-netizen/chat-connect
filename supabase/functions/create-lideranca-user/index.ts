// Edge function: create-lideranca-user
// Provisiona atomicamente: liderança (ou usa existente) + auth user + profile + role.
// Modo "create": cria nova liderança e usuário juntos.
// Modo "link": liderança já existe (liderancaId), apenas cria o usuário e vincula.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function onlyDigits(s: string) {
  return (s || "").replace(/\D/g, "");
}

interface Payload {
  // Modo
  mode?: "create" | "link"; // default: "create"
  liderancaId?: string; // obrigatório no modo "link"

  // Acesso (sempre obrigatórios)
  email: string;
  cpf: string;
  username: string;
  password: string;

  // Dados da liderança (obrigatórios no modo "create")
  name?: string;
  cargo?: string;
  cidadePrincipal?: string;
  influencia?: string;
  tipo?: string;
  engajamento?: number;
  atuacao?: Array<{ cidadeNome: string; intensidade: string }>;
  phone?: string | null;
  whatsapp?: string | null;
  telegram_username?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  youtube?: string | null;
  avatar_url?: string | null;
  img?: string;
  address_cep?: string | null;
  address_street?: string | null;
  address_number?: string | null;
  address_neighborhood?: string | null;
  address_city?: string | null;
  address_state?: string | null;
  meta_votos_tipo?: string | null;
  meta_votos_valor?: number | null;
  rg?: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // 1. Validar JWT do chamador (deve ser admin)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = userData.user.id;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Verificar role admin
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId);
    const isAdmin = (roles ?? []).some(
      (r: any) => r.role === "deputado" || r.role === "chefe_gabinete",
    );
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Acesso negado: apenas Deputado ou Chefe de Gabinete" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Tenant do chamador
    const { data: callerProfile } = await admin
      .from("profiles")
      .select("tenant_id")
      .eq("id", callerId)
      .single();
    const tenantId = (callerProfile as any)?.tenant_id;
    if (!tenantId) {
      return new Response(JSON.stringify({ error: "Tenant não identificado" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Validar payload
    const body = (await req.json().catch(() => ({}))) as Payload;
    const mode = body.mode ?? "create";

    const email = (body.email || "").trim().toLowerCase();
    const cpfDigits = onlyDigits(body.cpf || "");
    const username = (body.username || "").trim();
    const password = body.password || "";

    if (!email || !email.includes("@")) {
      return new Response(JSON.stringify({ error: "E-mail inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (cpfDigits.length !== 11) {
      return new Response(JSON.stringify({ error: "CPF deve ter 11 dígitos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!/^[a-zA-Z0-9_.]{3,}$/.test(username)) {
      return new Response(JSON.stringify({ error: "Username inválido (mínimo 3 caracteres, apenas letras, números, _ ou .)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (password.length < 8) {
      return new Response(JSON.stringify({ error: "Senha deve ter no mínimo 8 caracteres" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (mode === "create") {
      if (!body.name?.trim() || !body.cargo?.trim() || !body.cidadePrincipal?.trim()) {
        return new Response(JSON.stringify({ error: "Nome, cargo e cidade principal são obrigatórios" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
    if (mode === "link" && !body.liderancaId) {
      return new Response(JSON.stringify({ error: "liderancaId é obrigatório no modo link" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Pré-checar unicidade
    const { data: dups } = await admin
      .from("profiles")
      .select("id, cpf, username, email")
      .or(`cpf.eq.${cpfDigits},username.ilike.${username},email.ilike.${email}`);
    if (dups && dups.length > 0) {
      const dup = dups[0] as any;
      let field = "registro";
      if (dup.cpf === cpfDigits) field = "CPF";
      else if ((dup.username || "").toLowerCase() === username.toLowerCase()) field = "username";
      else if ((dup.email || "").toLowerCase() === email) field = "e-mail";
      return new Response(JSON.stringify({ error: `${field} já está em uso` }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Criar liderança (modo create) ou validar existente (modo link)
    let liderancaId = body.liderancaId!;
    if (mode === "create") {
      const img = body.img || (body.name || "").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
      const { data: lid, error: lidErr } = await admin
        .from("liderancas")
        .insert({
          name: body.name!.trim(),
          img,
          avatar_url: body.avatar_url ?? null,
          cidade_principal: body.cidadePrincipal!.trim(),
          cargo: body.cargo!.trim(),
          influencia: body.influencia ?? "Média",
          tipo: body.tipo ?? "Comunitária",
          engajamento: body.engajamento ?? 50,
          atuacao: body.atuacao && body.atuacao.length > 0
            ? body.atuacao
            : [{ cidadeNome: body.cidadePrincipal!.trim(), intensidade: "Alta" }],
          phone: body.phone ?? null,
          whatsapp: body.whatsapp ?? null,
          email,
          telegram_username: body.telegram_username ?? null,
          instagram: body.instagram ?? null,
          facebook: body.facebook ?? null,
          youtube: body.youtube ?? null,
          address_cep: body.address_cep ?? null,
          address_street: body.address_street ?? null,
          address_number: body.address_number ?? null,
          address_neighborhood: body.address_neighborhood ?? null,
          address_city: body.address_city ?? null,
          address_state: body.address_state ?? null,
          meta_votos_tipo: body.meta_votos_tipo ?? null,
          meta_votos_valor: body.meta_votos_valor ?? null,
          tenant_id: tenantId,
        })
        .select("id")
        .single();
      if (lidErr || !lid) {
        return new Response(JSON.stringify({ error: "Falha ao criar liderança: " + (lidErr?.message ?? "desconhecido") }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      liderancaId = (lid as any).id;
    } else {
      // modo link: verificar se a liderança existe e pertence ao tenant
      const { data: existing } = await admin
        .from("liderancas")
        .select("id, tenant_id, name, avatar_url, img, cidade_principal")
        .eq("id", liderancaId)
        .single();
      if (!existing || (existing as any).tenant_id !== tenantId) {
        return new Response(JSON.stringify({ error: "Liderança não encontrada" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Verificar se já tem usuário vinculado
      const { data: linked } = await admin
        .from("profiles")
        .select("id")
        .eq("lideranca_id", liderancaId)
        .maybeSingle();
      if (linked) {
        return new Response(JSON.stringify({ error: "Esta liderança já tem acesso ao sistema cadastrado" }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Preencher campos para o profile
      body.name = (existing as any).name;
      body.avatar_url = (existing as any).avatar_url ?? (existing as any).img;
      body.cidadePrincipal = (existing as any).cidade_principal;
    }

    // 5. Criar usuário no auth (auto-confirma e-mail)
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: body.name },
    });

    if (createErr || !created?.user) {
      // Rollback liderança recém-criada
      if (mode === "create") {
        await admin.from("liderancas").delete().eq("id", liderancaId);
      }
      return new Response(JSON.stringify({ error: "Falha ao criar usuário: " + (createErr?.message ?? "desconhecido") }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = created.user.id;

    try {
      // 6. Atualizar profile (criado pelo trigger handle_new_user)
      const { error: profErr } = await admin
        .from("profiles")
        .update({
          full_name: body.name,
          email,
          tenant_id: tenantId,
          cpf: cpfDigits,
          username,
          whatsapp: onlyDigits(body.whatsapp || ""),
          telegram_username: body.telegram_username || null,
          role: "lideranca",
          lideranca_id: liderancaId,
          avatar_url: body.avatar_url ?? null,
          cities: [body.cidadePrincipal!],
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);
      if (profErr) throw profErr;

      // 7. Atribuir role
      const { error: roleErr } = await admin
        .from("user_roles")
        .insert({ user_id: userId, role: "lideranca" });
      if (roleErr) throw roleErr;

      return new Response(JSON.stringify({ success: true, liderancaId, userId }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (innerErr) {
      // Rollback: deleta auth user e (se modo create) liderança
      console.error("rollback create-lideranca-user", innerErr);
      try { await admin.auth.admin.deleteUser(userId); } catch (_) { /* ignore */ }
      if (mode === "create") {
        await admin.from("liderancas").delete().eq("id", liderancaId);
      }
      return new Response(JSON.stringify({ error: "Falha ao vincular usuário: " + ((innerErr as Error)?.message ?? "desconhecido") }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (e) {
    console.error("create-lideranca-user error", e);
    return new Response(JSON.stringify({ error: (e as Error)?.message ?? "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
