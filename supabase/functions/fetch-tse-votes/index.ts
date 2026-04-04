import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalize(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { tenant_id, votes } = body;

    if (!tenant_id) {
      return jsonResponse({ error: "tenant_id required" }, 400);
    }

    if (!votes || typeof votes !== "object" || Object.keys(votes).length === 0) {
      return jsonResponse({ error: "votes data required (object: { city_name: vote_count })" }, 400);
    }

    const sb = createClient(supabaseUrl, supabaseKey);

    // Get all cities for this tenant
    const { data: cities, error: citiesErr } = await sb
      .from("cidades")
      .select("id, name")
      .eq("tenant_id", tenant_id);

    if (citiesErr || !cities || cities.length === 0) {
      return jsonResponse({ success: true, cities_updated: 0, message: "Nenhuma cidade cadastrada." });
    }

    // Build normalized vote lookup
    const voteMap = new Map<string, number>();
    for (const [cityName, count] of Object.entries(votes)) {
      const normalized = normalize(cityName);
      if (typeof count === "number" && count > 0) {
        voteMap.set(normalized, (voteMap.get(normalized) || 0) + count);
      }
    }

    // Match and update
    let updated = 0;
    for (const city of cities) {
      const cityName = normalize(city.name.split("/")[0]);
      const votos = voteMap.get(cityName);
      if (votos !== undefined && votos > 0) {
        const { error } = await sb
          .from("cidades")
          .update({ votos_2022: votos, updated_at: new Date().toISOString() })
          .eq("id", city.id);
        if (!error) updated++;
      }
    }

    console.log(`Updated ${updated} cities out of ${cities.length} (${voteMap.size} TSE municipalities)`);

    return jsonResponse({
      success: true,
      cities_updated: updated,
      total_cities: cities.length,
      tse_municipalities: voteMap.size,
    });

  } catch (err: any) {
    console.error("Error:", err);
    return jsonResponse({
      success: false,
      error: "Falha ao importar votação.",
      details: err?.message || String(err),
    }, 500);
  }
});
