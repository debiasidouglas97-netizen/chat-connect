import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  FileText, Users, MapPin, Landmark, AlertTriangle, TrendingUp,
  Plus, Calendar, Zap,
  ArrowRight, CheckCircle2, Flame, Snowflake,
} from "lucide-react";
import { calcularScoreCidade, canViewRanking, type UserRole } from "@/lib/scoring";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useDeputyProfile } from "@/hooks/use-deputy-profile";
import { useCidades } from "@/hooks/use-cidades";
import { useEmendas } from "@/hooks/use-emendas";
import { useDemandas } from "@/hooks/use-demandas";
import { useLiderancas } from "@/hooks/use-liderancas";
import { useEventos } from "@/hooks/use-eventos";
import { NovaDemandaDialog } from "@/components/demandas/NovaDemandaDialog";
import NovaLiderancaDialog from "@/components/liderancas/NovaLiderancaDialog";
import NovoEventoDialog from "@/components/agenda/NovoEventoDialog";
import CidadeFormDialog from "@/components/cidades/CidadeFormDialog";
import type { Demanda } from "@/components/demandas/types";

const CURRENT_ROLE: UserRole = "deputado";

const opportunities = [
  { type: "warning", icon: AlertTriangle, text: "Guarujá está sem comunicação há 20 dias", action: "Agendar visita" },
  { type: "success", icon: Landmark, text: "Nova emenda de R$ 3M liberada para Santos", action: "Ver detalhes" },
  { type: "destructive", icon: FileText, text: "Peruíbe com baixa atuação — risco de perda de base", action: "Agir agora" },
  { type: "info", icon: Users, text: "Bauru possui alta atividade — oportunidade de reforço", action: "Entrar em contato" },
  { type: "warning", icon: AlertTriangle, text: "Itanhaém sem presença do deputado há 30 dias", action: "Planejar visita" },
];

const statusConfig = {
  alta: { icon: Flame, label: "Alta Prioridade", className: "bg-success/10 text-success border-success/20" },
  atencao: { icon: AlertTriangle, label: "Atenção", className: "bg-warning/10 text-warning border-warning/20" },
  baixa: { icon: Snowflake, label: "Baixa Atuação", className: "bg-info/10 text-info border-info/20" },
};

const kpis = [
  { label: "Demandas Abertas", value: 52, icon: FileText, change: "+5 esta semana", bg: "bg-[hsl(48_80%_92%)]", iconBg: "bg-[hsl(48_80%_85%)]", iconColor: "text-[hsl(48_80%_35%)]" },
  { label: "Demandas Resolvidas", value: 143, icon: CheckCircle2, change: "+18 este mês", bg: "bg-[hsl(145_50%_92%)]", iconBg: "bg-[hsl(145_50%_85%)]", iconColor: "text-[hsl(145_50%_35%)]" },
];

export default function Index() {
  const { profile } = useDeputyProfile();
  const { cidades: cidadesRaw, insert: insertCidade } = useCidades();
  const { emendas } = useEmendas();
  const { insert: insertDemanda } = useDemandas();
  const { insert: insertLideranca } = useLiderancas();
  const { insert: insertEvento } = useEventos();
  const navigate = useNavigate();

  const [demandaOpen, setDemandaOpen] = useState(false);
  const [liderancaOpen, setLiderancaOpen] = useState(false);
  const [eventoOpen, setEventoOpen] = useState(false);
  const [cidadeOpen, setCidadeOpen] = useState(false);

  const cidadesComScore = useMemo(
    () => cidadesRaw.map(calcularScoreCidade).sort((a, b) => b.score - a.score),
    [cidadesRaw]
  );

  const totalCidades = cidadesRaw.length;
  const totalPopulacao = useMemo(() => {
    const total = cidadesRaw.reduce((sum, c) => {
      const num = parseInt(c.population.replace(/\D/g, ""), 10);
      return sum + (isNaN(num) ? 0 : num);
    }, 0);
    if (total >= 1_000_000) return `${(total / 1_000_000).toFixed(1).replace(".", ",")}M hab.`;
    if (total >= 1_000) return `${(total / 1_000).toFixed(0)}mil hab.`;
    return `${total} hab.`;
  }, [cidadesRaw]);

  const totalEmendas = emendas.length;
  const totalValorEmendas = useMemo(() => {
    const total = emendas.reduce((sum, e) => {
      const num = parseFloat(e.valor.replace(/[R$\s.]/g, "").replace(",", "."));
      return sum + (isNaN(num) ? 0 : num);
    }, 0);
    if (total >= 1_000_000) return `R$ ${(total / 1_000_000).toFixed(1).replace(".", ",")}M total`;
    if (total >= 1_000) return `R$ ${(total / 1_000).toFixed(0)}mil total`;
    return `R$ ${total.toFixed(0)} total`;
  }, [emendas]);

  const showRanking = canViewRanking(CURRENT_ROLE);

  const displayName = profile?.public_name || profile?.full_name || "Dep. Antonio Carlos Rodrigues";
  const party = profile?.party || "PL";
  const state = profile?.state || "São Paulo";
  const bio = profile?.bio || "Atuante na Baixada Santista e Região de Bauru — saúde, educação e infraestrutura";
  const initials = (profile?.full_name || "AC")
    .split(" ")
    .filter((w) => w.length > 2)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const handleSaveDemanda = async (demanda: Demanda) => {
    if (addDemanda) await addDemanda(demanda);
  };

  const handleAddLideranca = async (l: any) => {
    if (addLideranca) await addLideranca(l);
  };

  const handleSaveEvento = async (data: any) => {
    if (addEvento) await addEvento(data);
  };

  const handleSaveCidade = async (c: any) => {
    await insertCidade(c);
  };

  const quickActions = [
    { label: "Nova Demanda", icon: Plus, onClick: () => setDemandaOpen(true), bg: "bg-[hsl(48_60%_95%)]", hoverBg: "hover:bg-[hsl(48_60%_90%)]", iconColor: "text-[hsl(48_70%_40%)]" },
    { label: "Nova Liderança", icon: Users, onClick: () => setLiderancaOpen(true), bg: "bg-[hsl(210_50%_95%)]", hoverBg: "hover:bg-[hsl(210_50%_90%)]", iconColor: "text-[hsl(210_50%_40%)]" },
    { label: "Registrar Visita", icon: Calendar, onClick: () => setEventoOpen(true), bg: "bg-[hsl(145_40%_95%)]", hoverBg: "hover:bg-[hsl(145_40%_90%)]", iconColor: "text-[hsl(145_40%_35%)]" },
    { label: "Adicionar Cidade", icon: MapPin, onClick: () => setCidadeOpen(true), bg: "bg-[hsl(280_40%_95%)]", hoverBg: "hover:bg-[hsl(280_40%_90%)]", iconColor: "text-[hsl(280_40%_40%)]" },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Deputy Profile */}
      <div className="flex items-center gap-5">
        <Avatar className="h-16 w-16 border-2 border-primary">
          {profile?.avatar_url ? (
            <AvatarImage src={profile.avatar_url} alt={displayName} className="object-cover" />
          ) : null}
          <AvatarFallback className="text-xl font-bold bg-primary/10 text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{displayName}</h1>
          <div className="flex items-center gap-3 mt-1">
            <Badge variant="outline" className="text-xs">{party}</Badge>
            <span className="text-sm text-muted-foreground">Deputado Federal — {state}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{bio}</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className={`hover:shadow-md transition-shadow border-0 ${kpi.bg}`}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{kpi.label}</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{kpi.change}</p>
                </div>
                <div className={`h-11 w-11 rounded-lg ${kpi.iconBg} flex items-center justify-center`}>
                  <kpi.icon className={`h-5 w-5 ${kpi.iconColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        <Card className="hover:shadow-md transition-shadow border-0 bg-[hsl(210_60%_92%)] cursor-pointer" onClick={() => navigate("/emendas")}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Emendas Cadastradas</p>
                <p className="text-3xl font-bold text-foreground mt-1">{totalEmendas}</p>
                <p className="text-xs text-muted-foreground mt-1">{totalValorEmendas}</p>
              </div>
              <div className="h-11 w-11 rounded-lg bg-[hsl(210_60%_85%)] flex items-center justify-center">
                <Landmark className="h-5 w-5 text-[hsl(210_60%_35%)]" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow border-0 bg-[hsl(145_50%_92%)] cursor-pointer" onClick={() => navigate("/cidades")}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Cidades Atendidas</p>
                <p className="text-3xl font-bold text-foreground mt-1">{totalCidades}</p>
                <p className="text-xs text-muted-foreground mt-1">{totalPopulacao}</p>
              </div>
              <div className="h-11 w-11 rounded-lg bg-[hsl(145_50%_85%)] flex items-center justify-center">
                <MapPin className="h-5 w-5 text-[hsl(145_50%_35%)]" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Opportunities */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Oportunidades do Dia
                </CardTitle>
                <Badge variant="secondary" className="text-xs">{opportunities.length} alertas</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {opportunities.map((opp, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${
                      opp.type === "warning" ? "bg-warning/10" :
                      opp.type === "success" ? "bg-success/10" :
                      opp.type === "destructive" ? "bg-destructive/10" : "bg-info/10"
                    }`}>
                      <opp.icon className={`h-4 w-4 ${
                        opp.type === "warning" ? "text-warning" :
                        opp.type === "success" ? "text-success" :
                        opp.type === "destructive" ? "text-destructive" : "text-info"
                      }`} />
                    </div>
                    <p className="text-sm text-foreground">{opp.text}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="text-primary text-xs shrink-0">
                    {opp.action}
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Ações Rápidas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={action.onClick}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-transparent ${action.bg} ${action.hoverBg} transition-colors text-left`}
              >
                <action.icon className={`h-4 w-4 ${action.iconColor}`} />
                <span className="text-sm font-medium text-foreground">{action.label}</span>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* City Ranking */}
      {showRanking && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Ranking de Cidades
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs text-primary" onClick={() => navigate("/cidades")}>
                Ver todas <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {cidadesComScore.map((city, i) => {
                const cfg = statusConfig[city.status];
                return (
                  <div key={city.name} className="flex items-center gap-4 p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                    <div className="text-lg font-bold text-muted-foreground w-6 text-center">{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground">{city.name}</span>
                        <Badge variant="outline" className={`text-[10px] ${cfg.className}`}>
                          <cfg.icon className="h-3 w-3 mr-1" />
                          {cfg.label}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">{city.regiao}</Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-xs text-muted-foreground">Pop: {city.population}</span>
                        <span className="text-xs text-muted-foreground">{city.demandas} demandas</span>
                        <span className="text-xs text-muted-foreground">{city.emendas} emendas</span>
                      </div>
                    </div>
                    <div className="w-32 flex items-center gap-2">
                      <Progress value={city.score} className="h-2" />
                      <span className="text-sm font-semibold text-foreground w-8 text-right">{city.score}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <NovaDemandaDialog open={demandaOpen} onOpenChange={setDemandaOpen} onSave={handleSaveDemanda} />
      <NovaLiderancaDialog open={liderancaOpen} onOpenChange={setLiderancaOpen} onAdd={handleAddLideranca} />
      <NovoEventoDialog open={eventoOpen} onOpenChange={setEventoOpen} onSave={handleSaveEvento} />
      <CidadeFormDialog
        open={cidadeOpen}
        onOpenChange={setCidadeOpen}
        onSave={handleSaveCidade}
        onBatchSave={async (cities) => { for (const c of cities) await insertCidade(c); }}
      />
    </div>
  );
}
