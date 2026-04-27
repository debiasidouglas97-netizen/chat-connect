// Matriz de permissões padrão por tipo de usuário (role).
// Usada como fallback quando não há linha em `role_permissions` no banco
// e como base para o botão "Restaurar padrão" na UI de configuração.

export type PermissionAction = "view" | "create" | "edit" | "delete";

export type ConfigurableRole = "chefe_gabinete" | "secretario" | "lideranca";

export interface ModuleDef {
  key: string;
  label: string;
  /** Rota base associada (para o ProtectedRoute) */
  route: string;
}

/** Lista canônica dos módulos do sistema. */
export const MODULES: ModuleDef[] = [
  { key: "dashboard", label: "Dashboard", route: "/" },
  { key: "demandas", label: "Demandas", route: "/demandas" },
  { key: "liderancas", label: "Lideranças", route: "/liderancas" },
  { key: "eleitores", label: "Eleitores", route: "/eleitores" },
  { key: "cidades", label: "Cidades", route: "/cidades" },
  { key: "mapa", label: "Mapa", route: "/mapa" },
  { key: "emendas", label: "Emendas", route: "/emendas" },
  { key: "proposicoes", label: "Proposições", route: "/proposicoes" },
  { key: "mandato_foco", label: "Mandato em Foco", route: "/mandato-em-foco" },
  { key: "agenda", label: "Agenda", route: "/agenda" },
  { key: "documentos", label: "Documentos", route: "/documentos" },
  { key: "mensagens", label: "Mensagens", route: "/mensagens" },
  { key: "mobilizacao", label: "Mobilização Digital", route: "/mobilizacao" },
  { key: "busca", label: "Busca Global", route: "/busca" },
  { key: "configuracoes", label: "Configurações", route: "/configuracoes" },
];

export const ROLE_LABELS: Record<ConfigurableRole, string> = {
  chefe_gabinete: "Chefe de Gabinete",
  secretario: "Secretário",
  lideranca: "Liderança",
};

export interface PermissionRow {
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

const FULL: PermissionRow = { can_view: true, can_create: true, can_edit: true, can_delete: true };
const RW: PermissionRow = { can_view: true, can_create: true, can_edit: true, can_delete: false };
const READ: PermissionRow = { can_view: true, can_create: false, can_edit: false, can_delete: false };
const NONE: PermissionRow = { can_view: false, can_create: false, can_edit: false, can_delete: false };

/** Defaults por role × módulo (espelha o comportamento histórico). */
export const DEFAULT_MATRIX: Record<ConfigurableRole, Record<string, PermissionRow>> = {
  // Chefe de Gabinete: comportamento de admin, mas ainda configurável.
  chefe_gabinete: Object.fromEntries(MODULES.map((m) => [m.key, { ...FULL }])),
  // Secretário: escreve em quase tudo, sem deletar.
  secretario: {
    dashboard: READ,
    demandas: RW,
    liderancas: RW,
    eleitores: RW,
    cidades: RW,
    mapa: READ,
    emendas: RW,
    proposicoes: RW,
    mandato_foco: READ,
    agenda: RW,
    documentos: READ,
    mensagens: READ,
    mobilizacao: READ,
    busca: READ,
    configuracoes: NONE,
  },
  // Liderança: leitura nos módulos visíveis. CRUD apenas em eleitores (sem delete).
  lideranca: {
    dashboard: READ,
    demandas: READ,
    liderancas: READ,
    eleitores: { can_view: true, can_create: true, can_edit: true, can_delete: false },
    cidades: READ,
    mapa: READ,
    emendas: READ,
    proposicoes: READ,
    mandato_foco: READ,
    agenda: READ,
    documentos: NONE,
    mensagens: NONE,
    mobilizacao: NONE,
    busca: NONE,
    configuracoes: NONE,
  },
};

export function defaultRowFor(role: ConfigurableRole, moduleKey: string): PermissionRow {
  return DEFAULT_MATRIX[role]?.[moduleKey] ?? NONE;
}
