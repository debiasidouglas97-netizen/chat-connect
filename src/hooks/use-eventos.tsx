import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";

export interface EventoRow {
  id: string;
  data: string;
  hora: string;
  hora_fim: string | null;
  titulo: string;
  description: string | null;
  cidade: string;
  tipo: string;
  dia_inteiro: boolean;
  endereco: string | null;
  local_nome: string | null;
  estado: string | null;
  cep: string | null;
  prioridade: string;
  impacto_politico: string;
  status: string;
  participantes_liderancas: string[];
  secretario_responsavel: string | null;
  convidados: string | null;
  demanda_id: string | null;
  emenda_id: string | null;
  notas: string | null;
  notificado: boolean;
  lembrete_enviado: boolean;
  liderancas: number;
  demandas: number;
  created_at: string;
  updated_at: string;
}

export type EventoInsert = Omit<EventoRow, "id" | "created_at" | "updated_at" | "notificado" | "lembrete_enviado">;

export function useEventos() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();

  const query = useQuery({
    queryKey: ["eventos", tenantId],
    queryFn: async () => {
      let q = supabase.from("eventos").select("*").order("data", { ascending: true });
      if (tenantId) q = q.eq("tenant_id", tenantId);
      const { data, error } = await q;
      if (error) throw error;
      return (data as unknown as EventoRow[]);
    },
  });

  const insertMutation = useMutation({
    mutationFn: async (ev: Partial<EventoInsert> & { titulo: string; data: string; hora: string; cidade: string }) => {
      const { data, error } = await supabase.from("eventos").insert({
        titulo: ev.titulo,
        data: ev.data,
        hora: ev.hora,
        hora_fim: ev.hora_fim || null,
        cidade: ev.cidade,
        tipo: ev.tipo || "Reunião",
        description: ev.description || null,
        dia_inteiro: ev.dia_inteiro || false,
        endereco: ev.endereco || null,
        local_nome: ev.local_nome || null,
        estado: ev.estado || null,
        cep: ev.cep || null,
        prioridade: ev.prioridade || "Média",
        impacto_politico: ev.impacto_politico || "Médio",
        status: ev.status || "Confirmado",
        participantes_liderancas: ev.participantes_liderancas || [],
        secretario_responsavel: ev.secretario_responsavel || null,
        convidados: ev.convidados || null,
        demanda_id: ev.demanda_id || null,
        emenda_id: ev.emenda_id || null,
        notas: ev.notas || null,
        tenant_id: tenantId,
      } as any).select().single();
      if (error) throw error;

      // Auto-create Kanban card
      await supabase.from("demandas").insert({
        title: ev.titulo,
        city: ev.cidade,
        priority: ev.prioridade || "Média",
        col: "nova",
        origin: "agenda",
        description: `📅 ${ev.data} às ${ev.hora} | ${ev.tipo || "Reunião"}\n${ev.description || ""}`,
        tenant_id: tenantId,
      } as any);

      return data as unknown as EventoRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eventos"] });
      queryClient.invalidateQueries({ queryKey: ["demandas"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...ev }: Partial<EventoInsert> & { id: string }) => {
      const updateData: any = { updated_at: new Date().toISOString() };
      if (ev.titulo !== undefined) updateData.titulo = ev.titulo;
      if (ev.data !== undefined) updateData.data = ev.data;
      if (ev.hora !== undefined) updateData.hora = ev.hora;
      if (ev.hora_fim !== undefined) updateData.hora_fim = ev.hora_fim;
      if (ev.cidade !== undefined) updateData.cidade = ev.cidade;
      if (ev.tipo !== undefined) updateData.tipo = ev.tipo;
      if (ev.description !== undefined) updateData.description = ev.description;
      if (ev.dia_inteiro !== undefined) updateData.dia_inteiro = ev.dia_inteiro;
      if (ev.endereco !== undefined) updateData.endereco = ev.endereco;
      if (ev.local_nome !== undefined) updateData.local_nome = ev.local_nome;
      if (ev.estado !== undefined) updateData.estado = ev.estado;
      if (ev.cep !== undefined) updateData.cep = ev.cep;
      if (ev.prioridade !== undefined) updateData.prioridade = ev.prioridade;
      if (ev.impacto_politico !== undefined) updateData.impacto_politico = ev.impacto_politico;
      if (ev.status !== undefined) updateData.status = ev.status;
      if (ev.participantes_liderancas !== undefined) updateData.participantes_liderancas = ev.participantes_liderancas;
      if (ev.secretario_responsavel !== undefined) updateData.secretario_responsavel = ev.secretario_responsavel;
      if (ev.convidados !== undefined) updateData.convidados = ev.convidados;
      if (ev.demanda_id !== undefined) updateData.demanda_id = ev.demanda_id;
      if (ev.emenda_id !== undefined) updateData.emenda_id = ev.emenda_id;
      if (ev.notas !== undefined) updateData.notas = ev.notas;

      const { error } = await supabase.from("eventos").update(updateData).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["eventos"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("eventos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["eventos"] }),
  });

  return {
    eventos: query.data || [],
    isLoading: query.isLoading,
    insert: insertMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
    isInserting: insertMutation.isPending,
  };
}
