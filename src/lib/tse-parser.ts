/**
 * Utility to download and parse TSE voting data in the browser.
 * The preview environment may block direct access to the TSE CDN,
 * so downloads go through the lightweight stream-proxy edge function.
 */

import { supabase } from "@/integrations/supabase/client";

const TSE_CDN = "https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_candidato_munzona";
const TSE_ELEITORADO_CDN = "https://cdn.tse.jus.br/estatistica/sead/odsele/perfil_eleitorado";

function normalize(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

interface ZipEntry {
  fname: string;
  compSize: number;
  uncompSize: number;
  localOffset: number;
  compMethod: number;
}

function buildProxyUrl(url: string) {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  return `https://${projectId}.supabase.co/functions/v1/stream-proxy?url=${encodeURIComponent(url)}`;
}

async function fetchRangeViaProxy(url: string, start: number, end: number): Promise<Response> {
  const session = (await supabase.auth.getSession()).data.session;
  return fetch(buildProxyUrl(url), {
    headers: {
      Range: `bytes=${start}-${end}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${session?.access_token || ""}`,
    },
  });
}

async function fetchRangeDirect(url: string, start: number, end: number): Promise<Response> {
  return fetch(url, {
    headers: { Range: `bytes=${start}-${end}` },
  });
}

let useDirectFetch = false;
type FetchMode = "direct" | "proxy";

async function fetchRangeWithFallback(
  url: string,
  start: number,
  end: number,
  preferDirect = useDirectFetch,
): Promise<Response> {
  const attempts: Array<{ mode: FetchMode; run: () => Promise<Response> }> = preferDirect
    ? [
        { mode: "direct", run: () => fetchRangeDirect(url, start, end) },
        { mode: "direct", run: () => fetchRangeDirect(url, start, end) },
        { mode: "proxy", run: () => fetchRangeViaProxy(url, start, end) },
      ]
    : [
        { mode: "proxy", run: () => fetchRangeViaProxy(url, start, end) },
        { mode: "direct", run: () => fetchRangeDirect(url, start, end) },
        { mode: "direct", run: () => fetchRangeDirect(url, start, end) },
      ];

  let lastError = "Tente novamente.";

  for (const attempt of attempts) {
    try {
      const res = await attempt.run();
      if (res.ok || res.status === 206) {
        useDirectFetch = attempt.mode === "direct";
        return res;
      }

      const details = await res.text().catch(() => "");
      lastError = `${attempt.mode} HTTP ${res.status}${details ? `: ${details.slice(0, 120)}` : ""}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }

  throw new Error(`Não foi possível baixar dados do TSE. ${lastError}`);
}

async function fetchRange(url: string, start: number, end: number): Promise<ArrayBuffer> {
  const res = await fetchRangeWithFallback(url, start, end);
  return res.arrayBuffer();
}

async function getRemoteFileSize(url: string): Promise<number> {
  const res = await fetchRangeWithFallback(url, 0, 3, true);

  const cr = res.headers.get("content-range") || res.headers.get("Content-Range") || "";
  const match = cr.match(/\/(\d+)/);
  if (!match) {
    throw new Error("Não foi possível determinar o tamanho do arquivo do TSE");
  }

  await res.arrayBuffer();
  return parseInt(match[1], 10);
}

async function findZipEntry(url: string, totalSize: number, targetName: string): Promise<ZipEntry | null> {
  const eocdSize = Math.min(65536, totalSize);
  const eocdBuf = await fetchRange(url, totalSize - eocdSize, totalSize - 1);
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
  if (eocdPos === -1) throw new Error("Arquivo ZIP inválido");

  const view = new DataView(eocdBuf, eocdPos);
  const cdSize = view.getUint32(12, true);
  const cdOffset = view.getUint32(16, true);

  const cdBuf = await fetchRange(url, cdOffset, cdOffset + cdSize - 1);
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
    ) break;

    const compMethod = cdView.getUint16(pos + 10, true);
    const compSize = cdView.getUint32(pos + 20, true);
    const uncompSize = cdView.getUint32(pos + 24, true);
    const fnameLen = cdView.getUint16(pos + 28, true);
    const extraLen = cdView.getUint16(pos + 30, true);
    const commentLen = cdView.getUint16(pos + 32, true);
    const localOffset = cdView.getUint32(pos + 42, true);
    const fname = new TextDecoder().decode(cdData.slice(pos + 46, pos + 46 + fnameLen));

    if (fname.toUpperCase().includes(target)) {
      return { fname, compSize, uncompSize, localOffset, compMethod };
    }
    pos += 46 + fnameLen + extraLen + commentLen;
  }

  return null;
}

// Parse a CSV text (or stream) filtering by candidate number
function parseCsvText(
  text: string,
  nrCandidato: string,
  log: (msg: string) => void,
): Record<string, number> {
  const votes: Record<string, number> = {};
  const lines = text.split("\n");
  let headerCols: string[] | null = null;
  let nrCandIdx = -1, nmMunIdx = -1, qtVotosIdx = -1;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const cols = trimmed.split(";").map((c) => c.replace(/"/g, ""));

    if (!headerCols) {
      headerCols = cols;
      nrCandIdx = cols.indexOf("NR_CANDIDATO");
      nmMunIdx = cols.indexOf("NM_MUNICIPIO");
      qtVotosIdx = cols.indexOf("QT_VOTOS_NOMINAIS");
      if (nrCandIdx === -1 || nmMunIdx === -1 || qtVotosIdx === -1) {
        throw new Error("Formato de CSV inesperado do TSE");
      }
      continue;
    }

    if (cols.length <= Math.max(nrCandIdx, nmMunIdx, qtVotosIdx)) continue;
    if (cols[nrCandIdx] === nrCandidato) {
      const mun = normalize(cols[nmMunIdx]);
      const v = parseInt(cols[qtVotosIdx], 10);
      if (mun && Number.isFinite(v) && v > 0) {
        votes[mun] = (votes[mun] || 0) + v;
      }
    }
  }

  log(`Encontrados votos em ${Object.keys(votes).length} municípios`);
  return votes;
}

// Try to load CSV from Supabase storage first
async function tryLoadFromStorage(
  uf: string,
  ano: number,
  nrCandidato: string,
  log: (msg: string) => void,
): Promise<Record<string, number> | null> {
  const candidates = [
    `votacao_${ano}_${uf}.csv.gz`,
    `votacao_${ano}_${uf}.zip`,
    `votacao_${ano}_${uf}.csv`,
  ];

  for (const fileName of candidates) {
    log(`Verificando ${fileName}...`);
    try {
      const { data } = supabase.storage.from("tse-data").getPublicUrl(fileName);
      if (!data?.publicUrl) continue;

      const res = await fetch(data.publicUrl);
      if (!res.ok) continue;

      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("xml") || contentType.includes("html")) continue;

      const buf = await res.arrayBuffer();
      if (buf.byteLength < 100) continue;

      let text: string;

      if (fileName.endsWith(".gz")) {
        log("Descompactando .gz...");
        const ds = new DecompressionStream("gzip");
        const writer = ds.writable.getWriter();
        writer.write(new Uint8Array(buf));
        writer.close();
        const reader = ds.readable.getReader();
        const chunks: Uint8Array[] = [];
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
        const total = chunks.reduce((a, c) => a + c.length, 0);
        const merged = new Uint8Array(total);
        let off = 0;
        for (const c of chunks) { merged.set(c, off); off += c.length; }
        text = new TextDecoder("latin1").decode(merged);
      } else if (fileName.endsWith(".zip")) {
        log("Extraindo CSV do ZIP...");
        text = await extractCsvFromZipBuffer(new Uint8Array(buf), uf);
      } else {
        text = new TextDecoder("latin1").decode(buf);
      }

      if (!text || !text.includes("NR_CANDIDATO")) continue;

      log("Arquivo encontrado no sistema! Processando...");
      return parseCsvText(text, nrCandidato, log);
    } catch {
      continue;
    }
  }
  return null;
}

async function extractCsvFromZipBuffer(zipData: Uint8Array, uf: string): Promise<string> {
  const view = new DataView(zipData.buffer);
  let eocdPos = -1;
  for (let i = zipData.length - 22; i >= 0; i--) {
    if (zipData[i] === 0x50 && zipData[i+1] === 0x4b && zipData[i+2] === 0x05 && zipData[i+3] === 0x06) {
      eocdPos = i; break;
    }
  }
  if (eocdPos === -1) throw new Error("ZIP inválido");

  const cdSize = view.getUint32(eocdPos + 12, true);
  const cdOffset = view.getUint32(eocdPos + 16, true);
  const target = `_${uf.toUpperCase()}.CSV`;

  let pos = cdOffset;
  while (pos < cdOffset + cdSize) {
    if (zipData[pos] !== 0x50 || zipData[pos+1] !== 0x4b) break;
    const compMethod = view.getUint16(pos + 10, true);
    const compSize = view.getUint32(pos + 20, true);
    const fnameLen = view.getUint16(pos + 28, true);
    const extraLen = view.getUint16(pos + 30, true);
    const commentLen = view.getUint16(pos + 32, true);
    const localOffset = view.getUint32(pos + 42, true);
    const fname = new TextDecoder().decode(zipData.slice(pos + 46, pos + 46 + fnameLen));

    if (fname.toUpperCase().includes(target)) {
      const lFnameLen = view.getUint16(localOffset + 26, true);
      const lExtraLen = view.getUint16(localOffset + 28, true);
      const dataStart = localOffset + 30 + lFnameLen + lExtraLen;
      const compressed = zipData.slice(dataStart, dataStart + compSize);

      if (compMethod === 0) {
        return new TextDecoder("latin1").decode(compressed);
      }
      if (compMethod === 8) {
        const ds = new DecompressionStream("deflate-raw");
        const w = ds.writable.getWriter();
        w.write(compressed); w.close();
        const r = ds.readable.getReader();
        const chunks: Uint8Array[] = [];
        while (true) { const { value, done } = await r.read(); if (done) break; chunks.push(value); }
        const total = chunks.reduce((a, c) => a + c.length, 0);
        const merged = new Uint8Array(total);
        let off = 0;
        for (const c of chunks) { merged.set(c, off); off += c.length; }
        return new TextDecoder("latin1").decode(merged);
      }
      throw new Error("Método de compressão não suportado");
    }
    pos += 46 + fnameLen + extraLen + commentLen;
  }
  throw new Error(`CSV de ${uf} não encontrado no ZIP`);
}

export async function downloadAndParseTSEVotes(
  nrCandidato: string,
  uf: string,
  ano: number,
  onProgress?: (msg: string) => void,
): Promise<Record<string, number>> {
  const log = onProgress || (() => {});

  // 1. Try storage first
  const storageResult = await tryLoadFromStorage(uf, ano, nrCandidato, log);
  if (storageResult) return storageResult;

  // 2. Fall back to TSE CDN download
  useDirectFetch = false;
  const zipUrl = `${TSE_CDN}/votacao_candidato_munzona_${ano}.zip`;

  log("Baixando do TSE (pode demorar)...");
  const totalSize = await getRemoteFileSize(zipUrl);

  log(`Localizando dados de ${uf}...`);
  const entry = await findZipEntry(zipUrl, totalSize, `_${uf}.csv`);
  if (!entry) throw new Error(`Dados de ${uf} não encontrados no arquivo do TSE`);
  if (entry.compMethod !== 8) throw new Error("Formato de compressão não suportado");

  const headerBuf = await fetchRange(zipUrl, entry.localOffset, entry.localOffset + 300);
  const hView = new DataView(headerBuf);
  const fnameLen = hView.getUint16(26, true);
  const extraLen = hView.getUint16(28, true);
  const dataOffset = entry.localOffset + 30 + fnameLen + extraLen;

  const compSizeMB = (entry.compSize / 1024 / 1024).toFixed(0);
  log(`Baixando ${compSizeMB}MB de dados do TSE...`);

  const chunkSize = 4 * 1024 * 1024;
  const compressedChunks: Uint8Array[] = [];
  let totalDownloaded = 0;

  for (let start = 0; start < entry.compSize; start += chunkSize) {
    const end = Math.min(start + chunkSize - 1, entry.compSize - 1);
    const chunk = new Uint8Array(await fetchRange(zipUrl, dataOffset + start, dataOffset + end));
    compressedChunks.push(chunk);
    totalDownloaded += chunk.length;
    const pct = Math.round((totalDownloaded / entry.compSize) * 100);
    log(`Baixando... ${pct}%`);
  }

  const fullCompressed = new Uint8Array(totalDownloaded);
  let offset = 0;
  for (const chunk of compressedChunks) {
    fullCompressed.set(chunk, offset);
    offset += chunk.length;
  }

  log("Processando dados...");
  const ds = new DecompressionStream("deflate-raw");
  const writer = ds.writable.getWriter();
  const reader = ds.readable.getReader();

  const writeChunkSize = 512 * 1024;
  const writePromise = (async () => {
    for (let i = 0; i < fullCompressed.length; i += writeChunkSize) {
      await writer.write(fullCompressed.subarray(i, Math.min(i + writeChunkSize, fullCompressed.length)));
    }
    await writer.close();
  })();

  const votes: Record<string, number> = {};
  const decoder = new TextDecoder("latin1");
  let partialLine = "";
  let headerCols: string[] | null = null;
  let nrCandIdx = -1;
  let nmMunIdx = -1;
  let qtVotosIdx = -1;
  let linesProcessed = 0;

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
        nrCandIdx = cols.indexOf("NR_CANDIDATO");
        nmMunIdx = cols.indexOf("NM_MUNICIPIO");
        qtVotosIdx = cols.indexOf("QT_VOTOS_NOMINAIS");
        if (nrCandIdx === -1 || nmMunIdx === -1 || qtVotosIdx === -1) {
          throw new Error("Formato de CSV inesperado do TSE");
        }
        continue;
      }

      if (cols.length <= Math.max(nrCandIdx, nmMunIdx, qtVotosIdx)) continue;

      if (cols[nrCandIdx] === nrCandidato) {
        const mun = normalize(cols[nmMunIdx]);
        const v = parseInt(cols[qtVotosIdx], 10);
        if (mun && Number.isFinite(v) && v > 0) {
          votes[mun] = (votes[mun] || 0) + v;
        }
      }

      linesProcessed++;
      if (linesProcessed % 500000 === 0) {
        log(`Processando... ${(linesProcessed / 1000).toFixed(0)}k linhas`);
      }
    }
  }

  await writePromise;
  log(`Encontrados votos em ${Object.keys(votes).length} municípios`);
  return votes;
}

export async function downloadAndParseTSEEleitorado(
  uf: string,
  ano: number,
  onProgress?: (msg: string) => void,
): Promise<Record<string, number>> {
  const log = onProgress || (() => {});

  useDirectFetch = false;
  const zipUrl = `${TSE_ELEITORADO_CDN}/perfil_eleitorado_${ano}.zip`;

  log("Baixando eleitorado do TSE...");
  const totalSize = await getRemoteFileSize(zipUrl);

  log(`Localizando arquivo de ${ano}...`);
  const entry = await findZipEntry(zipUrl, totalSize, `perfil_eleitorado_${ano}.csv`);
  if (!entry) throw new Error(`Dados de eleitorado ${ano} não encontrados no arquivo do TSE`);
  if (entry.compMethod !== 8) throw new Error("Formato de compressão não suportado");

  const headerBuf = await fetchRange(zipUrl, entry.localOffset, entry.localOffset + 300);
  const hView = new DataView(headerBuf);
  const fnameLen = hView.getUint16(26, true);
  const extraLen = hView.getUint16(28, true);
  const dataOffset = entry.localOffset + 30 + fnameLen + extraLen;

  const compSizeMB = (entry.compSize / 1024 / 1024).toFixed(0);
  log(`Baixando ${compSizeMB}MB de eleitorado...`);

  const chunkSize = 4 * 1024 * 1024;
  const compressedChunks: Uint8Array[] = [];
  let totalDownloaded = 0;

  for (let start = 0; start < entry.compSize; start += chunkSize) {
    const end = Math.min(start + chunkSize - 1, entry.compSize - 1);
    const chunk = new Uint8Array(await fetchRange(zipUrl, dataOffset + start, dataOffset + end));
    compressedChunks.push(chunk);
    totalDownloaded += chunk.length;
    const pct = Math.round((totalDownloaded / entry.compSize) * 100);
    log(`Baixando... ${pct}%`);
  }

  const fullCompressed = new Uint8Array(totalDownloaded);
  let offset = 0;
  for (const chunk of compressedChunks) {
    fullCompressed.set(chunk, offset);
    offset += chunk.length;
  }

  log(`Processando eleitorado de ${uf}...`);
  const ds = new DecompressionStream("deflate-raw");
  const writer = ds.writable.getWriter();
  const reader = ds.readable.getReader();

  const writeChunkSize = 512 * 1024;
  const writePromise = (async () => {
    for (let i = 0; i < fullCompressed.length; i += writeChunkSize) {
      await writer.write(fullCompressed.subarray(i, Math.min(i + writeChunkSize, fullCompressed.length)));
    }
    await writer.close();
  })();

  const eleitorado: Record<string, number> = {};
  const decoder = new TextDecoder("latin1");
  let partialLine = "";
  let headerCols: string[] | null = null;
  let nmMunIdx = -1;
  let qtIdx = -1;
  let sgUfIdx = -1;
  let linesProcessed = 0;

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
        qtIdx = cols.indexOf("QT_ELEITORES_PERFIL");
        if (qtIdx === -1) qtIdx = cols.indexOf("QT_ELEITORES_INC_NM_SOCIAL");

        if (nmMunIdx === -1 || sgUfIdx === -1 || qtIdx === -1) {
          throw new Error("Formato de CSV inesperado do TSE");
        }
        continue;
      }

      if (cols.length <= Math.max(nmMunIdx, sgUfIdx, qtIdx)) continue;
      if (cols[sgUfIdx] !== uf) continue;

      const mun = normalize(cols[nmMunIdx]);
      const total = parseInt(cols[qtIdx], 10);
      if (mun && Number.isFinite(total) && total > 0) {
        eleitorado[mun] = (eleitorado[mun] || 0) + total;
      }

      linesProcessed++;
      if (linesProcessed % 500000 === 0) {
        log(`Processando... ${(linesProcessed / 1000).toFixed(0)}k linhas`);
      }
    }
  }

  await writePromise;
  log(`Encontrado eleitorado em ${Object.keys(eleitorado).length} municípios`);
  return eleitorado;
}
