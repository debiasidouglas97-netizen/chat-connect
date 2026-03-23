import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  url: string;
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

export interface DbComment {
  id: string;
  demanda_id: string;
  author: string;
  text: string;
  source: string;
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
      return (data as unknown as Omit<DbAttachment, "url">[]).map((a) => ({
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

  const commentsQuery = useQuery({
    queryKey: ["demanda-comments", demandaId],
    queryFn: async () => {
      if (!demandaId) return [];
      const { data, error } = await supabase
        .from("demanda_comments")
        .select("*")
        .eq("demanda_id", demandaId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as unknown as DbComment[];
    },
    enabled: !!demandaId,
  });

  const addCommentMutation = useMutation({
    mutationFn: async ({ text, author }: { text: string; author: string }) => {
      if (!demandaId) throw new Error("No demanda");
      const { error } = await supabase.from("demanda_comments").insert({
        demanda_id: demandaId,
        author,
        text,
        source: "manual",
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["demanda-comments", demandaId] });
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["demanda-attachments", demandaId] });
    queryClient.invalidateQueries({ queryKey: ["demanda-history", demandaId] });
    queryClient.invalidateQueries({ queryKey: ["demanda-comments", demandaId] });
  };

  return {
    attachments: attachmentsQuery.data || [],
    history: historyQuery.data || [],
    comments: commentsQuery.data || [],
    isLoading: attachmentsQuery.isLoading || historyQuery.isLoading || commentsQuery.isLoading,
    addComment: addCommentMutation.mutateAsync,
    isAddingComment: addCommentMutation.isPending,
    invalidate,
  };
}
