import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

interface TenantContextType {
  tenantId: string | null;
  isSuperAdmin: boolean;
  loading: boolean;
}

const TenantContext = createContext<TenantContextType>({
  tenantId: null,
  isSuperAdmin: false,
  loading: true,
});

export function TenantProvider({ children }: { children: ReactNode }) {
  const { user, profile, loading: authLoading } = useAuth();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setTenantId(null);
      setIsSuperAdmin(false);
      setLoading(false);
      return;
    }

    const checkRole = async () => {
      // Check if super_admin
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      
      const hasSuperAdmin = (roles || []).some((r: any) => r.role === "super_admin");
      setIsSuperAdmin(hasSuperAdmin);

      // Get tenant_id from profile
      const { data: prof } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user.id)
        .single();
      
      setTenantId((prof as any)?.tenant_id || null);
      setLoading(false);
    };

    checkRole();
  }, [user, authLoading, profile]);

  return (
    <TenantContext.Provider value={{ tenantId, isSuperAdmin, loading }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  return useContext(TenantContext);
}
