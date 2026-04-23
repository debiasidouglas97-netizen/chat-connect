// ============================================================
// MandatoGov — Scoring Engine
// ============================================================

// --------------- Tipos ---------------

export interface CidadeBase {
  name: string;
  population: string;
  peso: number; // 1-10 strategic weight
  regiao: string;
  demandas: number;
  demandasResolvidas: number;
  comunicacaoRecente: boolean; // contact within 15 days
  presencaDeputado: boolean;
  engajamento: number; // 0-100 raw engagement metric
  liderancas: number;
  emendas: number;
  votos2022?: number;
  eleitores2024?: number;
}

export interface CidadeComScore extends CidadeBase {
  score: number;
  status: "alta" | "atencao" | "baixa";
}

export interface AtuacaoCidade {
  cidadeNome: string;
  intensidade: "Alta" | "Média" | "Baixa";
}

export interface LiderancaBase {
  name: string;
  img: string;
  avatar_url?: string | null;
  cidadePrincipal: string;
  cargo: string;
  influencia: "Alta" | "Média" | "Baixa";
  tipo: "Eleitoral" | "Comunitária" | "Política" | "Prefeito(a)" | "Vereador(a)";
  atuacao: AtuacaoCidade[];
  engajamento: number; // 0-100
  classificacao_manual?: string | null;
  meta_votos_tipo?: "percentual" | "fixo" | null;
  meta_votos_valor?: number | null;
}

export interface LiderancaComScore extends LiderancaBase {
  score: number;
  classificacao: { label: string; icon: string };
  scoreTerritorial: number;
}

// --------------- Constantes ---------------

const INFLUENCIA_VALOR: Record<string, number> = { Alta: 3, Média: 2, Baixa: 1 };
const INTENSIDADE_VALOR: Record<string, number> = { Alta: 3, Média: 2, Baixa: 1 };

// --------------- Score de Cidade ---------------

export function calcularScoreCidade(c: CidadeBase): CidadeComScore {
  // Weights: demandasResolvidas 30%, comunicacao 25%, presenca 25%, engajamento 20%
  const resolvidasRatio = c.demandas > 0 ? (c.demandasResolvidas / c.demandas) * 100 : 50;
  const comunicacao = c.comunicacaoRecente ? 100 : 0;
  const presenca = c.presencaDeputado ? 100 : 0;

  const score = Math.round(
    resolvidasRatio * 0.3 +
    comunicacao * 0.25 +
    presenca * 0.25 +
    c.engajamento * 0.2
  );

  const clampedScore = Math.min(100, Math.max(0, score));

  return {
    ...c,
    score: clampedScore,
    status: clampedScore >= 65 ? "alta" : clampedScore >= 40 ? "atencao" : "baixa",
  };
}

// --------------- Score de Liderança ---------------

export function calcularScoreLideranca(
  l: LiderancaBase,
  cidadesMap: Map<string, CidadeBase>
): LiderancaComScore {
  const influenciaVal = INFLUENCIA_VALOR[l.influencia] ?? 1;

  // Score territorial = sum(peso_cidade * intensidade)
  let scoreTerritorialRaw = 0;
  let maxPossibleTerritorial = 0;

  for (const at of l.atuacao) {
    const cidade = cidadesMap.get(at.cidadeNome);
    const peso = cidade?.peso ?? 1;
    const intensidade = INTENSIDADE_VALOR[at.intensidade] ?? 1;
    scoreTerritorialRaw += peso * intensidade;
    maxPossibleTerritorial += peso * 3; // max intensity
  }

  // Normalize territorial to 0-100
  const scoreTerritorial = maxPossibleTerritorial > 0
    ? Math.round((scoreTerritorialRaw / maxPossibleTerritorial) * 100)
    : 0;

  // Normalize influência to 0-100
  const influenciaNorm = Math.round((influenciaVal / 3) * 100);

  // Score final = influência*0.4 + territorial*0.4 + engajamento*0.2
  const score = Math.round(
    influenciaNorm * 0.4 +
    scoreTerritorial * 0.4 +
    l.engajamento * 0.2
  );

  const autoClassificacao = classificarLideranca(l, scoreTerritorial);
  const manualLabel = (l as any).classificacao_manual;
  const classificacao = manualLabel
    ? getClassificacaoFromLabel(manualLabel)
    : autoClassificacao;

  return {
    ...l,
    score: Math.min(100, Math.max(0, score)),
    scoreTerritorial,
    classificacao,
  };
}

function getClassificacaoFromLabel(label: string): { label: string; icon: string } {
  const map: Record<string, string> = {
    "Força Estratégica": "🏛️",
    "Força Regional": "🌎",
    "Força Local": "🏙️",
  };
  return { label, icon: map[label] || "🏙️" };
}

function classificarLideranca(
  l: LiderancaBase,
  scoreTerritorial: number
): { label: string; icon: string } {
  const cidadesFortes = l.atuacao.filter(
    (a) => a.intensidade === "Alta" || a.intensidade === "Média"
  ).length;

  if (l.atuacao.length >= 4 && scoreTerritorial >= 60 && cidadesFortes >= 3) {
    return { label: "Força Estratégica", icon: "🏛️" };
  }
  if (l.atuacao.length >= 2 && cidadesFortes >= 2) {
    return { label: "Força Regional", icon: "🌎" };
  }
  return { label: "Força Local", icon: "🏙️" };
}

// --------------- User Role Types ---------------

export type UserRole = "deputado" | "chefe_gabinete" | "secretario" | "lideranca";

export function canViewScore(role: UserRole): boolean {
  return role !== "lideranca";
}

export function canViewRanking(role: UserRole): boolean {
  return role !== "lideranca";
}
