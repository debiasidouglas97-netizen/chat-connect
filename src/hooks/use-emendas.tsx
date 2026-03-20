import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface EmendaRow {
  id: string;
  cidade: string;
  valor: string;
  status: string;
  tipo: string;
  ano: number;
}

export function useEmendas() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["emendas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("emendas")
        .select("*")
        .order("ano", { ascending: false });
      if (error) throw error;
      return data as unknown as EmendaRow[];
    },
  });

  const insertMutation = useMutation({
    mutationFn: async (e: { cidade: string; valor: string; status: string; tipo: string; ano: number }) => {
      const { error } = await supabase.from("emendas").insert(e as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["emendas"] }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data: e }: { id: string; data: Record<string, any> }) => {
      const { error } = await supabase.from("emendas").update({
        ...e,
        updated_at: new Date().toISOString(),
      } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["emendas"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("emendas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["emendas"] }),
  });

  return {
    emendas: query.data || [],
    isLoading: query.isLoading,
    insert: insertMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
  };
}
