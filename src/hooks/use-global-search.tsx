import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { usePermissions } from "@/hooks/use-permissions";
import {
  Users, UserCheck, MapPin, KanbanSquare, Landmark, ScrollText,
  CalendarDays, Megaphone, FileText, User as UserIcon,
} from "lucide-react";

export type SearchCategory =
  | "liderancas" | "eleitores" | "cidades" | "demandas" | "emendas"
  | "proposicoes" | "agenda" | "mobilizacao" | "documentos" | "usuarios";

export interface SearchResult {
  id: string;
  category: SearchCategory;
  title: string;
  subtitle?: string;
  /** Resolved navigation target. Pages read `?open=<id>` to open detail dialogs. */
  to: string;
  icon: any;
}

const PER_CAT_LIMIT = 6;

const CAT_META: Record<SearchCategory, { label: string; module: string; icon: any }> = {
  liderancas:  { label: "Lideranças",   module: "liderancas",  icon: Users },
  eleitores:   { label: "Eleitores",    module: "eleitores",   icon: UserCheck },
  cidades:     { label: "Cidades",      module: "cidades",     icon: MapPin },
  demandas:    { label: "Demandas",     module: "demandas",    icon: KanbanSquare },
  emendas:     { label: "Emendas",      module: "emendas",     icon: Landmark },
  proposicoes: { label: "Proposições",  module: "proposicoes", icon: ScrollText },
  agenda:      { label: "Agenda",       module: "agenda",      icon: CalendarDays },
  mobilizacao: { label: "Mobilizações", module: "mobilizacao", icon: Megaphone },
  documentos:  { label: "Documentos",   module: "documentos",  icon: FileText },
  usuarios:    { label: "Usuários",     module: "configuracoes", icon: UserIcon },
};

export function getCategoryLabel(c: SearchCategory) { return CAT_META[c].label; }
export function getCategoryIcon(c: SearchCategory) { return CAT_META[c].icon; }

function useDebounced<T>(value: T, ms = 250): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function useGlobalSearch(rawQuery: string) {
  const query = useDebounced(rawQuery.trim(), 250);
  const { tenantId } = useTenant();
  const { can } = usePermissions();

  const enabled = !!tenantId && query.length >= 2;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["global-search", tenantId, query],
    enabled,
    queryFn: async (): Promise<SearchResult[]> => {
      const like = `%${query}%`;
      const sb: any = supabase;
      const tasks: Promise<SearchResult[]>[] = [];

      if (can("liderancas", "view")) {
        tasks.push(
          sb.from("liderancas")
            .select("id, name, cargo, cidade_principal, whatsapp")
            .eq("tenant_id", tenantId)
            .or(`name.ilike.${like},cidade_principal.ilike.${like},cargo.ilike.${like},whatsapp.ilike.${like}`)
            .limit(PER_CAT_LIMIT)
            .then(({ data }: any) => (data || []).map((r: any) => ({
              id: r.id, category: "liderancas" as const,
              title: r.name,
              subtitle: [r.cargo, r.cidade_principal].filter(Boolean).join(" • "),
              to: `/liderancas?open=${r.id}`,
              icon: CAT_META.liderancas.icon,
            })))
        );
      }

      if (can("eleitores", "view")) {
        tasks.push(
          sb.from("eleitores")
            .select("id, nome, cidade, whatsapp, email")
            .eq("tenant_id", tenantId)
            .or(`nome.ilike.${like},cidade.ilike.${like},whatsapp.ilike.${like},email.ilike.${like}`)
            .limit(PER_CAT_LIMIT)
            .then(({ data }: any) => (data || []).map((r: any) => ({
              id: r.id, category: "eleitores" as const,
              title: r.nome,
              subtitle: [r.cidade, r.whatsapp || r.email].filter(Boolean).join(" • "),
              to: `/eleitores?open=${r.id}`,
              icon: CAT_META.eleitores.icon,
            })))
        );
      }

      if (can("cidades", "view")) {
        tasks.push(
          sb.from("cidades")
            .select("id, name, regiao, population")
            .eq("tenant_id", tenantId)
            .or(`name.ilike.${like},regiao.ilike.${like}`)
            .limit(PER_CAT_LIMIT)
            .then(({ data }: any) => (data || []).map((r: any) => ({
              id: r.id, category: "cidades" as const,
              title: r.name,
              subtitle: [r.regiao, r.population].filter(Boolean).join(" • "),
              to: `/cidades?open=${r.id}`,
              icon: CAT_META.cidades.icon,
            })))
        );
      }

      if (can("demandas", "view")) {
        tasks.push(
          sb.from("demandas")
            .select("id, title, city, col, description, creator_name")
            .or(`title.ilike.${like},city.ilike.${like},description.ilike.${like},creator_name.ilike.${like}`)
            .limit(PER_CAT_LIMIT)
            .then(({ data }: any) => (data || []).map((r: any) => ({
              id: r.id, category: "demandas" as const,
              title: r.title,
              subtitle: [r.city, r.col].filter(Boolean).join(" • "),
              to: `/demandas?open=${r.id}`,
              icon: CAT_META.demandas.icon,
            })))
        );
      }

      if (can("emendas", "view")) {
        tasks.push(
          sb.from("emendas")
            .select("id, titulo, tipo, cidade, valor, ano")
            .or(`titulo.ilike.${like},cidade.ilike.${like},descricao.ilike.${like},objetivo_politico.ilike.${like}`)
            .limit(PER_CAT_LIMIT)
            .then(({ data }: any) => (data || []).map((r: any) => ({
              id: r.id, category: "emendas" as const,
              title: r.titulo || `Emenda ${r.tipo} ${r.ano}`,
              subtitle: [r.cidade, r.valor].filter(Boolean).join(" • "),
              to: `/emendas?open=${r.id}`,
              icon: CAT_META.emendas.icon,
            })))
        );
      }

      if (can("proposicoes", "view")) {
        tasks.push(
          sb.from("proposicoes")
            .select("id, tipo, numero, ano, ementa, autor")
            .eq("tenant_id", tenantId)
            .or(`ementa.ilike.${like},autor.ilike.${like},tema.ilike.${like}`)
            .limit(PER_CAT_LIMIT)
            .then(({ data }: any) => (data || []).map((r: any) => ({
              id: r.id, category: "proposicoes" as const,
              title: `${r.tipo} ${r.numero}/${r.ano}`,
              subtitle: r.ementa?.slice(0, 90),
              to: `/proposicoes?open=${r.id}`,
              icon: CAT_META.proposicoes.icon,
            })))
        );
      }

      if (can("agenda", "view")) {
        tasks.push(
          sb.from("eventos")
            .select("id, titulo, cidade, data, local_nome")
            .or(`titulo.ilike.${like},cidade.ilike.${like},local_nome.ilike.${like},description.ilike.${like}`)
            .limit(PER_CAT_LIMIT)
            .then(({ data }: any) => (data || []).map((r: any) => ({
              id: r.id, category: "agenda" as const,
              title: r.titulo,
              subtitle: [r.data, r.cidade, r.local_nome].filter(Boolean).join(" • "),
              to: `/agenda?open=${r.id}`,
              icon: CAT_META.agenda.icon,
            })))
        );
      }

      if (can("mobilizacao", "view")) {
        tasks.push(
          sb.from("mobilizacoes")
            .select("id, titulo, tipo, mensagem")
            .eq("tenant_id", tenantId)
            .or(`titulo.ilike.${like},mensagem.ilike.${like}`)
            .limit(PER_CAT_LIMIT)
            .then(({ data }: any) => (data || []).map((r: any) => ({
              id: r.id, category: "mobilizacao" as const,
              title: r.titulo,
              subtitle: r.tipo,
              to: `/mobilizacao?open=${r.id}`,
              icon: CAT_META.mobilizacao.icon,
            })))
        );
      }

      if (can("documentos", "view")) {
        tasks.push(
          sb.from("documentos_manuais")
            .select("id, titulo, file_name")
            .eq("tenant_id", tenantId)
            .or(`titulo.ilike.${like},file_name.ilike.${like}`)
            .limit(PER_CAT_LIMIT)
            .then(({ data }: any) => (data || []).map((r: any) => ({
              id: r.id, category: "documentos" as const,
              title: r.titulo || r.file_name,
              subtitle: r.file_name,
              to: `/documentos?open=${r.id}`,
              icon: CAT_META.documentos.icon,
            })))
        );
      }

      if (can("configuracoes", "view")) {
        tasks.push(
          sb.from("profiles")
            .select("id, full_name, email, username")
            .eq("tenant_id", tenantId)
            .or(`full_name.ilike.${like},email.ilike.${like},username.ilike.${like}`)
            .limit(PER_CAT_LIMIT)
            .then(({ data }: any) => (data || []).map((r: any) => ({
              id: r.id, category: "usuarios" as const,
              title: r.full_name,
              subtitle: [r.username, r.email].filter(Boolean).join(" • "),
              to: `/configuracoes?tab=usuarios&open=${r.id}`,
              icon: CAT_META.usuarios.icon,
            })))
        );
      }

      const settled = await Promise.allSettled(tasks);
      const all: SearchResult[] = [];
      settled.forEach((s) => { if (s.status === "fulfilled") all.push(...s.value); });

      // Relevance: title startsWith query > title includes > subtitle includes
      const q = query.toLowerCase();
      all.sort((a, b) => score(b, q) - score(a, q));
      return all;
    },
  });

  return {
    query,
    results: data || [],
    isLoading: enabled && (isLoading || isFetching),
    enabled,
  };
}

function score(r: SearchResult, q: string): number {
  const t = (r.title || "").toLowerCase();
  const s = (r.subtitle || "").toLowerCase();
  if (t === q) return 100;
  if (t.startsWith(q)) return 80;
  if (t.includes(q)) return 60;
  if (s.includes(q)) return 30;
  return 0;
}
