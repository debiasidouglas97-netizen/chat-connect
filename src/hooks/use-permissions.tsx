import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useTenant } from "@/hooks/use-tenant";
import { supabase } from "@/integrations/supabase/client";
import {
  defaultRowFor,
  MODULES,
  type ConfigurableRole,
  type PermissionAction,
} from "@/lib/permissions-defaults";

interface RolePermissionRow {
  role: ConfigurableRole;
  module: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

/**
 * Centralized RBAC for the tenant app.
 * Permissions are stored in `role_permissions` per tenant. Admin roles
 * (deputado, chefe_gabinete) and super_admin always get full access.
 */
export function usePermissions() {
  const { profile } = useAuth();
  const { tenantId } = useTenant();
  const role = profile?.role;

  const isSuperAdmin = role === "super_admin";
  const isDeputado = role === "deputado";
  const isChefeGabinete = role === "chefe_gabinete";
  const isAdmin = isDeputado || isChefeGabinete;
  const isOperator = role === "secretario";
  const isLideranca = role === "lideranca";

  // Note: we still treat chefe_gabinete in the configurable set so admin can
  // optionally restrict them; but `isAdmin` short-circuits checks to true.
  const configurableRole: ConfigurableRole | null =
    role === "chefe_gabinete" || role === "secretario" || role === "lideranca"
      ? role
      : null;

  const { data: matrixRows } = useQuery({
    queryKey: ["role-permissions", tenantId, configurableRole],
    enabled: !!tenantId && !!configurableRole && !isAdmin && !isSuperAdmin,
    queryFn: async (): Promise<RolePermissionRow[]> => {
      const { data, error } = await supabase
        .from("role_permissions" as any)
        .select("role, module, can_view, can_create, can_edit, can_delete")
        .eq("tenant_id", tenantId!)
        .eq("role", configurableRole!);
      if (error) throw error;
      return (data as any) || [];
    },
  });

  const can = (moduleKey: string, action: PermissionAction): boolean => {
    if (isAdmin || isSuperAdmin) return true;
    if (!configurableRole) return false;
    const row = matrixRows?.find((r) => r.module === moduleKey);
    if (row) {
      return action === "view" ? row.can_view
        : action === "create" ? row.can_create
        : action === "edit" ? row.can_edit
        : row.can_delete;
    }
    const def = defaultRowFor(configurableRole, moduleKey);
    return action === "view" ? def.can_view
      : action === "create" ? def.can_create
      : action === "edit" ? def.can_edit
      : def.can_delete;
  };

  // Set of routes the user can view (for sidebar + ProtectedRoute).
  const visibleRoutes = new Set(
    MODULES.filter((m) => can(m.key, "view")).map((m) => m.route)
  );

  return {
    role,
    isSuperAdmin,
    isAdmin,
    isOperator,
    isLideranca,
    can,
    visibleRoutes,
    // Legacy flags (derived from matrix) — kept for backward compatibility.
    canWriteCidades: can("cidades", "edit") || can("cidades", "create"),
    canWriteLiderancas: can("liderancas", "edit") || can("liderancas", "create"),
    canDeleteLiderancas: can("liderancas", "delete"),
    canWriteEmendas: can("emendas", "edit") || can("emendas", "create"),
    canWriteAgenda: can("agenda", "edit") || can("agenda", "create"),
    canWriteProposicoes: can("proposicoes", "edit") || can("proposicoes", "create"),
    canWriteMapa: can("mapa", "edit") || can("mapa", "create"),
    canWriteDemandas: can("demandas", "edit") || can("demandas", "create"),
    canCreateEleitores: can("eleitores", "create"),
    canDeleteEleitores: can("eleitores", "delete"),
    linkedLiderancaId: profile?.lideranca_id ?? null,
  };
}
