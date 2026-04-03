import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// CEPESP API for TSE voting data
const CEPESP_BASE = "https://cepesp.io/api/consulta/athena";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function handledFailure(error: string, extra: Record<string, unknown> = {}) {
  return jsonResponse({ success: false, error, ...extra });
}

function safeJsonParse<T = unknown>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function isHtmlLikeResponse(contentType: string | null, text: string): boolean {
  const sample = text.slice(0, 300).toLowerCase();
  return Boolean(
    contentType?.includes("text/html") ||
    sample.includes("<!doctype html") ||
    sample.includes("<html") ||
    sample.includes("acesso rejeitado")
  );
}

function extractSupportId(text: string): string | null {
  return text.match(/suporte id\s*:\s*([0-9]+)/i)?.[1] ?? null;
}

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
      return jsonResponse({ error: "tenant_id required" }, 400);
    }

    const sb = createClient(supabaseUrl, supabaseKey);

    // Get tenant info
    const { data: tenant, error: tErr } = await sb
      .from("tenants")
      .select("nr_candidato_tse, ano_eleicao, estado, nome_parlamentar, nome")
      .eq("id", tenant_id)
      .single();

    if (tErr || !tenant) {
      return jsonResponse({ error: "Tenant not found" }, 404);
    }

    const nrCandidato = (tenant as any).nr_candidato_tse?.trim?.() || (tenant as any).nr_candidato_tse;
    if (!nrCandidato) {
      return handledFailure("Número do candidato TSE não configurado. Configure em Configurações > Integrações.", {
        missing_configuration: true,
      });
    }

    const anoEleicao = (tenant as any).ano_eleicao || 2022;
    const uf = getUF((tenant as any).estado || "SP");

    // Use CEPESP API to query votes
    const queryUrl = `${CEPESP_BASE}/query?table=votos&anos=${anoEleicao}&cargo=6&agregacao_regional=6&uf_filter=${uf}&c[]=NOME_MUNICIPIO&c[]=QTDE_VOTOS&c[]=NUMERO_CANDIDATO&numero_candidato_filter=${nrCandidato}`;

    console.log("Querying CEPESP:", queryUrl);

    const queryRes = await fetch(queryUrl);
    const queryText = await queryRes.text();

    if (!queryRes.ok || isHtmlLikeResponse(queryRes.headers.get("content-type"), queryText)) {
      console.log("CEPESP query failed or returned HTML, trying fallback...", JSON.stringify({
        status: queryRes.status,
        support_id: extractSupportId(queryText),
      }));
      return await fallbackTSE(sb, tenant_id, nrCandidato, anoEleicao, uf);
    }

    const queryData = safeJsonParse<any>(queryText);
    if (!queryData) {
      console.log("CEPESP returned non-JSON payload, trying fallback...");
      return await fallbackTSE(sb, tenant_id, nrCandidato, anoEleicao, uf);
    }

    console.log("CEPESP response:", JSON.stringify(queryData).slice(0, 500));

    if (queryData.id) {
      // Async query - need to poll for result
      let resultData: any = null;
      for (let i = 0; i < 15; i++) {
        await new Promise(r => setTimeout(r, 3000));
        const resultRes = await fetch(`${CEPESP_BASE}/result?id=${queryData.id}&format=json`);
        const resultText = await resultRes.text();

        if (!resultRes.ok || isHtmlLikeResponse(resultRes.headers.get("content-type"), resultText)) {
          continue;
        }

        if (resultText && resultText !== "null" && !resultText.includes("processing")) {
          const parsed = safeJsonParse<any>(resultText);
          if (parsed) {
            resultData = parsed;
            break;
          }
        }
      }

      if (!resultData) {
        return handledFailure("Consulta externa ainda em processamento. Tente novamente em alguns minutos.", {
          pending: true,
        });
      }

      // Process results
      const updated = await processVotingData(sb, tenant_id, resultData);
      return jsonResponse({ success: true, cities_updated: updated });
    }

    // Direct response (synchronous)
    if (Array.isArray(queryData)) {
      const updated = await processVotingData(sb, tenant_id, queryData);
      return jsonResponse({ success: true, cities_updated: updated });
    }

    return await fallbackTSE(sb, tenant_id, nrCandidato, anoEleicao, uf);

  } catch (err: any) {
    console.error("Error:", err);
    return jsonResponse({
      success: false,
      error: "Falha inesperada ao importar a votação.",
      details: err?.message || String(err),
    }, 500);
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

  const voteTotals = new Map<string, number>();
  for (const row of data) {
    const municipio = row.NOME_MUNICIPIO || row.nome_municipio || row.NM_MUNICIPIO || "";
    const votos = parseInt(
      String(row.QTDE_VOTOS || row.qtde_votos || row.QT_VOTOS || row.qt_votos || row.VOTOS || row.votos || "0"),
      10,
    );
    const normalizedCity = extractCityName(municipio);

    if (!normalizedCity || !Number.isFinite(votos) || votos <= 0) continue;
    voteTotals.set(normalizedCity, (voteTotals.get(normalizedCity) || 0) + votos);
  }

  let updated = 0;
  for (const [normalizedCity, votos] of voteTotals.entries()) {
    const cityId = cityMap.get(normalizedCity);

    if (!cityId) continue;

    const { error } = await sb
      .from("cidades")
      .update({ votos_2022: votos, updated_at: new Date().toISOString() })
      .eq("id", cityId);

    if (!error) updated++;
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
  const text = await res.text();

  if (!res.ok || isHtmlLikeResponse(res.headers.get("content-type"), text)) {
    const supportId = extractSupportId(text);
    console.log("Automatic TSE source unavailable", JSON.stringify({
      status: res.status,
      support_id: supportId,
    }));

    return handledFailure(
      "A fonte automática do TSE ficou indisponível neste momento porque o portal externo bloqueou a consulta. Tente novamente mais tarde.",
      {
        source: "tse",
        blocked: true,
        status: res.status,
        support_id: supportId,
      },
    );
  }

  // Parse CSV
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) {
    return handledFailure("Nenhum dado encontrado para este candidato.");
  }

  const headers = lines[0].split(",").map(h => h.replace(/"/g, "").trim());
  const munIdx = headers.findIndex(h => h.includes("MUNICIPIO") || h.includes("NM_MUNICIPIO") || h.includes("NOME_MUNICIPIO"));
  const votosIdx = headers.findIndex(h => h.includes("QTDE_VOTOS") || h.includes("QT_VOTOS") || h.includes("VOTOS"));

  if (munIdx === -1 || votosIdx === -1) {
    console.log("CSV headers:", headers);
    return handledFailure("A fonte automática devolveu um formato diferente do esperado.", {
      source: "tse",
      headers: headers.slice(0, 10),
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
  return jsonResponse({ success: true, cities_updated: updated, total_rows: rows.length });
}
