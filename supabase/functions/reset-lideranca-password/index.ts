// Edge function: reset-lideranca-password
// Permite que admins (deputado/chefe_gabinete) redefinam a senha de uma liderança.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

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

    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId);
    const isAdmin = (roles ?? []).some(
      (r: any) => r.role === "deputado" || r.role === "chefe_gabinete",
    );
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: callerProfile } = await admin
      .from("profiles")
      .select("tenant_id")
      .eq("id", callerId)
      .single();
    const tenantId = (callerProfile as any)?.tenant_id;

    const body = await req.json().catch(() => ({}));
    const liderancaId: string = (body?.liderancaId || "").toString();
    const newPassword: string = (body?.newPassword || "").toString();

    if (!liderancaId) {
      return new Response(JSON.stringify({ error: "liderancaId é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (newPassword.length < 8) {
      return new Response(JSON.stringify({ error: "Senha deve ter no mínimo 8 caracteres" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Encontrar profile vinculado e validar tenant
    const { data: profile } = await admin
      .from("profiles")
      .select("id, tenant_id")
      .eq("lideranca_id", liderancaId)
      .maybeSingle();
    if (!profile || (profile as any).tenant_id !== tenantId) {
      return new Response(JSON.stringify({ error: "Liderança sem usuário vinculado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: updErr } = await admin.auth.admin.updateUserById(
      (profile as any).id,
      { password: newPassword },
    );
    if (updErr) {
      return new Response(JSON.stringify({ error: "Falha ao atualizar senha: " + updErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("reset-lideranca-password error", e);
    return new Response(JSON.stringify({ error: (e as Error)?.message ?? "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
