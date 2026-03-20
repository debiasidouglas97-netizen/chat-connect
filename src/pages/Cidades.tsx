import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MapPin, Users, FileText, Landmark, Flame, AlertTriangle, Snowflake } from "lucide-react";
import { cidadesData } from "@/lib/mock-data";
import { calcularScoreCidade, canViewScore, type UserRole } from "@/lib/scoring";
import { useMemo } from "react";

const CURRENT_ROLE: UserRole = "deputado";

const statusConfig = {
  alta: { icon: Flame, label: "Alta", className: "bg-success/10 text-success border-success/20" },
  atencao: { icon: AlertTriangle, label: "Atenção", className: "bg-warning/10 text-warning border-warning/20" },
  baixa: { icon: Snowflake, label: "Baixa", className: "bg-info/10 text-info border-info/20" },
};

export default function Cidades() {
  const cidades = useMemo(
    () => cidadesData.map(calcularScoreCidade).sort((a, b) => b.score - a.score),
    []
  );
  const showScore = canViewScore(CURRENT_ROLE);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Gestão de Cidades</h1>
        <p className="text-sm text-muted-foreground">Monitoramento territorial — Baixada Santista e Região de Bauru</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {cidades.map((c) => {
          const cfg = statusConfig[c.status];
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
                {showScore && (
                  <div className="flex items-center gap-2">
                    <Progress value={c.score} className="h-2 flex-1" />
                    <span className="text-sm font-bold text-foreground w-8 text-right">{c.score}</span>
                  </div>
                )}
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
