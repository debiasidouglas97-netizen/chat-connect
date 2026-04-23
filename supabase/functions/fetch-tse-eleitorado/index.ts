// Edge function: baixa o perfil do eleitorado por município (TSE) e atualiza
// a coluna `eleitores_2024` da tabela `cidades` para o tenant.
//
// Estratégia idêntica à `fetch-tse-votes`:
//  - Tenta múltiplos mirrors do arquivo ZIP do TSE
//  - Faz range-requests no ZIP, localiza o CSV do estado, descomprime via DecompressionStream
//  - Parseia o CSV (latin1, separador ";") procurando o total de eleitores aptos por município
//
// Arquivo de referência do TSE para 2024:
//   perfil_eleitorado_2024.zip → CSVs por UF, ex: perfil_eleitorado_2024_SP.csv
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const TSE_MIRRORS = [
  "https://cdn.tse.jus.br/estatistica/sead/odsele/perfil_eleitorado",
];

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  Accept: "*/*",
  "Accept-Language": "pt-BR,pt;q=0.9",
};

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

async function fetchRangeFromUrl(url: string, start: number, end: number): Promise<ArrayBuffer> {
  const res = await fetch(url, {
    headers: { ...BROWSER_HEADERS, Range: `bytes=${start}-${end}` },
  });
  if (!res.ok && res.status !== 206) {
    const text = await res.text();
    if (text.includes("<!DOCTYPE") || text.includes("<html")) throw new Error("WAF_BLOCKED");
    throw new Error(`HTTP ${res.status}`);
  }
  return res.arrayBuffer();
}

interface ZipEntry {
  compSize: number;
  localOffset: number;
  compMethod: number;
}

async function findZipEntry(url: string, totalSize: number, targetName: string): Promise<ZipEntry | null> {
  const eocdSize = Math.min(65536, totalSize);
  const eocdBuf = await fetchRangeFromUrl(url, totalSize - eocdSize, totalSize - 1);
  const eocdData = new Uint8Array(eocdBuf);

  let eocdPos = -1;
  for (let i = eocdData.length - 22; i >= 0; i--) {
    if (
      eocdData[i] === 0x50 &&
      eocdData[i + 1] === 0x4b &&
      eocdData[i + 2] === 0x05 &&
      eocdData[i + 3] === 0x06
    ) {
      eocdPos = i;
      break;
    }
  }
  if (eocdPos === -1) throw new Error("ZIP inválido");

  const view = new DataView(eocdBuf, eocdPos);
  const cdSize = view.getUint32(12, true);
  const cdOffset = view.getUint32(16, true);

  const cdBuf = await fetchRangeFromUrl(url, cdOffset, cdOffset + cdSize - 1);
  const cdData = new Uint8Array(cdBuf);
  const cdView = new DataView(cdBuf);

  let pos = 0;
  const target = targetName.toUpperCase();
  while (pos < cdData.length - 46) {
    if (
      cdData[pos] !== 0x50 ||
      cdData[pos + 1] !== 0x4b ||
      cdData[pos + 2] !== 0x01 ||
      cdData[pos + 3] !== 0x02
    )
      break;
    const compMethod = cdView.getUint16(pos + 10, true);
    const compSize = cdView.getUint32(pos + 20, true);
    const fnameLen = cdView.getUint16(pos + 28, true);
    const extraLen = cdView.getUint16(pos + 30, true);
    const commentLen = cdView.getUint16(pos + 32, true);
    const localOffset = cdView.getUint32(pos + 42, true);
    const fname = new TextDecoder().decode(cdData.slice(pos + 46, pos + 46 + fnameLen));
    if (fname.toUpperCase().includes(target)) {
      return { compSize, localOffset, compMethod };
    }
    pos += 46 + fnameLen + extraLen + commentLen;
  }
  return null;
}

async function downloadAndParseEleitorado(
  uf: string,
  ano: number,
): Promise<Record<string, number>> {
  const zipFile = `perfil_eleitorado_${ano}.zip`;

  let zipUrl = "";
  let totalSize = 0;

  for (const base of TSE_MIRRORS) {
    const url = `${base}/${zipFile}`;
    try {
      const headRes = await fetch(url, { method: "HEAD", headers: BROWSER_HEADERS });
      const ct = headRes.headers.get("content-type") || "";
      if (headRes.ok && !ct.includes("html")) {
        totalSize = parseInt(headRes.headers.get("Content-Length") || "0", 10);
        if (totalSize > 0) {
          zipUrl = url;
          break;
        }
      }
      const rangeRes = await fetch(url, {
        headers: { ...BROWSER_HEADERS, Range: "bytes=0-3" },
      });
      if (rangeRes.ok || rangeRes.status === 206) {
        const bytes = new Uint8Array(await rangeRes.arrayBuffer());
        if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
          const cr = rangeRes.headers.get("Content-Range") || "";
          const match = cr.match(/\/(\d+)/);
          if (match) {
            totalSize = parseInt(match[1], 10);
            zipUrl = url;
            break;
          }
        }
      }
    } catch {
      continue;
    }
  }

  if (!zipUrl || !totalSize) {
    throw new Error("Não foi possível acessar o eleitorado do TSE.");
  }

  console.log(`Using: ${zipUrl} (${(totalSize / 1024 / 1024).toFixed(1)}MB)`);

  // O ZIP de perfil de eleitorado contém um único CSV nacional (perfil_eleitorado_2024.csv).
  // Filtramos pela UF durante o parse usando a coluna SG_UF.
  const entry = await findZipEntry(zipUrl, totalSize, `perfil_eleitorado_${ano}.csv`);
  if (!entry) throw new Error(`CSV nacional do TSE não encontrado no ZIP`);
  if (entry.compMethod !== 8) throw new Error("Formato de compressão não suportado");

  const headerBuf = await fetchRangeFromUrl(zipUrl, entry.localOffset, entry.localOffset + 300);
  const hView = new DataView(headerBuf);
  const fnameLen = hView.getUint16(26, true);
  const extraLen = hView.getUint16(28, true);
  const dataOffset = entry.localOffset + 30 + fnameLen + extraLen;

  console.log(`Downloading ${(entry.compSize / 1024 / 1024).toFixed(1)}MB compressed data...`);
  const compBuf = await fetchRangeFromUrl(
    zipUrl,
    dataOffset,
    dataOffset + entry.compSize - 1,
  );
  const compressed = new Uint8Array(compBuf);

  console.log("Decompressing...");
  const ds = new DecompressionStream("deflate-raw");
  const writer = ds.writable.getWriter();
  const reader = ds.readable.getReader();

  const writePromise = (async () => {
    const chunkSize = 512 * 1024;
    for (let i = 0; i < compressed.length; i += chunkSize) {
      await writer.write(compressed.subarray(i, Math.min(i + chunkSize, compressed.length)));
    }
    await writer.close();
  })();

  // Acumulador: município → total de eleitores aptos (já filtrado por UF)
  const eleitores: Record<string, number> = {};
  const decoder = new TextDecoder("latin1");
  let partialLine = "";
  let headerCols: string[] | null = null;
  let nmMunIdx = -1,
    qtIdx = -1,
    sgUfIdx = -1;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    const text = partialLine + decoder.decode(value, { stream: true });
    const lines = text.split("\n");
    partialLine = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const cols = trimmed.split(";").map((c) => c.replace(/"/g, ""));

      if (!headerCols) {
        headerCols = cols;
        nmMunIdx = cols.indexOf("NM_MUNICIPIO");
        sgUfIdx = cols.indexOf("SG_UF");
        // Coluna do total de eleitores no município (linha já é por perfil — então somamos).
        qtIdx = cols.indexOf("QT_ELEITORES_PERFIL");
        if (qtIdx === -1) qtIdx = cols.indexOf("QT_ELEITORES_INC_NM_SOCIAL");
        if (nmMunIdx === -1 || qtIdx === -1 || sgUfIdx === -1) {
          throw new Error("Formato CSV inesperado (colunas não encontradas)");
        }
        continue;
      }

      const maxIdx = Math.max(nmMunIdx, qtIdx, sgUfIdx);
      if (cols.length <= maxIdx) continue;
      // Filtra apenas o estado solicitado
      if (cols[sgUfIdx] !== uf) continue;
      const mun = normalize(cols[nmMunIdx]);
      const v = parseInt(cols[qtIdx], 10);
      if (mun && Number.isFinite(v) && v > 0) {
        eleitores[mun] = (eleitores[mun] || 0) + v;
      }
    }
  }

  await writePromise;
  console.log(`Aggregated electorate for ${Object.keys(eleitores).length} municipalities`);
  return eleitores;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const { tenant_id, uf, ano, eleitorado: eleitoradoPayload } = body;

    if (tenant_id && eleitoradoPayload && typeof eleitoradoPayload === "object") {
      return await updateCities(tenant_id, eleitoradoPayload);
    }

    if (!tenant_id || !uf) {
      return jsonResponse({ error: "tenant_id e uf são obrigatórios." }, 400);
    }

    let eleitorado: Record<string, number>;
    try {
      eleitorado = await downloadAndParseEleitorado(uf, ano || 2024);
    } catch (err: any) {
      if (err.message === "WAF_BLOCKED") {
        return jsonResponse(
          {
            error:
              "Não foi possível acessar o TSE. O CDN bloqueou requisições do servidor. Tente novamente mais tarde.",
          },
          502,
        );
      }
      throw err;
    }

    if (Object.keys(eleitorado).length === 0) {
      return jsonResponse({
        success: true,
        cities_updated: 0,
        message: "Nenhum dado de eleitorado encontrado para este estado.",
      });
    }

    return await updateCities(tenant_id, eleitorado);
  } catch (err: any) {
    console.error("Error:", err);
    return jsonResponse(
      { success: false, error: "Falha ao importar eleitorado.", details: err?.message || String(err) },
      500,
    );
  }
});

async function updateCities(tenantId: string, eleitorado: Record<string, number>) {
  const sb = createClient(supabaseUrl, supabaseKey);

  const { data: cities, error: citiesErr } = await sb
    .from("cidades")
    .select("id, name")
    .eq("tenant_id", tenantId);

  if (citiesErr || !cities || cities.length === 0) {
    return jsonResponse({
      success: true,
      cities_updated: 0,
      message: "Nenhuma cidade cadastrada.",
    });
  }

  let updated = 0;
  for (const city of cities) {
    const cityName = normalize(String(city.name).split("/")[0]);
    const total = eleitorado[cityName];
    if (total !== undefined && total > 0) {
      const { error } = await sb
        .from("cidades")
        .update({ eleitores_2024: total, updated_at: new Date().toISOString() })
        .eq("id", city.id);
      if (!error) updated++;
    }
  }

  return jsonResponse({
    success: true,
    cities_updated: updated,
    total_cities: cities.length,
    tse_municipalities: Object.keys(eleitorado).length,
  });
}
