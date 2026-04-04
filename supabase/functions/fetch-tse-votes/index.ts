import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const TSE_CDN = "https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_candidato_munzona";

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

const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

/** Read bytes from a URL using HTTP Range requests */
async function fetchRange(url: string, start: number, end: number): Promise<Uint8Array> {
  const res = await fetch(url, {
    headers: { ...FETCH_HEADERS, Range: `bytes=${start}-${end}` },
  });
  if (!res.ok && res.status !== 206) {
    throw new Error(`Range request failed: ${res.status}`);
  }
  return new Uint8Array(await res.arrayBuffer());
}

/** Parse ZIP central directory to find a specific file entry */
async function findZipEntry(url: string, totalSize: number, targetName: string) {
  // Read last 64KB to find End of Central Directory
  const eocdSize = Math.min(65536, totalSize);
  const eocdData = await fetchRange(url, totalSize - eocdSize, totalSize - 1);

  // Find EOCD signature (0x06054b50)
  let eocdPos = -1;
  for (let i = eocdData.length - 22; i >= 0; i--) {
    if (eocdData[i] === 0x50 && eocdData[i + 1] === 0x4b &&
        eocdData[i + 2] === 0x05 && eocdData[i + 3] === 0x06) {
      eocdPos = i;
      break;
    }
  }
  if (eocdPos === -1) throw new Error("ZIP EOCD not found");

  const view = new DataView(eocdData.buffer, eocdData.byteOffset);
  const cdSize = view.getUint32(eocdPos + 12, true);
  const cdOffset = view.getUint32(eocdPos + 16, true);

  // Read central directory
  const cdData = await fetchRange(url, cdOffset, cdOffset + cdSize - 1);
  const cdView = new DataView(cdData.buffer, cdData.byteOffset);

  let pos = 0;
  const targetUpper = targetName.toUpperCase();
  while (pos < cdData.length - 46) {
    if (cdData[pos] !== 0x50 || cdData[pos + 1] !== 0x4b ||
        cdData[pos + 2] !== 0x01 || cdData[pos + 3] !== 0x02) break;

    const compMethod = cdView.getUint16(pos + 10, true);
    const compSize = cdView.getUint32(pos + 20, true);
    const uncompSize = cdView.getUint32(pos + 24, true);
    const fnameLen = cdView.getUint16(pos + 28, true);
    const extraLen = cdView.getUint16(pos + 30, true);
    const commentLen = cdView.getUint16(pos + 32, true);
    const localOffset = cdView.getUint32(pos + 42, true);

    const fname = new TextDecoder().decode(cdData.slice(pos + 46, pos + 46 + fnameLen));

    if (fname.toUpperCase().includes(targetUpper)) {
      return { fname, compSize, uncompSize, localOffset, compMethod };
    }

    pos += 46 + fnameLen + extraLen + commentLen;
  }

  return null;
}

/** Process the compressed CSV data in chunks, filtering for the target candidate */
async function processVotesFromZip(
  zipUrl: string,
  entry: { compSize: number; localOffset: number; compMethod: number },
  nrCandidato: string,
): Promise<Map<string, number>> {
  // Read local file header to get data offset
  const headerData = await fetchRange(zipUrl, entry.localOffset, entry.localOffset + 300);
  const hView = new DataView(headerData.buffer, headerData.byteOffset);
  const fnameLen = hView.getUint16(26, true);
  const extraLen = hView.getUint16(28, true);
  const dataOffset = entry.localOffset + 30 + fnameLen + extraLen;

  const votes = new Map<string, number>();
  const chunkSize = 8 * 1024 * 1024; // 8MB chunks

  // We need to decompress using DecompressionStream (Web API available in Deno)
  // Download all compressed data and decompress
  // For large files, we process in chunks to avoid memory issues

  let headerCols: string[] | null = null;
  let nrCandIdx = -1;
  let nmMunIdx = -1;
  let qtVotosIdx = -1;
  let partialLine = "";

  for (let start = 0; start < entry.compSize; start += chunkSize) {
    const end = Math.min(start + chunkSize - 1, entry.compSize - 1);
    const compChunk = await fetchRange(zipUrl, dataOffset + start, dataOffset + end);

    // Create a DecompressionStream for this chunk
    // We need to accumulate and decompress the full stream
    // Since DecompressionStream expects a complete stream, we'll accumulate
    // Actually, let's use a different approach - accumulate all compressed data
    // and decompress at once. For states with ~90MB this might be tight on memory.

    // Alternative: Use raw inflate via DecompressionStream with "raw" format
    // We'll process line by line from decompressed output

    // For now, let's download the entire compressed file and decompress
    break; // We'll use a different approach below
  }

  // Download full compressed data (up to ~90MB for SP)
  // Process in streaming fashion using DecompressionStream
  console.log(`Downloading ${(entry.compSize / 1024 / 1024).toFixed(1)}MB of compressed data...`);

  const compressedChunks: Uint8Array[] = [];
  let totalDownloaded = 0;

  for (let start = 0; start < entry.compSize; start += chunkSize) {
    const end = Math.min(start + chunkSize - 1, entry.compSize - 1);
    const chunk = await fetchRange(zipUrl, dataOffset + start, dataOffset + end);
    compressedChunks.push(chunk);
    totalDownloaded += chunk.length;
    console.log(`  Downloaded ${(totalDownloaded / 1024 / 1024).toFixed(1)}MB / ${(entry.compSize / 1024 / 1024).toFixed(1)}MB`);
  }

  // Combine chunks
  const fullCompressed = new Uint8Array(totalDownloaded);
  let offset = 0;
  for (const chunk of compressedChunks) {
    fullCompressed.set(chunk, offset);
    offset += chunk.length;
  }

  // Decompress using DecompressionStream with "deflate-raw" format
  const ds = new DecompressionStream("deflate-raw");
  const writer = ds.writable.getWriter();
  const reader = ds.readable.getReader();

  // Write compressed data in background
  const writePromise = (async () => {
    const writeChunkSize = 1024 * 1024; // 1MB write chunks
    for (let i = 0; i < fullCompressed.length; i += writeChunkSize) {
      const slice = fullCompressed.subarray(i, Math.min(i + writeChunkSize, fullCompressed.length));
      await writer.write(slice);
    }
    await writer.close();
  })();

  // Read and process decompressed data
  const decoder = new TextDecoder("latin1");

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    const text = partialLine + decoder.decode(value, { stream: true });
    const lines = text.split("\n");
    partialLine = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const cols = trimmed.split(";").map(c => c.replace(/"/g, ""));

      if (!headerCols) {
        headerCols = cols;
        nrCandIdx = cols.indexOf("NR_CANDIDATO");
        nmMunIdx = cols.indexOf("NM_MUNICIPIO");
        qtVotosIdx = cols.indexOf("QT_VOTOS_NOMINAIS");
        if (nrCandIdx === -1 || nmMunIdx === -1 || qtVotosIdx === -1) {
          throw new Error(`Colunas não encontradas: NR_CANDIDATO=${nrCandIdx}, NM_MUNICIPIO=${nmMunIdx}, QT_VOTOS_NOMINAIS=${qtVotosIdx}`);
        }
        continue;
      }

      if (cols.length <= Math.max(nrCandIdx, nmMunIdx, qtVotosIdx)) continue;

      if (cols[nrCandIdx] === nrCandidato) {
        const mun = normalize(cols[nmMunIdx]);
        const v = parseInt(cols[qtVotosIdx], 10);
        if (mun && Number.isFinite(v) && v > 0) {
          votes.set(mun, (votes.get(mun) || 0) + v);
        }
      }
    }
  }

  await writePromise;
  return votes;
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
      .select("nr_candidato_tse, ano_eleicao, estado")
      .eq("id", tenant_id)
      .single();

    if (tErr || !tenant) {
      return jsonResponse({ error: "Tenant não encontrado" }, 404);
    }

    const nrCandidato = String(tenant.nr_candidato_tse || "").trim();
    if (!nrCandidato) {
      return jsonResponse({
        error: "Número do candidato TSE não configurado. Configure em Configurações > Integrações.",
        missing_configuration: true,
      }, 400);
    }

    const anoEleicao = tenant.ano_eleicao || 2022;
    const uf = getUF(tenant.estado || "SP");

    // Step 1: Get ZIP file size
    const zipUrl = `${TSE_CDN}/votacao_candidato_munzona_${anoEleicao}.zip`;
    console.log(`Checking ZIP: ${zipUrl}`);

    const headRes = await fetch(zipUrl, { method: "HEAD", headers: FETCH_HEADERS });
    if (!headRes.ok) {
      return jsonResponse({
        error: `Arquivo do TSE não encontrado para o ano ${anoEleicao}.`,
        status: headRes.status,
      }, 500);
    }

    const totalSize = parseInt(headRes.headers.get("Content-Length") || "0", 10);
    if (!totalSize) {
      return jsonResponse({ error: "Não foi possível determinar o tamanho do arquivo do TSE." }, 500);
    }

    console.log(`ZIP size: ${(totalSize / 1024 / 1024).toFixed(1)}MB`);

    // Step 2: Find the state-specific CSV in the ZIP
    const targetFile = `_${uf}.csv`;
    console.log(`Looking for file containing "${targetFile}" in ZIP...`);

    const entry = await findZipEntry(zipUrl, totalSize, targetFile);
    if (!entry) {
      return jsonResponse({
        error: `Arquivo de votação para ${uf} não encontrado no ZIP do TSE.`,
      }, 500);
    }

    console.log(`Found: ${entry.fname} (${(entry.compSize / 1024 / 1024).toFixed(1)}MB compressed)`);

    if (entry.compMethod !== 8) {
      return jsonResponse({
        error: "Formato de compressão não suportado.",
      }, 500);
    }

    // Step 3: Download and process votes
    console.log(`Processing votes for candidate ${nrCandidato} in ${uf}...`);
    const votesMap = await processVotesFromZip(zipUrl, entry, nrCandidato);

    console.log(`Found votes in ${votesMap.size} municipalities`);

    if (votesMap.size === 0) {
      return jsonResponse({
        success: true,
        cities_updated: 0,
        message: `Nenhum voto encontrado para o candidato ${nrCandidato} em ${uf} (${anoEleicao}).`,
      });
    }

    // Step 4: Update cities in database
    const { data: cities } = await sb
      .from("cidades")
      .select("id, name")
      .eq("tenant_id", tenant_id);

    if (!cities || cities.length === 0) {
      return jsonResponse({ success: true, cities_updated: 0, message: "Nenhuma cidade cadastrada." });
    }

    let updated = 0;
    for (const city of cities) {
      const cityName = normalize(city.name.split("/")[0]);
      const votos = votesMap.get(cityName);
      if (votos !== undefined && votos > 0) {
        const { error } = await sb
          .from("cidades")
          .update({ votos_2022: votos, updated_at: new Date().toISOString() })
          .eq("id", city.id);
        if (!error) updated++;
      }
    }

    console.log(`Updated ${updated} cities out of ${cities.length}`);

    return jsonResponse({
      success: true,
      cities_updated: updated,
      total_cities: cities.length,
      tse_municipalities: votesMap.size,
    });

  } catch (err: any) {
    console.error("Error:", err);
    return jsonResponse({
      success: false,
      error: "Falha ao importar votação do TSE.",
      details: err?.message || String(err),
    }, 500);
  }
});
