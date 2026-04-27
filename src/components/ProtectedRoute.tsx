import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { useTenant } from "@/hooks/use-tenant";
import { usePermissions } from "@/hooks/use-permissions";
import { MODULES } from "@/lib/permissions-defaults";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const { isSuperAdmin, loading: tenantLoading } = useTenant();
  const { can, isAdmin } = usePermissions();
  const location = useLocation();

  // Wait for auth + tenant + profile (if authenticated). Profile is needed before
  // rendering protected pages to avoid flashes of unauthorized content while the
  // role is still being resolved.
  const profilePending = !!user && !profile;
  if (loading || tenantLoading || profilePending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-5 animate-fade-in">
          {/* Spinner com anéis concêntricos */}
          <div className="relative h-16 w-16">
            <div className="absolute inset-0 rounded-full border-4 border-primary/15" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin" />
            <div className="absolute inset-2 rounded-full border-2 border-transparent border-t-primary/60 animate-spin [animation-duration:1.5s] [animation-direction:reverse]" />
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <p className="text-sm font-semibold text-foreground tracking-wide">Carregando seu painel</p>
            <div className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" />
            </div>
          </div>
        </div>
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
