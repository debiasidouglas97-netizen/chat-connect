import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { toast } from "sonner";

export interface StreamConfig {
  id: string;
  tenant_id: string;
  stream_url: string;
  stream_type: "auto" | "hls" | "dash" | "embed";
  status: "active" | "inactive";
}

export function useStreamConfig() {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ["stream-config", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_stream_config" as any)
        .select("*")
        .eq("tenant_id", tenantId!)
        .maybeSingle();
      if (error) throw error;
      return data as StreamConfig | null;
    },
  });

  const upsert = useMutation({
    mutationFn: async (values: Partial<StreamConfig>) => {
      if (config?.id) {
        const { error } = await supabase
          .from("tenant_stream_config" as any)
          .update({ ...values, updated_at: new Date().toISOString() } as any)
          .eq("id", config.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("tenant_stream_config" as any)
          .insert({ ...values, tenant_id: tenantId } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stream-config", tenantId] });
      toast.success("Configuração de streaming salva!");
    },
    onError: (e: any) => toast.error("Erro ao salvar: " + e.message),
  });

  return { config, isLoading, upsert };
}
