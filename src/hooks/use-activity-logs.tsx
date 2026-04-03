import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";

export interface ActivityLog {
  id: string;
  tenant_id: string | null;
  tipo_evento: string;
  entidade: string;
  entidade_id: string | null;
  descricao_bruta: string;
  descricao_ia: string | null;
  prioridade: string;
  usuario_responsavel: string | null;
  created_at: string;
}

export function useActivityLogs(limit = 10) {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["activity-logs", tenantId, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_logs")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as unknown as ActivityLog[];
    },
    enabled: !!tenantId,
  });

  const processAI = useMutation({
    mutationFn: async () => {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const res = await fetch(`${supabaseUrl}/functions/v1/activity-ai-describe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${anonKey}`,
        },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error("Failed to process AI descriptions");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });

  return {
    logs: query.data || [],
    isLoading: query.isLoading,
    processAI: processAI.mutateAsync,
    isProcessing: processAI.isPending,
    refetch: query.refetch,
  };
}
