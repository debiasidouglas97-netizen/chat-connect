import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";

export interface EleitorRow {
  id: string;
  tenant_id: string | null;
  nome: string;
  whatsapp: string;
  cidade: string;
  telegram: string | null;
  email: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  bairro: string | null;
  estado: string | null;
  lideranca_id: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export interface EleitorInput {
  nome: string;
  whatsapp: string;
  cidade: string;
  telegram?: string | null;
  email?: string | null;
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  bairro?: string | null;
  estado?: string | null;
  lideranca_id?: string | null;
  observacoes?: string | null;
}

export function useEleitores() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();

  const query = useQuery({
    queryKey: ["eleitores", tenantId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("eleitores")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("[useEleitores] erro:", error);
        throw error;
      }
      console.log("[useEleitores] tenantId:", tenantId, "rows:", data?.length);
      return (data || []) as EleitorRow[];
    },
    enabled: !!tenantId,
    refetchOnMount: "always",
    staleTime: 0,
  });

  const insert = useMutation({
    mutationFn: async (input: EleitorInput) => {
      const { error } = await (supabase as any).from("eleitores").insert({
        ...input,
        tenant_id: tenantId,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["eleitores"] }),
  });

  const update = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<EleitorInput> }) => {
      const { error } = await (supabase as any)
        .from("eleitores")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["eleitores"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("eleitores").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["eleitores"] }),
  });

  return {
    eleitores: query.data || [],
    isLoading: query.isLoading,
    insert: insert.mutateAsync,
    update: update.mutateAsync,
    remove: remove.mutateAsync,
  };
}
