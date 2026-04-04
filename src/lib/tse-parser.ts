/**
 * Utility to download and parse TSE voting data directly in the browser.
 * The TSE CDN blocks cloud IPs, so we must download from the user's browser.
 */

const TSE_CDN = "https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_candidato_munzona";

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

async function fetchRange(url: string, start: number, end: number): Promise<ArrayBuffer> {
  const res = await fetch(url, {
    headers: { Range: `bytes=${start}-${end}` },
  });
  if (!res.ok && res.status !== 206) {
    throw new Error(`Erro ao baixar dados do TSE (HTTP ${res.status})`);
  }
  return res.arrayBuffer();
}

async function findZipEntry(url: string, totalSize: number, targetName: string): Promise<ZipEntry | null> {
  const eocdSize = Math.min(65536, totalSize);
  const eocdBuf = await fetchRange(url, totalSize - eocdSize, totalSize - 1);
  const eocdData = new Uint8Array(eocdBuf);

  let eocdPos = -1;
  for (let i = eocdData.length - 22; i >= 0; i--) {
    if (eocdData[i] === 0x50 && eocdData[i + 1] === 0x4b &&
        eocdData[i + 2] === 0x05 && eocdData[i + 3] === 0x06) {
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

    if (fname.toUpperCase().includes(target)) {
      return { fname, compSize, uncompSize, localOffset, compMethod };
    }
    pos += 46 + fnameLen + extraLen + commentLen;
  }
  return null;
}

export async function downloadAndParseTSEVotes(
  nrCandidato: string,
  uf: string,
  ano: number,
  onProgress?: (msg: string) => void,
): Promise<Record<string, number>> {
  const log = onProgress || (() => {});

  const zipUrl = `${TSE_CDN}/votacao_candidato_munzona_${ano}.zip`;

  // Step 1: Get file size
  log("Verificando arquivo do TSE...");
  const headRes = await fetch(zipUrl, { method: "HEAD" });
  if (!headRes.ok) {
    throw new Error(`Arquivo do TSE não encontrado para ${ano} (HTTP ${headRes.status})`);
  }
  const totalSize = parseInt(headRes.headers.get("Content-Length") || "0", 10);
  if (!totalSize) throw new Error("Não foi possível determinar o tamanho do arquivo");

  // Step 2: Find state file in ZIP
  log(`Localizando dados de ${uf}...`);
  const entry = await findZipEntry(zipUrl, totalSize, `_${uf}.csv`);
  if (!entry) throw new Error(`Dados de ${uf} não encontrados no arquivo do TSE`);
  if (entry.compMethod !== 8) throw new Error("Formato de compressão não suportado");

  // Step 3: Get data offset
  const headerBuf = await fetchRange(zipUrl, entry.localOffset, entry.localOffset + 300);
  const hView = new DataView(headerBuf);
  const fnameLen = hView.getUint16(26, true);
  const extraLen = hView.getUint16(28, true);
  const dataOffset = entry.localOffset + 30 + fnameLen + extraLen;

  // Step 4: Download compressed data in chunks and decompress
  const compSizeMB = (entry.compSize / 1024 / 1024).toFixed(0);
  log(`Baixando ${compSizeMB}MB de dados do TSE...`);

  const chunkSize = 4 * 1024 * 1024; // 4MB chunks
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

  // Combine chunks
  const fullCompressed = new Uint8Array(totalDownloaded);
  let offset = 0;
  for (const chunk of compressedChunks) {
    fullCompressed.set(chunk, offset);
    offset += chunk.length;
  }

  // Step 5: Decompress using browser's DecompressionStream
  log("Processando dados...");
  const ds = new DecompressionStream("deflate-raw");
  const writer = ds.writable.getWriter();
  const reader = ds.readable.getReader();

  // Write compressed data in background
  const writeChunkSize = 512 * 1024;
  const writePromise = (async () => {
    for (let i = 0; i < fullCompressed.length; i += writeChunkSize) {
      await writer.write(fullCompressed.subarray(i, Math.min(i + writeChunkSize, fullCompressed.length)));
    }
    await writer.close();
  })();

  // Step 6: Parse CSV and filter for candidate
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

      const cols = trimmed.split(";").map(c => c.replace(/"/g, ""));

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
