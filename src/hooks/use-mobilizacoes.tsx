import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { toast } from "sonner";

export interface Mobilizacao {
  id: string;
  tenant_id: string;
  titulo: string;
  tipo: string;
  link: string;
  mensagem: string;
  segmentacao_tipo: string;
  segmentacao_valor: string[];
  total_enviado: number;
  status: string;
  agendado_para: string | null;
  criado_por: string;
  enviado_por: string | null;
  created_at: string;
  updated_at: string;
}

export interface MobilizacaoDestinatario {
  id: string;
  mobilizacao_id: string;
  tenant_id: string;
  lideranca_name: string;
  cidade: string | null;
  chat_id: number | null;
  telegram_enviado: boolean;
  enviado_at: string | null;
  created_at: string;
}

export function useMobilizacoes() {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  const { data: mobilizacoes = [], isLoading } = useQuery({
    queryKey: ["mobilizacoes", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mobilizacoes")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Mobilizacao[];
    },
    enabled: !!tenantId,
  });

  const createMobilizacao = useMutation({
    mutationFn: async (mob: Omit<Mobilizacao, "id" | "created_at" | "updated_at" | "total_enviado">) => {
      const { data, error } = await supabase
        .from("mobilizacoes")
        .insert(mob as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mobilizacoes"] });
      toast.success("Mobilização criada com sucesso!");
    },
    onError: (e: any) => toast.error("Erro ao criar mobilização: " + e.message),
  });

  const updateMobilizacao = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<Mobilizacao>) => {
      const { error } = await supabase
        .from("mobilizacoes")
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mobilizacoes"] });
    },
  });

  const deleteMobilizacao = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("mobilizacoes")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mobilizacoes"] });
      toast.success("Mobilização excluída!");
    },
  });

  return { mobilizacoes, isLoading, createMobilizacao, updateMobilizacao, deleteMobilizacao, tenantId };
}

export function useMobilizacaoDestinatarios(mobilizacaoId: string | null) {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ["mobilizacao-destinatarios", mobilizacaoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mobilizacao_destinatarios")
        .select("*")
        .eq("mobilizacao_id", mobilizacaoId!)
        .eq("tenant_id", tenantId!);
      if (error) throw error;
      return data as unknown as MobilizacaoDestinatario[];
    },
    enabled: !!mobilizacaoId && !!tenantId,
  });
}
