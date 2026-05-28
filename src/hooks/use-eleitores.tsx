import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { toast } from "sonner";

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
  avatar_url: string | null;
  custom_field_values: Record<string, any> | null;
  created_at: string;
  updated_at: string;
  osm_subscriber_id?: number | null;
  osm_sync_status?: "pending" | "synced" | "error" | null;
  osm_sync_error?: string | null;
  osm_synced_at?: string | null;
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
  avatar_url?: string | null;
  custom_field_values?: Record<string, any>;
}

async function syncOsm(action: "create" | "update" | "delete", eleitor_id: string) {
  try {
    const { data, error } = await supabase.functions.invoke("osm-subscriber-sync", {
      body: { action, eleitor_id },
    });
    if (error) throw error;
    if ((data as any)?.error) throw new Error((data as any).error);
    return { ok: true as const };
  } catch (e: any) {
    const msg = e?.message || "Erro desconhecido na OSM";
    toast.warning("Sincronização OSM falhou", { description: msg });
    return { ok: false as const, error: msg };
  }
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
      if (error) throw error;
      return (data || []) as EleitorRow[];
    },
    enabled: !!tenantId,
  });

  const insert = useMutation({
    mutationFn: async (input: EleitorInput) => {
      const { data, error } = await (supabase as any)
        .from("eleitores")
        .insert({ ...input, tenant_id: tenantId })
        .select("id")
        .single();
      if (error) throw error;
      const newId = (data as any)?.id as string;
      if (newId) await syncOsm("create", newId);
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
      await syncOsm("update", id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["eleitores"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      // Tenta baixar na OSM primeiro (mas não bloqueia exclusão local)
      await syncOsm("delete", id);
      const { error } = await (supabase as any).from("eleitores").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["eleitores"] }),
  });

  const resyncOsm = useMutation({
    mutationFn: async (id: string) => {
      const res = await syncOsm("update", id);
      if (!res.ok) throw new Error(res.error);
    },
    onSuccess: () => {
      toast.success("Sincronizado com OSM NxTV");
      queryClient.invalidateQueries({ queryKey: ["eleitores"] });
    },
  });

  return {
    eleitores: query.data || [],
    isLoading: query.isLoading,
    insert: insert.mutateAsync,
    update: update.mutateAsync,
    remove: remove.mutateAsync,
    resyncOsm: resyncOsm.mutateAsync,
  };
}
