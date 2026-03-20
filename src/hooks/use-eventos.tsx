import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface EventoRow {
  id: string;
  data: string;
  hora: string;
  titulo: string;
  cidade: string;
  tipo: string;
  liderancas: number;
  demandas: number;
}

export function useEventos() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["eventos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eventos")
        .select("*")
        .order("data", { ascending: true });
      if (error) throw error;
      return data as unknown as EventoRow[];
    },
  });

  return {
    eventos: query.data || [],
    isLoading: query.isLoading,
  };
}
