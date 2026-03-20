import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MapPin, Users, FileText, Landmark, Flame, AlertTriangle, Snowflake } from "lucide-react";

const cidades = [
  { name: "Uberlândia", population: "699.097", peso: 10, regiao: "Triângulo Mineiro", score: 92, demandas: 12, liderancas: 8, emendas: 5, status: "alta" },
  { name: "Uberaba", population: "337.092", peso: 8, regiao: "Triângulo Mineiro", score: 45, demandas: 8, liderancas: 5, emendas: 2, status: "atencao" },
  { name: "Araguari", population: "117.225", peso: 6, regiao: "Triângulo Mineiro", score: 78, demandas: 5, liderancas: 3, emendas: 3, status: "alta" },
  { name: "Ituiutaba", population: "105.255", peso: 5, regiao: "Pontal do Triângulo", score: 33, demandas: 2, liderancas: 2, emendas: 1, status: "baixa" },
  { name: "Patrocínio", population: "92.430", peso: 5, regiao: "Alto Paranaíba", score: 61, demandas: 4, liderancas: 3, emendas: 2, status: "atencao" },
  { name: "Monte Carmelo", population: "48.096", peso: 3, regiao: "Alto Paranaíba", score: 25, demandas: 1, liderancas: 1, emendas: 0, status: "baixa" },
];

const statusConfig = {
  alta: { icon: Flame, label: "Alta", className: "bg-success/10 text-success border-success/20" },
  atencao: { icon: AlertTriangle, label: "Atenção", className: "bg-warning/10 text-warning border-warning/20" },
  baixa: { icon: Snowflake, label: "Baixa", className: "bg-info/10 text-info border-info/20" },
};

export default function Cidades() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Gestão de Cidades</h1>
        <p className="text-sm text-muted-foreground">Monitoramento territorial e score de engajamento</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {cidades.map((c) => {
          const cfg = statusConfig[c.status as keyof typeof statusConfig];
          return (
            <Card key={c.name} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">{c.name}</CardTitle>
                  </div>
                  <Badge variant="outline" className={`text-[10px] ${cfg.className}`}>
                    <cfg.icon className="h-3 w-3 mr-1" /> {cfg.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Progress value={c.score} className="h-2 flex-1" />
                  <span className="text-sm font-bold text-foreground w-8 text-right">{c.score}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <span>Pop: {c.population}</span>
                  <span>Peso: {c.peso}/10</span>
                  <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> {c.demandas} demandas</span>
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {c.liderancas} lideranças</span>
                  <span className="flex items-center gap-1"><Landmark className="h-3 w-3" /> {c.emendas} emendas</span>
                  <span>{c.regiao}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
