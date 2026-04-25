import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MapPin, Users, FileText, Landmark, Phone, Vote, MapPinned, Calendar, Clock, ChevronDown, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLiderancas } from "@/hooks/use-liderancas";
import { useEventos } from "@/hooks/use-eventos";
import { useDemandas } from "@/hooks/use-demandas";
import { useEmendas } from "@/hooks/use-emendas";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/use-permissions";

interface CidadeDetailDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  cidade: {
    name: string;
    population: string;
    regiao: string;
    demandas: number;
    emendas: number;
    liderancas: number;
    eleitores2024?: number;
  } | null;
}

type SectionKey = "visitas" | "demandas" | "emendas" | null;

const COL_LABELS: Record<string, string> = {
  nova: "Nova",
  andamento: "Em andamento",
  resolvida: "Resolvida",
  arquivada: "Arquivada",
};

function formatDateBR(d: string) {
  if (!d) return "";
  // d may be ISO yyyy-mm-dd or already formatted
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return d;
}

function formatBRL(value: string) {
  if (!value) return "—";
  return value;
}

export default function CidadeDetailDialog({ open, onOpenChange, cidade }: CidadeDetailDialogProps) {
  const navigate = useNavigate();
  const { liderancas } = useLiderancas();
  const { eventos } = useEventos();
  const { demandas } = useDemandas();
  const { emendas } = useEmendas();
  const { isAdmin, isOperator, isLideranca, linkedLiderancaId } = usePermissions();
  const [openSection, setOpenSection] = useState<SectionKey>(null);

  const cityKey = useMemo(() => (cidade?.name || "").split("/")[0].trim().toLowerCase(), [cidade]);

  const cityLiderancas = useMemo(() => {
    if (!cidade) return [];
    return liderancas.filter((l) => {
      const lCity = (l.cidadePrincipal || "").split("/")[0].trim().toLowerCase();
      return lCity === cityKey;
    });
  }, [cidade, liderancas, cityKey]);

  const cityVisitas = useMemo(() => {
    if (!cidade) return [];
    return eventos
      .filter((ev) => {
        const evCity = (ev.cidade || "").split("/")[0].trim().toLowerCase();
        return evCity === cityKey;
      })
      .sort((a, b) => (b.data || "").localeCompare(a.data || ""));
  }, [cidade, eventos, cityKey]);

  const cityDemandas = useMemo(() => {
    if (!cidade) return [];
    return demandas
      .filter((d) => {
        const matchCity = (d.city || "").split("/")[0].trim().toLowerCase() === cityKey;
        const isAgenda = (d.origin || "").toLowerCase() === "agenda";
        return matchCity && !isAgenda;
      })
      .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
  }, [cidade, demandas, cityKey]);

  const cityEmendas = useMemo(() => {
    if (!cidade) return [];
    return emendas
      .filter((e) => (e.cidade || "").split("/")[0].trim().toLowerCase() === cityKey)
      .sort((a, b) => (b.ano || 0) - (a.ano || 0));
  }, [cidade, emendas, cityKey]);

  const estimativaVotos = useMemo(() => {
    if (!cidade) return 0;
    const eleitores = cidade.eleitores2024 || 0;
    let total = 0;
    cityLiderancas.forEach((l: any) => {
      const tipo = l.metaVotosTipo || l.meta_votos_tipo;
      const valor = l.metaVotosValor ?? l.meta_votos_valor;
      if (!tipo || valor === null || valor === undefined) return;
      const v = tipo === "fixo" ? Number(valor) : (eleitores * Number(valor)) / 100;
      if (Number.isFinite(v) && v > 0) total += v;
    });
    return Math.round(total);
  }, [cidade, cityLiderancas]);

  if (!cidade) return null;

  const handleLiderancaClick = (name: string) => {
    onOpenChange(false);
    navigate(`/liderancas?busca=${encodeURIComponent(name)}`);
  };

  const toggleSection = (k: SectionKey) =>
    setOpenSection((prev) => (prev === k ? null : k));

  const populationNum = Number((cidade.population || "").replace(/\./g, "").replace(/,/g, "")) || 0;

  const StatCard = ({
    icon: Icon,
    value,
    label,
    onClick,
    active,
  }: {
    icon: any;
    value: React.ReactNode;
    label: string;
    onClick?: () => void;
    active?: boolean;
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "bg-muted/50 rounded-lg p-3 text-center transition-all",
        onClick && "hover:bg-muted cursor-pointer",
        active && "ring-2 ring-primary bg-primary/5",
        !onClick && "cursor-default"
      )}
    >
      <Icon className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
      <p className="text-lg font-bold text-foreground leading-tight">{value}</p>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{label}</p>
      {onClick && (
        <ChevronDown
          className={cn(
            "h-3 w-3 mx-auto mt-1 text-muted-foreground transition-transform",
            active && "rotate-180 text-primary"
          )}
        />
      )}
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <MapPin className="h-6 w-6 text-primary" />
            <div>
              <DialogTitle className="text-xl font-bold">{cidade.name}</DialogTitle>
              <p className="text-sm text-muted-foreground">{cidade.regiao}</p>
            </div>
          </div>
        </DialogHeader>

        {/* Stats — 6 simétricos em grid 3x2 */}
        <div className="grid grid-cols-3 gap-3 mt-2">
          <StatCard
            icon={Users}
            label="População"
            value={populationNum > 0 ? populationNum.toLocaleString("pt-BR") : "N/D"}
          />
          <StatCard
            icon={Vote}
            label="Eleitores 2024"
            value={cidade.eleitores2024 && cidade.eleitores2024 > 0 ? cidade.eleitores2024.toLocaleString("pt-BR") : "—"}
          />
          <StatCard
            icon={MapPinned}
            label="Visitas"
            value={cityVisitas.length}
            onClick={cityVisitas.length > 0 ? () => toggleSection("visitas") : undefined}
            active={openSection === "visitas"}
          />
          <StatCard
            icon={FileText}
            label="Demandas"
            value={cityDemandas.length || cidade.demandas}
            onClick={cityDemandas.length > 0 ? () => toggleSection("demandas") : undefined}
            active={openSection === "demandas"}
          />
          <StatCard
            icon={Landmark}
            label="Emendas"
            value={cityEmendas.length || cidade.emendas}
            onClick={cityEmendas.length > 0 ? () => toggleSection("emendas") : undefined}
            active={openSection === "emendas"}
          />
          <StatCard icon={Users} label="Lideranças" value={cityLiderancas.length} />
        </div>

        {/* Estimativa de votos — destaque */}
        <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Estimativa de votos
              </p>
              <p className="text-[10px] text-muted-foreground">
                Soma das metas das lideranças vinculadas
              </p>
            </div>
          </div>
          <p className="text-xl font-bold text-primary">
            {estimativaVotos > 0 ? estimativaVotos.toLocaleString("pt-BR") : "—"}
          </p>
        </div>

        {/* Lista expandida — Visitas */}
        {openSection === "visitas" && (
          <div className="mt-4 border rounded-lg p-3 bg-card animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2 mb-3">
              <MapPinned className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">Visitas realizadas / agendadas ({cityVisitas.length})</h3>
            </div>
            <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
              {cityVisitas.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => {
                    onOpenChange(false);
                    navigate(`/agenda?evento=${encodeURIComponent(v.id)}`);
                  }}
                  className="w-full text-left p-3 rounded-lg border bg-background hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-sm text-foreground">{v.titulo}</p>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {v.status || "Confirmado"}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {formatDateBR(v.data)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {v.dia_inteiro ? "Dia inteiro" : `${v.hora}${v.hora_fim ? ` – ${v.hora_fim}` : ""}`}
                    </span>
                    {v.local_nome && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {v.local_nome}
                      </span>
                    )}
                  </div>
                  {v.endereco && (
                    <p className="text-xs text-muted-foreground mt-1">{v.endereco}</p>
                  )}
                  {v.description && (
                    <p className="text-xs text-foreground/80 mt-2 line-clamp-2">{v.description}</p>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Lista expandida — Demandas */}
        {openSection === "demandas" && (
          <div className="mt-4 border rounded-lg p-3 bg-card animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">Demandas ({cityDemandas.length})</h3>
            </div>
            <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
              {cityDemandas.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    onOpenChange(false);
                    navigate(`/demandas?busca=${encodeURIComponent(d.title)}`);
                  }}
                  className="w-full text-left p-3 rounded-lg border bg-background hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-sm text-foreground">{d.title}</p>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {COL_LABELS[d.col] || d.col}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
                    <span>Prioridade: {d.priority}</span>
                    {d.responsible && <span>Responsável: {d.responsible}</span>}
                    {d.created_at && <span>{formatDateBR(d.created_at.slice(0, 10))}</span>}
                  </div>
                  {d.description && (
                    <p className="text-xs text-foreground/80 mt-2 line-clamp-2">{d.description}</p>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Lista expandida — Emendas */}
        {openSection === "emendas" && (
          <div className="mt-4 border rounded-lg p-3 bg-card animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2 mb-3">
              <Landmark className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">Emendas ({cityEmendas.length})</h3>
            </div>
            <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
              {cityEmendas.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => {
                    onOpenChange(false);
                    navigate(`/emendas`);
                  }}
                  className="w-full text-left p-3 rounded-lg border bg-background hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-sm text-foreground">
                      {e.titulo || `Emenda ${e.tipo}`}
                    </p>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {e.status}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
                    <span>Tipo: {e.tipo}</span>
                    <span className="font-semibold text-foreground">{formatBRL(e.valor)}</span>
                    <span>Ano: {e.ano}</span>
                  </div>
                  {e.descricao && (
                    <p className="text-xs text-foreground/80 mt-2 line-clamp-2">{e.descricao}</p>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Lideranças — sempre visível */}
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm text-foreground">
              Lideranças ({cityLiderancas.length})
            </h3>
          </div>

          {cityLiderancas.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma liderança cadastrada nesta cidade
            </p>
          ) : (
            <div className="space-y-2 max-h-[35vh] overflow-y-auto pr-1">
              {cityLiderancas.map((l) => (
                <button
                  key={(l as any).id}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors text-left group"
                  onClick={() => handleLiderancaClick(l.name)}
                >
                  <Avatar className="h-10 w-10 border border-primary/20">
                    {l.avatar_url && <AvatarImage src={l.avatar_url} className="object-cover" />}
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                      {l.img}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground group-hover:text-primary transition-colors truncate">
                      {l.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{(l as any).cargo || "Liderança"}</p>
                  </div>
                  {(l as any).phone && (() => {
                    const isOwn = (l as any).id === linkedLiderancaId;
                    const canSee = isAdmin || isOperator || (isLideranca && isOwn);
                    return (
                      <Badge variant="outline" className="text-[10px] gap-1 shrink-0">
                        <Phone className="h-3 w-3" />
                        {canSee ? (l as any).phone : "••••••••"}
                      </Badge>
                    );
                  })()}
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
