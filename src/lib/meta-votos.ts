/**
 * Lógica de classificação de metas de votos por liderança.
 *
 * - Prefeito / Vereador → Market Share (% do eleitorado da cidade) — voto de OPINIÃO
 * - Demais cargos → Voto Nominal (cadastro de eleitores reais) — voto OPERACIONAL
 */

export type CategoriaMeta = "market_share" | "operacional";

export function detectCategoriaMeta(cargo: string | null | undefined): CategoriaMeta {
  const c = (cargo || "").toLowerCase();
  if (c.includes("prefeit")) return "market_share";
  if (c.includes("vereador")) return "market_share";
  return "operacional";
}

export function isMarketShare(cargo: string | null | undefined): boolean {
  return detectCategoriaMeta(cargo) === "market_share";
}

/**
 * Estimativa de votos potenciais (para % market share).
 */
export function calcEstimativaVotos(
  tipo: "percentual" | "fixo" | string | null,
  valor: number | null,
  eleitoresCidade: number,
): number {
  if (!valor) return 0;
  if (tipo === "fixo") return Math.round(valor);
  // percentual
  if (!eleitoresCidade) return 0;
  return Math.round((eleitoresCidade * valor) / 100);
}

export function formatNumberBR(n: number): string {
  return new Intl.NumberFormat("pt-BR").format(Math.max(0, Math.round(n)));
}
