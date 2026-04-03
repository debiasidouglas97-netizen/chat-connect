import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch activity logs without AI description (limit batch)
    const { data: logs, error } = await supabase
      .from("activity_logs")
      .select("id, descricao_bruta, tipo_evento, entidade")
      .is("descricao_ia", null)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw error;
    if (!logs || logs.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!lovableKey) {
      // Fallback: use descricao_bruta as descricao_ia
      for (const log of logs) {
        await supabase
          .from("activity_logs")
          .update({ descricao_ia: log.descricao_bruta })
          .eq("id", log.id);
      }
      return new Response(JSON.stringify({ processed: logs.length, mode: "fallback" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Batch all descriptions in a single AI call
    const descriptions = logs.map((l, i) => `${i + 1}. [${l.tipo_evento}] ${l.descricao_bruta}`).join("\n");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `Você é um assessor parlamentar brasileiro. Para cada evento listado, gere uma descrição curta (máximo 1 linha), em linguagem clara, política e estratégica. Não use jargão técnico. Responda APENAS com um JSON array de strings, uma para cada evento na mesma ordem. Exemplo: ["Descrição 1", "Descrição 2"]`,
          },
          { role: "user", content: descriptions },
        ],
      }),
    });

    if (!aiResponse.ok) {
      // Fallback on AI error
      for (const log of logs) {
        await supabase
          .from("activity_logs")
          .update({ descricao_ia: log.descricao_bruta })
          .eq("id", log.id);
      }
      return new Response(JSON.stringify({ processed: logs.length, mode: "fallback_error" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Parse JSON array from response
    let aiDescriptions: string[] = [];
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        aiDescriptions = JSON.parse(jsonMatch[0]);
      }
    } catch {
      // If parsing fails, use bruta descriptions
    }

    // Update each log
    for (let i = 0; i < logs.length; i++) {
      const desc = aiDescriptions[i] || logs[i].descricao_bruta;
      await supabase
        .from("activity_logs")
        .update({ descricao_ia: desc })
        .eq("id", logs[i].id);
    }

    return new Response(JSON.stringify({ processed: logs.length, mode: "ai" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("activity-ai-describe error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
