import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DbAttachment {
  id: string;
  demanda_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  uploaded_by: string;
  source: string;
  created_at: string;
}

export interface DbHistoryEntry {
  id: string;
  demanda_id: string;
  action: string;
  actor: string;
  old_status: string | null;
  new_status: string | null;
  created_at: string;
}

function getPublicUrl(storagePath: string) {
  const { data } = supabase.storage
    .from("demanda-attachments")
    .getPublicUrl(storagePath);
  return data.publicUrl;
}

export function useDemandaDetails(demandaId: string | null) {
  const queryClient = useQueryClient();

  const attachmentsQuery = useQuery({
    queryKey: ["demanda-attachments", demandaId],
    queryFn: async () => {
      if (!demandaId) return [];
      const { data, error } = await supabase
        .from("demanda_attachments")
        .select("*")
        .eq("demanda_id", demandaId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data as unknown as DbAttachment[]).map((a) => ({
        ...a,
        url: getPublicUrl(a.storage_path),
      }));
    },
    enabled: !!demandaId,
  });

  const historyQuery = useQuery({
    queryKey: ["demanda-history", demandaId],
    queryFn: async () => {
      if (!demandaId) return [];
      const { data, error } = await supabase
        .from("demanda_history")
        .select("*")
        .eq("demanda_id", demandaId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as DbHistoryEntry[];
    },
    enabled: !!demandaId,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["demanda-attachments", demandaId] });
    queryClient.invalidateQueries({ queryKey: ["demanda-history", demandaId] });
  };

  return {
    attachments: attachmentsQuery.data || [],
    history: historyQuery.data || [],
    isLoading: attachmentsQuery.isLoading || historyQuery.isLoading,
    invalidate,
  };
}
