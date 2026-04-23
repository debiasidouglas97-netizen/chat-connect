// Edge function: resolve a login identifier (email/CPF/username) to the user's email.
// Allows the client to call supabase.auth.signInWithPassword with the resolved email.
// Public function (no JWT required) — only returns the email if a profile exists.

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const identifier: string = (body?.identifier || "").toString().trim();

    if (!identifier) {
      return new Response(
        JSON.stringify({ error: "identifier é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // If already an email, return as-is
    if (identifier.includes("@")) {
      return new Response(JSON.stringify({ email: identifier }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const digits = onlyDigits(identifier);
    let query = admin.from("profiles").select("email, cpf, username").limit(1);

    // CPF (11 digits) takes priority
    if (digits.length === 11) {
      query = query.eq("cpf", digits);
    } else {
      // Try as username (case-insensitive)
      query = query.ilike("username", identifier);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error("resolve-login query error", error);
      return new Response(JSON.stringify({ error: "Erro ao consultar usuário" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!data?.email) {
      return new Response(JSON.stringify({ error: "Usuário não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ email: data.email }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("resolve-login error", e);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
