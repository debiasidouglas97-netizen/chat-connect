import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { LiderancaBase, AtuacaoCidade } from "@/lib/scoring";
import { useTenant } from "@/hooks/use-tenant";
import { usePermissions } from "@/hooks/use-permissions";

export interface LiderancaRow {
  id: string;
  name: string;
  img: string;
  avatar_url: string | null;
  cidade_principal: string;
  cargo: string;
  influencia: string;
  tipo: string;
  engajamento: number;
  atuacao: AtuacaoCidade[];
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  telegram_username: string | null;
  instagram: string | null;
  facebook: string | null;
  youtube: string | null;
  cpf: string | null;
  rg: string | null;
  address_cep: string | null;
  address_street: string | null;
  address_number: string | null;
  address_neighborhood: string | null;
  address_city: string | null;
  address_state: string | null;
  created_at: string;
  updated_at: string;
  classificacao_manual: string | null;
  meta_votos_tipo: string | null;
  meta_votos_valor: number | null;
}

function rowToBase(r: LiderancaRow): LiderancaBase & Record<string, any> {
  return {
    id: r.id,
    name: r.name,
    img: r.img,
    avatar_url: r.avatar_url,
    cidadePrincipal: r.cidade_principal,
    cargo: r.cargo,
    influencia: r.influencia as "Alta" | "Média" | "Baixa",
    tipo: r.tipo as "Eleitoral" | "Comunitária" | "Política",
    engajamento: r.engajamento,
    atuacao: r.atuacao,
    phone: r.phone,
    whatsapp: r.whatsapp,
    email: r.email,
    telegram_username: r.telegram_username,
    instagram: r.instagram,
    facebook: r.facebook,
    youtube: r.youtube,
    cpf: r.cpf,
    rg: r.rg,
    address_cep: r.address_cep,
    address_street: r.address_street,
    address_number: r.address_number,
    address_neighborhood: r.address_neighborhood,
    address_city: r.address_city,
    address_state: r.address_state,
    classificacao_manual: r.classificacao_manual,
    meta_votos_tipo: (r.meta_votos_tipo as "percentual" | "fixo" | null) ?? null,
    meta_votos_valor: r.meta_votos_valor,
  };
}

export function useLiderancas() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  const { isLideranca, linkedLiderancaId } = usePermissions();

  const query = useQuery({
    queryKey: ["liderancas", tenantId, isLideranca ? linkedLiderancaId : "all"],
    queryFn: async () => {
      let q = supabase
        .from("liderancas")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      // Defense-in-depth: lideranças só podem ver a si mesmas
      if (isLideranca) {
        if (!linkedLiderancaId) return [];
        q = q.eq("id", linkedLiderancaId);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data as unknown as LiderancaRow[]).map(rowToBase);
    },
    enabled: !!tenantId && (!isLideranca || !!linkedLiderancaId),
  });

  const insertMutation = useMutation({
    mutationFn: async (l: LiderancaBase & Record<string, any>) => {
      const { error } = await supabase.from("liderancas").insert({
        name: l.name,
        img: l.img,
        avatar_url: l.avatar_url || null,
        cidade_principal: l.cidadePrincipal,
        cargo: l.cargo,
        influencia: l.influencia,
        tipo: l.tipo,
        engajamento: l.engajamento,
        atuacao: l.atuacao as any,
        phone: l.phone || null,
        whatsapp: l.whatsapp || null,
        email: l.email || null,
        telegram_username: l.telegram_username || null,
        instagram: l.instagram || null,
        facebook: l.facebook || null,
        youtube: l.youtube || null,
        cpf: l.cpf || null,
        rg: l.rg || null,
        address_cep: l.address_cep || null,
        address_street: l.address_street || null,
        address_number: l.address_number || null,
        address_neighborhood: l.address_neighborhood || null,
        address_city: l.address_city || null,
        address_state: l.address_state || null,
        meta_votos_tipo: l.meta_votos_tipo || null,
        meta_votos_valor: l.meta_votos_valor ?? null,
        tenant_id: tenantId,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["liderancas"] }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data: l }: { id: string; data: Record<string, any> }) => {
      const payload: Record<string, any> = { updated_at: new Date().toISOString() };
      if (l.name !== undefined) payload.name = l.name;
      if (l.img !== undefined) payload.img = l.img;
      if (l.avatar_url !== undefined) payload.avatar_url = l.avatar_url;
      if (l.cidadePrincipal !== undefined) payload.cidade_principal = l.cidadePrincipal;
      if (l.cargo !== undefined) payload.cargo = l.cargo;
      if (l.influencia !== undefined) payload.influencia = l.influencia;
      if (l.tipo !== undefined) payload.tipo = l.tipo;
      if (l.engajamento !== undefined) payload.engajamento = l.engajamento;
      if (l.atuacao !== undefined) payload.atuacao = l.atuacao;
      if (l.phone !== undefined) payload.phone = l.phone || null;
      if (l.whatsapp !== undefined) payload.whatsapp = l.whatsapp || null;
      if (l.email !== undefined) payload.email = l.email || null;
      if (l.telegram_username !== undefined) payload.telegram_username = l.telegram_username || null;
      if (l.instagram !== undefined) payload.instagram = l.instagram || null;
      if (l.facebook !== undefined) payload.facebook = l.facebook || null;
      if (l.youtube !== undefined) payload.youtube = l.youtube || null;
      if (l.address_cep !== undefined) payload.address_cep = l.address_cep || null;
      if (l.address_street !== undefined) payload.address_street = l.address_street || null;
      if (l.address_number !== undefined) payload.address_number = l.address_number || null;
      if (l.address_neighborhood !== undefined) payload.address_neighborhood = l.address_neighborhood || null;
      if (l.address_city !== undefined) payload.address_city = l.address_city || null;
      if (l.address_state !== undefined) payload.address_state = l.address_state || null;
      if (l.classificacao_manual !== undefined) payload.classificacao_manual = l.classificacao_manual || null;
      if (l.meta_votos_tipo !== undefined) payload.meta_votos_tipo = l.meta_votos_tipo || null;
      if (l.meta_votos_valor !== undefined) payload.meta_votos_valor = l.meta_votos_valor ?? null;
      const { error } = await supabase.from("liderancas").update(payload as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["liderancas"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("liderancas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["liderancas"] }),
  });

  return {
    liderancas: query.data || [],
    isLoading: query.isLoading,
    insert: insertMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
  };
}
