import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";

export const ALL_DEMANDA_ORIGINS = [
  { key: "manual", label: "Demanda (manual)" },
  { key: "telegram", label: "Demanda via Telegram" },
  { key: "proposicao", label: "Proposição" },
  { key: "emenda", label: "Emenda" },
  { key: "agenda", label: "Agenda" },
  { key: "comunicacao", label: "Comunicação" },
] as const;

export type DemandaOriginKey = typeof ALL_DEMANDA_ORIGINS[number]["key"];

export interface DemandasDisplayConfig {
  visibleOrigins: string[];
  maxAgeDays: number | null;
}

const DEFAULT_VISIBLE = ALL_DEMANDA_ORIGINS.map((o) => o.key);

export function useDemandasDisplayConfig() {
  const { tenantId } = useTenant();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["demandas-display-config", tenantId],
    enabled: !!tenantId,
    queryFn: async (): Promise<DemandasDisplayConfig> => {
      const { data, error } = await supabase
        .from("tenants")
        .select("demanda_visible_origins, demanda_max_age_days")
        .eq("id", tenantId!)
        .single();
      if (error) throw error;
      const row = data as any;
      return {
        visibleOrigins: row?.demanda_visible_origins ?? DEFAULT_VISIBLE,
        maxAgeDays: row?.demanda_max_age_days ?? null,
      };
    },
  });

  const update = useMutation({
    mutationFn: async (cfg: DemandasDisplayConfig) => {
      const { error } = await supabase
        .from("tenants")
        .update({
          demanda_visible_origins: cfg.visibleOrigins,
          demanda_max_age_days: cfg.maxAgeDays,
        } as any)
        .eq("id", tenantId!);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["demandas-display-config"] });
    },
  });

  return {
    config: query.data ?? { visibleOrigins: DEFAULT_VISIBLE, maxAgeDays: null },
    isLoading: query.isLoading,
    update,
  };
}
