import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";

export interface DemandaRow {
  id: string;
  col: string;
  title: string;
  description: string | null;
  city: string;
  priority: string;
  responsible: string | null;
  attachments: number;
  origin: string;
  creator_chat_id: number | null;
  creator_name: string | null;
  order_index: number;
  created_at: string;
  tenant_id: string | null;
}

export function useDemandas() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();

  const query = useQuery({
    queryKey: ["demandas", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("demandas")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("order_index", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as DemandaRow[];
    },
    enabled: !!tenantId,
  });

  const insertMutation = useMutation({
    mutationFn: async (d: {
      col: string;
      title: string;
      city: string;
      priority: string;
      responsible: string;
      description?: string;
      origin?: string;
      creator_chat_id?: number | null;
      creator_name?: string | null;
    }) => {
      const { data, error } = await supabase.from("demandas").insert({
        col: d.col,
        title: d.title,
        city: d.city,
        priority: d.priority,
        responsible: d.responsible,
        description: d.description || null,
        origin: d.origin || "manual",
        creator_chat_id: d.creator_chat_id || null,
        creator_name: d.creator_name || null,
        tenant_id: tenantId,
      } as any).select().single();
      if (error) throw error;
      return data;
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

  const addHistory = async (demandaId: string, action: string, actor: string, oldStatus?: string, newStatus?: string) => {
    await supabase.from("demanda_history").insert({
      demanda_id: demandaId,
      action,
      actor,
      old_status: oldStatus || null,
      new_status: newStatus || null,
      tenant_id: tenantId,
    } as any);
  };

  const notifyStatusChange = async (demandaId: string, newStatus: string) => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      await fetch(`${supabaseUrl}/functions/v1/telegram-notify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${anonKey}`,
        },
        body: JSON.stringify({ demanda_id: demandaId, new_status: newStatus }),
      });
    } catch (e) {
      console.error("Failed to send notification:", e);
    }
  };

  return {
    demandas: query.data || [],
    isLoading: query.isLoading,
    insert: insertMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
    addHistory,
    notifyStatusChange,
  };
}
