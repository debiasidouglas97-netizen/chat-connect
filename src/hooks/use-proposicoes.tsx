import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";

export interface Proposicao {
  id: string;
  tenant_id: string | null;
  camara_id: number;
  tipo: string;
  numero: number;
  ano: number;
  ementa: string | null;
  status_proposicao: string | null;
  tema: string | null;
  autor: string | null;
  url_inteiro_teor: string | null;
  ultima_atualizacao: string | null;
  adicionado_kanban: boolean;
  demanda_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Tramitacao {
  id: string;
  proposicao_id: string;
  data_hora: string | null;
  sequencia: number | null;
  sigla_orgao: string | null;
  descricao_tramitacao: string | null;
  despacho: string | null;
  situacao: string | null;
  url: string | null;
  created_at: string;
}

function mapStatusToKanban(status: string | null): string {
  if (!status) return "nova";
  const s = status.toLowerCase();
  if (s.includes("apresentada")) return "nova";
  if (s.includes("tramitação") || s.includes("tramitando")) return "encaminhada";
  if (s.includes("análise") || s.includes("comissão") || s.includes("parecer") || s.includes("pauta") || s.includes("designação")) return "analise";
  if (s.includes("aprovada")) return "resolvida";
  if (s.includes("arquivada") || s.includes("rejeitada")) return "resolvida";
  return "nova";
}

export function useProposicoes() {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["proposicoes", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proposicoes")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("ultima_atualizacao", { ascending: false });
      if (error) throw error;
      return data as unknown as Proposicao[];
    },
    enabled: !!tenantId,
  });

  const addToKanban = useMutation({
    mutationFn: async (prop: Proposicao) => {
      const col = mapStatusToKanban(prop.status_proposicao);
      // Create demanda card with correct column based on status
      const { data: demanda, error: demandaError } = await supabase
        .from("demandas")
        .insert({
          title: `${prop.tipo} ${prop.numero}/${prop.ano}`,
          description: prop.ementa || "",
          city: "Brasília",
          col,
          priority: "Média",
          origin: "proposicao",
          tenant_id: tenantId,
        })
        .select("id")
        .single();
      if (demandaError) throw demandaError;

      // Link proposition to demanda
      const { error: linkError } = await supabase
        .from("proposicoes")
        .update({
          adicionado_kanban: true,
          demanda_id: demanda.id,
        })
        .eq("id", prop.id);
      if (linkError) throw linkError;

      return demanda;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposicoes"] });
      queryClient.invalidateQueries({ queryKey: ["demandas"] });
    },
  });

  const syncNow = useMutation({
    mutationFn: async () => {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await supabase.functions.invoke("sync-proposicoes");
      if (res.error) throw res.error;
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposicoes"] });
    },
  });

  return { ...query, addToKanban, syncNow };
}

export function useTramitacoes(proposicaoId: string | null) {
  return useQuery({
    queryKey: ["tramitacoes", proposicaoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proposicao_tramitacoes")
        .select("*")
        .eq("proposicao_id", proposicaoId!)
        .order("sequencia", { ascending: false });
      if (error) throw error;
      return data as unknown as Tramitacao[];
    },
    enabled: !!proposicaoId,
  });
}
