import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// CEPESP API for TSE voting data
const CEPESP_BASE = "https://cepesp.io/api/consulta/athena";

// Normalize city name for matching (remove accents, lowercase, trim)
function normalize(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

// Extract city name without UF suffix (e.g. "Santos/SP" → "santos")
function extractCityName(name: string): string {
  return normalize(name.split("/")[0]);
}

// Map full state name to UF code
const STATE_TO_UF: Record<string, string> = {
  "acre": "AC", "alagoas": "AL", "amapa": "AP", "amazonas": "AM",
  "bahia": "BA", "ceara": "CE", "distrito federal": "DF",
  "espirito santo": "ES", "goias": "GO", "maranhao": "MA",
  "mato grosso": "MT", "mato grosso do sul": "MS", "minas gerais": "MG",
  "para": "PA", "paraiba": "PB", "parana": "PR", "pernambuco": "PE",
  "piaui": "PI", "rio de janeiro": "RJ", "rio grande do norte": "RN",
  "rio grande do sul": "RS", "rondonia": "RO", "roraima": "RR",
  "santa catarina": "SC", "sao paulo": "SP", "sergipe": "SE",
  "tocantins": "TO",
};

function getUF(state: string): string {
  if (state.length === 2) return state.toUpperCase();
  return STATE_TO_UF[normalize(state)] || state.toUpperCase();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { tenant_id } = await req.json();
    if (!tenant_id) {
      return new Response(JSON.stringify({ error: "tenant_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(supabaseUrl, supabaseKey);

    // Get tenant info
    const { data: tenant, error: tErr } = await sb
      .from("tenants")
      .select("nr_candidato_tse, ano_eleicao, estado, nome_parlamentar, nome")
      .eq("id", tenant_id)
      .single();

    if (tErr || !tenant) {
      return new Response(JSON.stringify({ error: "Tenant not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const nrCandidato = (tenant as any).nr_candidato_tse;
    if (!nrCandidato) {
      return new Response(JSON.stringify({ error: "Número do candidato TSE não configurado. Configure em Configurações > Integrações." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anoEleicao = (tenant as any).ano_eleicao || 2022;
    const uf = getUF((tenant as any).estado || "SP");

    // Use CEPESP API to query votes
    // Step 1: Submit query
    const queryParams = new URLSearchParams({
      table: "votos",
      anos: String(anoEleicao),
      cargo: "6", // Deputado Federal
      agregacao_regional: "6", // Município
      uf_filter: uf,
      "c[]": "NOME_MUNICIPIO",
    });
    // Need multiple c[] params
    const queryUrl = `${CEPESP_BASE}/query?table=votos&anos=${anoEleicao}&cargo=6&agregacao_regional=6&uf_filter=${uf}&c[]=NOME_MUNICIPIO&c[]=QTDE_VOTOS&c[]=NUMERO_CANDIDATO&numero_candidato_filter=${nrCandidato}`;

    console.log("Querying CEPESP:", queryUrl);

    const queryRes = await fetch(queryUrl);
    if (!queryRes.ok) {
      // Fallback: try direct TSE CDN approach
      console.log("CEPESP query failed, trying fallback...");
      return await fallbackTSE(sb, tenant_id, nrCandidato, anoEleicao, uf);
    }

    const queryData = await queryRes.json();
    console.log("CEPESP response:", JSON.stringify(queryData).slice(0, 500));

    if (queryData.id) {
      // Async query - need to poll for result
      let resultData: any = null;
      for (let i = 0; i < 15; i++) {
        await new Promise(r => setTimeout(r, 3000));
        const resultRes = await fetch(`${CEPESP_BASE}/result?id=${queryData.id}&format=json`);
        if (resultRes.ok) {
          const text = await resultRes.text();
          if (text && text !== "null" && !text.includes("processing")) {
            try {
              resultData = JSON.parse(text);
              break;
            } catch { /* still processing */ }
          }
        }
      }

      if (!resultData) {
        return new Response(JSON.stringify({ error: "Consulta TSE ainda em processamento. Tente novamente em alguns minutos." }), {
          status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Process results
      const updated = await processVotingData(sb, tenant_id, resultData);
      return new Response(JSON.stringify({ success: true, cities_updated: updated }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Direct response (synchronous)
    if (Array.isArray(queryData)) {
      const updated = await processVotingData(sb, tenant_id, queryData);
      return new Response(JSON.stringify({ success: true, cities_updated: updated }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return await fallbackTSE(sb, tenant_id, nrCandidato, anoEleicao, uf);

  } catch (err: any) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function processVotingData(sb: any, tenantId: string, data: any[]): Promise<number> {
  // Get all cities for this tenant
  const { data: cities } = await sb
    .from("cidades")
    .select("id, name")
    .eq("tenant_id", tenantId);

  if (!cities || cities.length === 0) return 0;

  // Build lookup map
  const cityMap = new Map<string, string>();
  for (const city of cities) {
    cityMap.set(extractCityName(city.name), city.id);
  }

  let updated = 0;
  for (const row of data) {
    const municipio = row.NOME_MUNICIPIO || row.nome_municipio || "";
    const votos = parseInt(row.QTDE_VOTOS || row.qtde_votos || "0", 10);
    const cityId = cityMap.get(normalize(municipio));

    if (cityId && votos > 0) {
      const { error } = await sb
        .from("cidades")
        .update({ votos_2022: votos, updated_at: new Date().toISOString() })
        .eq("id", cityId);

      if (!error) updated++;
    }
  }

  return updated;
}

async function fallbackTSE(sb: any, tenantId: string, nrCandidato: string, ano: number, uf: string) {
  // Try direct TSE CDN CSV download
  // File: votacao_candidato_munzona_YYYY_UF.csv inside a ZIP
  // Since we can't unzip in edge function easily, try the CEPESP tse endpoint
  const tseUrl = `https://cepesp.io/api/consulta/tse?anos=${ano}&cargo=6&agregacao_regional=6&uf_filter=${uf}&agregacao_politica=2&numero_candidato_filter=${nrCandidato}`;

  console.log("Trying CEPESP TSE endpoint:", tseUrl);

  const res = await fetch(tseUrl);
  if (!res.ok) {
    return new Response(JSON.stringify({
      error: "Não foi possível buscar dados do TSE. Verifique o número do candidato e tente novamente.",
      details: `Status: ${res.status}`,
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const text = await res.text();

  // Parse CSV
  const lines = text.split("\n").filter(l => l.trim());
  if (lines.length < 2) {
    return new Response(JSON.stringify({ error: "Nenhum dado encontrado para este candidato." }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const headers = lines[0].split(",").map(h => h.replace(/"/g, "").trim());
  const munIdx = headers.findIndex(h => h.includes("MUNICIPIO") || h.includes("NM_MUNICIPIO") || h.includes("NOME_MUNICIPIO"));
  const votosIdx = headers.findIndex(h => h.includes("QTDE_VOTOS") || h.includes("QT_VOTOS") || h.includes("VOTOS"));

  if (munIdx === -1 || votosIdx === -1) {
    console.log("CSV headers:", headers);
    return new Response(JSON.stringify({ error: "Formato de dados inesperado.", headers }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const rows = lines.slice(1).map(line => {
    const cols = line.split(",").map(c => c.replace(/"/g, "").trim());
    return {
      NOME_MUNICIPIO: cols[munIdx] || "",
      QTDE_VOTOS: cols[votosIdx] || "0",
    };
  });

  const updated = await processVotingData(sb, tenantId, rows);
  return new Response(JSON.stringify({ success: true, cities_updated: updated, total_rows: rows.length }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
