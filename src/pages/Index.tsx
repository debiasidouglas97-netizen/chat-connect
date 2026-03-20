import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  FileText,
  Users,
  MapPin,
  Landmark,
  AlertTriangle,
  TrendingUp,
  Plus,
  Calendar,
  MessageSquare,
  Flame,
  Snowflake,
  Zap,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

const kpis = [
  { label: "Demandas Abertas", value: 47, icon: FileText, change: "+3 esta semana" },
  { label: "Demandas Resolvidas", value: 128, icon: CheckCircle2, change: "+12 este mês" },
  { label: "Emendas Cadastradas", value: 23, icon: Landmark, change: "R$ 14,2M total" },
  { label: "Cidades Atendidas", value: 38, icon: MapPin, change: "de 52 no estado" },
];

const opportunities = [
  {
    type: "warning",
    icon: AlertTriangle,
    text: "Cidade de Uberaba sem comunicação há 15 dias",
    action: "Agendar visita",
  },
  {
    type: "success",
    icon: Landmark,
    text: "Nova emenda de R$ 500K aprovada para Uberlândia",
    action: "Ver detalhes",
  },
  {
    type: "destructive",
    icon: FileText,
    text: "3 demandas paradas há mais de 30 dias",
    action: "Resolver agora",
  },
  {
    type: "info",
    icon: Users,
    text: "Liderança José Silva com alta atividade esta semana",
    action: "Entrar em contato",
  },
];

const cityRanking = [
  { name: "Uberlândia", score: 92, status: "alta", population: "699K", demandas: 12, emendas: 5 },
  { name: "Uberaba", score: 45, status: "atencao", population: "337K", demandas: 8, emendas: 2 },
  { name: "Araguari", score: 78, status: "alta", population: "117K", demandas: 5, emendas: 3 },
  { name: "Ituiutaba", score: 33, status: "baixa", population: "105K", demandas: 2, emendas: 1 },
  { name: "Patrocínio", score: 61, status: "atencao", population: "92K", demandas: 4, emendas: 2 },
  { name: "Monte Carmelo", score: 25, status: "baixa", population: "48K", demandas: 1, emendas: 0 },
];

const statusConfig = {
  alta: { icon: Flame, label: "Alta Prioridade", className: "bg-success/10 text-success border-success/20" },
  atencao: { icon: AlertTriangle, label: "Atenção", className: "bg-warning/10 text-warning border-warning/20" },
  baixa: { icon: Snowflake, label: "Baixa Atuação", className: "bg-info/10 text-info border-info/20" },
};

export default function Index() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Deputy Profile */}
      <div className="flex items-center gap-5">
        <div className="h-16 w-16 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center">
          <span className="text-xl font-bold text-primary">DP</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dep. Carlos Mendes</h1>
          <div className="flex items-center gap-3 mt-1">
            <Badge variant="outline" className="text-xs">PSD</Badge>
            <span className="text-sm text-muted-foreground">Deputado Estadual — Minas Gerais</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Atuante nas áreas de saúde, educação e infraestrutura no Triângulo Mineiro
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
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {kpi.label}
                  </p>
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
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${
                      opp.type === "warning" ? "bg-warning/10" :
                      opp.type === "success" ? "bg-success/10" :
                      opp.type === "destructive" ? "bg-destructive/10" :
                      "bg-info/10"
                    }`}>
                      <opp.icon className={`h-4 w-4 ${
                        opp.type === "warning" ? "text-warning" :
                        opp.type === "success" ? "text-success" :
                        opp.type === "destructive" ? "text-destructive" :
                        "text-info"
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

      {/* City Ranking */}
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
            {cityRanking.map((city, i) => {
              const cfg = statusConfig[city.status as keyof typeof statusConfig];
              return (
                <div
                  key={city.name}
                  className="flex items-center gap-4 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                >
                  <div className="text-lg font-bold text-muted-foreground w-6 text-center">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground">{city.name}</span>
                      <Badge variant="outline" className={`text-[10px] ${cfg.className}`}>
                        <cfg.icon className="h-3 w-3 mr-1" />
                        {cfg.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-xs text-muted-foreground">Pop: {city.population}</span>
                      <span className="text-xs text-muted-foreground">{city.demandas} demandas</span>
                      <span className="text-xs text-muted-foreground">{city.emendas} emendas</span>
                    </div>
                  </div>
                  <div className="w-32 flex items-center gap-2">
                    <Progress value={city.score} className="h-2" />
                    <span className="text-sm font-semibold text-foreground w-8 text-right">
                      {city.score}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
