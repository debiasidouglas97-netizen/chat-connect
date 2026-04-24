import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { useTenant } from "@/hooks/use-tenant";
import { usePermissions } from "@/hooks/use-permissions";

// Routes blocked for "lideranca" role
const LIDERANCA_BLOCKED_PREFIXES = [
  "/documentos",
  "/mensagens",
  "/mobilizacao",
  "/busca",
  "/configuracoes",
];

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { isSuperAdmin, loading: tenantLoading } = useTenant();
  const { isLideranca } = usePermissions();
  const location = useLocation();

  if (loading || tenantLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Super admin trying to access tenant routes → redirect to /admin
  if (isSuperAdmin && !location.pathname.startsWith("/admin")) {
    return <Navigate to="/admin" replace />;
  }

  // Non-super-admin trying to access admin routes → redirect to /
  if (!isSuperAdmin && location.pathname.startsWith("/admin")) {
    return <Navigate to="/" replace />;
  }

  // Liderança trying to access blocked routes → redirect to /
  if (
    isLideranca &&
    LIDERANCA_BLOCKED_PREFIXES.some((p) => location.pathname.startsWith(p))
  ) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
