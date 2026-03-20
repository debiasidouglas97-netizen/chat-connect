import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DemandaRow {
  id: string;
  col: string;
  title: string;
  city: string;
  priority: string;
  responsible: string | null;
  attachments: number;
  created_at: string;
}

export function useDemandas() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["demandas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("demandas")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as DemandaRow[];
    },
  });

  const insertMutation = useMutation({
    mutationFn: async (d: { col: string; title: string; city: string; priority: string; responsible: string }) => {
      const { error } = await supabase.from("demandas").insert({
        col: d.col,
        title: d.title,
        city: d.city,
        priority: d.priority,
        responsible: d.responsible,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["demandas"] }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data: d }: { id: string; data: Record<string, any> }) => {
      const { error } = await supabase.from("demandas").update({
        ...d,
        updated_at: new Date().toISOString(),
      } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["demandas"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("demandas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["demandas"] }),
  });

  return {
    demandas: query.data || [],
    isLoading: query.isLoading,
    insert: insertMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
  };
}
