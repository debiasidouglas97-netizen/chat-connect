/**
 * Paleta semântica para classificações de eleitores.
 * Usa tons pastéis suaves (alinhado ao tema do sistema).
 */

export type IntencaoVoto = "Apoia" | "Não apoia" | "Indeciso" | string;
export type GrauApoio = "Forte" | "Médio" | "Fraco" | string;
export type Prioridade = "Alta" | "Média" | "Baixa" | string;

/** Classes Tailwind para badges/pills (bg + text + border). */
export function intencaoVotoClasses(v: IntencaoVoto | null | undefined): string {
  switch ((v || "").trim()) {
    case "Apoia":
      return "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-800";
    case "Indeciso":
      return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-800";
    case "Não apoia":
      return "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/40 dark:text-orange-200 dark:border-orange-800";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

/** Tons de verde graduais por intensidade de apoio. */
export function grauApoioClasses(v: GrauApoio | null | undefined): string {
  switch ((v || "").trim()) {
    case "Forte":
      return "bg-emerald-200 text-emerald-900 border-emerald-300 dark:bg-emerald-800/60 dark:text-emerald-50 dark:border-emerald-700";
    case "Médio":
      return "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-800";
    case "Fraco":
      return "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export function prioridadeClasses(v: Prioridade | null | undefined): string {
  switch ((v || "").trim()) {
    case "Alta":
      return "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/40 dark:text-rose-200 dark:border-rose-800";
    case "Média":
      return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-800";
    case "Baixa":
      return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/60 dark:text-slate-200 dark:border-slate-700";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

/** Pequena bolinha indicadora para usar dentro do <SelectItem>. */
export function intencaoVotoDot(v: IntencaoVoto): string {
  switch (v) {
    case "Apoia": return "bg-emerald-500";
    case "Indeciso": return "bg-amber-500";
    case "Não apoia": return "bg-orange-500";
    default: return "bg-muted-foreground";
  }
}

export function grauApoioDot(v: GrauApoio): string {
  switch (v) {
    case "Forte": return "bg-emerald-600";
    case "Médio": return "bg-emerald-400";
    case "Fraco": return "bg-emerald-200 border border-emerald-400";
    default: return "bg-muted-foreground";
  }
}

export function prioridadeDot(v: Prioridade): string {
  switch (v) {
    case "Alta": return "bg-rose-500";
    case "Média": return "bg-amber-500";
    case "Baixa": return "bg-slate-400";
    default: return "bg-muted-foreground";
  }
}

/** Mapeia chave do campo para o resolver de cor de bolinha. */
export function colorDotForKey(key: string, value: string): string | null {
  if (key === "intencao_voto") return intencaoVotoDot(value);
  if (key === "grau_apoio") return grauApoioDot(value);
  if (key === "prioridade") return prioridadeDot(value);
  return null;
}

/** Mapeia chave do campo para o resolver de classes de badge. */
export function badgeClassesForKey(key: string, value: string): string | null {
  if (key === "intencao_voto") return intencaoVotoClasses(value);
  if (key === "grau_apoio") return grauApoioClasses(value);
  if (key === "prioridade") return prioridadeClasses(value);
  return null;
}
