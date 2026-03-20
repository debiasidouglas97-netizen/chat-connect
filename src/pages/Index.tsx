import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  FileText, Users, MapPin, Landmark, AlertTriangle, TrendingUp,
  Plus, Calendar, MessageSquare, Flame, Snowflake, Zap,
  ArrowRight, CheckCircle2,
} from "lucide-react";
import { cidadesData } from "@/lib/mock-data";
import { calcularScoreCidade, canViewRanking, type UserRole } from "@/lib/scoring";
import { useMemo } from "react";

// Simulated current role — will be replaced by real auth
const CURRENT_ROLE: UserRole = "deputado";

const kpis = [
  { label: "Demandas Abertas", value: 52, icon: FileText, change: "+5 esta semana" },
  { label: "Demandas Resolvidas", value: 143, icon: CheckCircle2, change: "+18 este mês" },
  { label: "Emendas Cadastradas", value: 9, icon: Landmark, change: "R$ 10,0M total" },
  { label: "Cidades Atendidas", value: 12, icon: MapPin, change: "2 regiões de foco" },
];

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

export default function Index() {
  const cidadesComScore = useMemo(
    () => cidadesData.map(calcularScoreCidade).sort((a, b) => b.score - a.score),
    []
  );

  const showRanking = canViewRanking(CURRENT_ROLE);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Deputy Profile */}
      <div className="flex items-center gap-5">
        <div className="h-16 w-16 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center">
          <span className="text-xl font-bold text-primary">AC</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dep. Antonio Carlos Rodrigues</h1>
          <div className="flex items-center gap-3 mt-1">
            <Badge variant="outline" className="text-xs">PL</Badge>
            <span className="text-sm text-muted-foreground">Deputado Federal — São Paulo</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Atuante na Baixada Santista e Região de Bauru — saúde, educação e infraestrutura
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{kpi.label}</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{kpi.change}</p>
                </div>
                <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center">
                  <kpi.icon className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
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
            <Button className="w-full justify-start gap-2" variant="outline">
              <Plus className="h-4 w-4" /> Nova Demanda
            </Button>
            <Button className="w-full justify-start gap-2" variant="outline">
              <Users className="h-4 w-4" /> Nova Liderança
            </Button>
            <Button className="w-full justify-start gap-2" variant="outline">
              <Calendar className="h-4 w-4" /> Registrar Visita
            </Button>
            <Button className="w-full justify-start gap-2" variant="outline">
              <MessageSquare className="h-4 w-4" /> Enviar Mensagem
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* City Ranking — only for authorized roles */}
      {showRanking && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Ranking de Cidades
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs text-primary">
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
    </div>
  );
}
