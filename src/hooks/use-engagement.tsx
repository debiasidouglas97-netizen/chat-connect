import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { toast } from "sonner";

export interface EngagementConfig {
  id: string;
  tenant_id: string;
  instagram_handle: string;
  apify_api_key: string;
  frequencia_sincronizacao: string;
  last_sync_at: string | null;
  last_sync_status: string | null;
  last_sync_error: string | null;
}

export interface EngagementLog {
  id: string;
  tenant_id: string;
  leader_id: string | null;
  instagram_username: string;
  post_id: string;
  comment_id: string;
  comment_text: string | null;
  tipo_interacao: string;
  score: number;
  created_at: string;
}

export function useEngagementConfig() {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["engagement-config", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("engagement_sync_config" as any)
        .select("*")
        .eq("tenant_id", tenantId!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as EngagementConfig | null;
    },
    enabled: !!tenantId,
  });

  const upsert = useMutation({
    mutationFn: async (config: Partial<EngagementConfig>) => {
      const existing = query.data;
      if (existing) {
        const { error } = await supabase
          .from("engagement_sync_config" as any)
          .update({ ...config, updated_at: new Date().toISOString() } as any)
          .eq("tenant_id", tenantId!);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("engagement_sync_config" as any)
          .insert({ ...config, tenant_id: tenantId } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["engagement-config"] });
      toast.success("Configuração salva!");
    },
    onError: (e: any) => toast.error("Erro ao salvar: " + e.message),
  });

  return { config: query.data, isLoading: query.isLoading, upsert };
}

export function useEngagementLogs(leaderId?: string) {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ["engagement-logs", tenantId, leaderId],
    queryFn: async () => {
      let q = supabase
        .from("engagement_logs" as any)
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false })
        .limit(100);
      
      if (leaderId) {
        q = q.eq("leader_id", leaderId);
      }
      
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as EngagementLog[];
    },
    enabled: !!tenantId,
  });
}

export function useLeaderEngagementScore(leaderId?: string) {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ["engagement-score", tenantId, leaderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("engagement_logs" as any)
        .select("score")
        .eq("tenant_id", tenantId!)
        .eq("leader_id", leaderId!);
      if (error) throw error;
      const total = (data || []).reduce((sum: number, r: any) => sum + (r.score || 0), 0);
      return total;
    },
    enabled: !!tenantId && !!leaderId,
  });
}

export function useAllLeaderEngagementScores() {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ["engagement-scores-all", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("engagement_logs" as any)
        .select("leader_id, score")
        .eq("tenant_id", tenantId!);
      if (error) throw error;
      
      const scores = new Map<string, number>();
      (data || []).forEach((r: any) => {
        if (r.leader_id) {
          scores.set(r.leader_id, (scores.get(r.leader_id) || 0) + (r.score || 0));
        }
      });
      return scores;
    },
    enabled: !!tenantId,
  });
}

export function useSyncEngagement() {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const url = `https://${projectId}.supabase.co/functions/v1/sync-instagram-engagement`;
      
      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token || ""}`,
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ tenant_id: tenantId }),
      });
      
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Erro na sincronização");
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["engagement"] });
      queryClient.invalidateQueries({ queryKey: ["engagement-config"] });
      queryClient.invalidateQueries({ queryKey: ["engagement-scores-all"] });
      toast.success(
        `Sincronização concluída! ${data.posts_processados} posts, ${data.matches_encontrados} interações (${data.matches_comentarios || 0} comentários, ${data.matches_curtidas || 0} curtidas)`
      );
    },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });
}
