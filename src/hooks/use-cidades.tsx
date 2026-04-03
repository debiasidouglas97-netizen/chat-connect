import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CidadeBase } from "@/lib/scoring";
import { useTenant } from "@/hooks/use-tenant";

interface CidadeRow {
  id: string;
  name: string;
  population: string;
  peso: number;
  regiao: string;
  demandas: number;
  demandas_resolvidas: number;
  comunicacao_recente: boolean;
  presenca_deputado: boolean;
  engajamento: number;
  liderancas: number;
  emendas: number;
  votos_2022: number;
  tenant_id: string | null;
}

function rowToBase(r: CidadeRow): CidadeBase & { id: string } {
  return {
    id: r.id,
    name: r.name,
    population: r.population,
    peso: r.peso,
    regiao: r.regiao,
    demandas: r.demandas,
    demandasResolvidas: r.demandas_resolvidas,
    comunicacaoRecente: r.comunicacao_recente,
    presencaDeputado: r.presenca_deputado,
    engajamento: r.engajamento,
    liderancas: r.liderancas,
    emendas: r.emendas,
    votos2022: r.votos_2022,
  };
}

export function useCidades() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();

  const query = useQuery({
    queryKey: ["cidades", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cidades")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("name");
      if (error) throw error;
      return (data as unknown as CidadeRow[]).map(rowToBase);
    },
    enabled: !!tenantId,
  });

  const insertMutation = useMutation({
    mutationFn: async (c: CidadeBase) => {
      const { error } = await supabase.from("cidades").insert({
        name: c.name,
        population: c.population,
        peso: c.peso,
        regiao: c.regiao,
        demandas: c.demandas,
        demandas_resolvidas: c.demandasResolvidas,
        comunicacao_recente: c.comunicacaoRecente,
        presenca_deputado: c.presencaDeputado,
        engajamento: c.engajamento,
        liderancas: c.liderancas,
        emendas: c.emendas,
        tenant_id: tenantId,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cidades"] }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data: c }: { id: string; data: CidadeBase }) => {
      const { error } = await supabase.from("cidades").update({
        name: c.name,
        population: c.population,
        peso: c.peso,
        regiao: c.regiao,
        demandas: c.demandas,
        demandas_resolvidas: c.demandasResolvidas,
        comunicacao_recente: c.comunicacaoRecente,
        presenca_deputado: c.presencaDeputado,
        engajamento: c.engajamento,
        liderancas: c.liderancas,
        emendas: c.emendas,
        updated_at: new Date().toISOString(),
      } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cidades"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cidades").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cidades"] }),
  });

  return {
    cidades: query.data || [],
    isLoading: query.isLoading,
    insert: insertMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
  };
}
