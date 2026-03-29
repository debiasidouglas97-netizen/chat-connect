import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";

export interface EmendaRow {
  id: string;
  cidade: string;
  valor: string;
  status: string;
  tipo: string;
  ano: number;
  titulo: string | null;
  descricao: string | null;
  objetivo_politico: string | null;
  prioridade: string;
  regiao: string | null;
  liderancas_relacionadas: string[];
  notas: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmendaAttachment {
  id: string;
  emenda_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  uploaded_by: string;
  created_at: string;
}

export function useEmendas() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();

  const query = useQuery({
    queryKey: ["emendas", tenantId],
    queryFn: async () => {
      let q = supabase.from("emendas").select("*").order("ano", { ascending: false });
      if (tenantId) q = q.eq("tenant_id", tenantId);
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as EmendaRow[];
    },
  });

  const insertMutation = useMutation({
    mutationFn: async (e: Omit<EmendaRow, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase.from("emendas").insert({
        cidade: e.cidade,
        valor: e.valor,
        status: e.status,
        tipo: e.tipo,
        ano: e.ano,
        titulo: e.titulo,
        descricao: e.descricao,
        objetivo_politico: e.objetivo_politico,
        prioridade: e.prioridade,
        regiao: e.regiao,
        liderancas_relacionadas: e.liderancas_relacionadas,
        notas: e.notas,
        tenant_id: tenantId,
      } as any).select().single();
      if (error) throw error;

      // Auto-create Kanban card
      const statusToCol: Record<string, string> = {
        "Proposta": "nova",
        "Aprovada": "analise",
        "Liberada": "encaminhada",
        "Em execução": "execucao",
        "Paga": "resolvida",
        "Concluída": "resolvida",
      };
      await supabase.from("demandas").insert({
        title: e.titulo || `Emenda ${e.tipo} – ${e.cidade}`,
        city: e.cidade,
        priority: e.prioridade,
        col: statusToCol[e.status] || "nova",
        origin: "emenda",
        description: `💰 ${e.valor} | ${e.tipo}\n${e.descricao || ""}`,
        tenant_id: tenantId,
      } as any);

      return data as any;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emendas"] });
      queryClient.invalidateQueries({ queryKey: ["demandas"] });
    },
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

export function useEmendaAttachments(emendaId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["emenda-attachments", emendaId],
    enabled: !!emendaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("emenda_attachments")
        .select("*")
        .eq("emenda_id", emendaId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as EmendaAttachment[];
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, emendaId: eid }: { file: File; emendaId: string }) => {
      const path = `${eid}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("emenda-attachments")
        .upload(path, file);
      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from("emenda_attachments").insert({
        emenda_id: eid,
        file_name: file.name,
        file_type: file.type || "application/octet-stream",
        file_size: file.size,
        storage_path: path,
      } as any);
      if (insertError) throw insertError;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["emenda-attachments", emendaId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (att: EmendaAttachment) => {
      await supabase.storage.from("emenda-attachments").remove([att.storage_path]);
      const { error } = await supabase.from("emenda_attachments").delete().eq("id", att.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["emenda-attachments", emendaId] }),
  });

  return {
    attachments: query.data || [],
    isLoading: query.isLoading,
    upload: uploadMutation.mutateAsync,
    removeAttachment: deleteMutation.mutateAsync,
  };
}
