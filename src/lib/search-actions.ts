import {
  LayoutDashboard, KanbanSquare, Users, UserCheck, MapPin, Map as MapIcon,
  Landmark, ScrollText, Tv, CalendarDays, FileText, MessageCircle, Megaphone,
  Settings, Plus,
} from "lucide-react";

export interface QuickAction {
  id: string;
  label: string;
  hint?: string;
  module: string; // permission gate
  icon: any;
  /** Either navigate to a route, or open a target page with `?new=1` to trigger create dialog. */
  to: string;
  kind: "navigate" | "create";
}

/** Static quick-actions shown when the search box is empty or no results found. */
export const QUICK_ACTIONS: QuickAction[] = [
  { id: "go-dashboard", label: "Ir para Dashboard", module: "dashboard", icon: LayoutDashboard, to: "/", kind: "navigate" },
  { id: "go-demandas", label: "Abrir Demandas", module: "demandas", icon: KanbanSquare, to: "/demandas", kind: "navigate" },
  { id: "go-liderancas", label: "Abrir Lideranças", module: "liderancas", icon: Users, to: "/liderancas", kind: "navigate" },
  { id: "go-eleitores", label: "Abrir Eleitores", module: "eleitores", icon: UserCheck, to: "/eleitores", kind: "navigate" },
  { id: "go-cidades", label: "Abrir Cidades", module: "cidades", icon: MapPin, to: "/cidades", kind: "navigate" },
  { id: "go-mapa", label: "Abrir Mapa", module: "mapa", icon: MapIcon, to: "/mapa", kind: "navigate" },
  { id: "go-emendas", label: "Abrir Emendas", module: "emendas", icon: Landmark, to: "/emendas", kind: "navigate" },
  { id: "go-proposicoes", label: "Abrir Proposições", module: "proposicoes", icon: ScrollText, to: "/proposicoes", kind: "navigate" },
  { id: "go-mandato", label: "Mandato em Foco", module: "mandato_foco", icon: Tv, to: "/mandato-em-foco", kind: "navigate" },
  { id: "go-agenda", label: "Abrir Agenda", module: "agenda", icon: CalendarDays, to: "/agenda", kind: "navigate" },
  { id: "go-documentos", label: "Abrir Documentos", module: "documentos", icon: FileText, to: "/documentos", kind: "navigate" },
  { id: "go-mensagens", label: "Abrir Mensagens", module: "mensagens", icon: MessageCircle, to: "/mensagens", kind: "navigate" },
  { id: "go-mobilizacao", label: "Mobilização Digital", module: "mobilizacao", icon: Megaphone, to: "/mobilizacao", kind: "navigate" },
  { id: "go-config", label: "Configurações", module: "configuracoes", icon: Settings, to: "/configuracoes", kind: "navigate" },

  { id: "new-demanda", label: "Nova demanda", hint: "Criar", module: "demandas", icon: Plus, to: "/demandas?new=1", kind: "create" },
  { id: "new-lideranca", label: "Nova liderança", hint: "Criar", module: "liderancas", icon: Plus, to: "/liderancas?new=1", kind: "create" },
  { id: "new-eleitor", label: "Novo eleitor", hint: "Criar", module: "eleitores", icon: Plus, to: "/eleitores?new=1", kind: "create" },
  { id: "new-emenda", label: "Nova emenda", hint: "Criar", module: "emendas", icon: Plus, to: "/emendas?new=1", kind: "create" },
  { id: "new-evento", label: "Novo evento na agenda", hint: "Criar", module: "agenda", icon: Plus, to: "/agenda?new=1", kind: "create" },
];
