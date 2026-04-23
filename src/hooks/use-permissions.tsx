import { useAuth } from "@/hooks/use-auth";

/**
 * Centralized RBAC for the tenant app.
 * - ADMIN: deputado, chefe_gabinete (full access)
 * - OPERATOR: secretario (write access on most modules)
 * - LIDERANCA: lideranca (read-only on most modules; manages own eleitores)
 */
export function usePermissions() {
  const { profile } = useAuth();
  const role = profile?.role;

  const isAdmin = role === "deputado" || role === "chefe_gabinete";
  const isOperator = role === "secretario";
  const isLideranca = role === "lideranca";
  const isWriter = isAdmin || isOperator;

  return {
    role,
    isAdmin,
    isOperator,
    isLideranca,
    // Write access on read-mostly modules (cidades, mapas, lideranças, emendas, proposições, agenda)
    canWriteCidades: isWriter,
    canWriteLiderancas: isWriter,
    canWriteEmendas: isWriter,
    canWriteAgenda: isWriter,
    canWriteProposicoes: isWriter,
    canWriteMapa: isWriter,
    // Demandas: lideranças apenas consultam
    canWriteDemandas: isWriter,
    // Eleitores: lideranças podem cadastrar/editar (apenas os seus, garantido por RLS)
    canCreateEleitores: isWriter || isLideranca,
    canDeleteEleitores: isWriter,
    // Linked lideranca id (used for filtering Eleitores client-side as defense-in-depth)
    linkedLiderancaId: profile?.lideranca_id ?? null,
  };
}
