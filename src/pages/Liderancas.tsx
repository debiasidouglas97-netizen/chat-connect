import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, MapPin, Star } from "lucide-react";
import { cidadesData, liderancasData } from "@/lib/mock-data";
import { calcularScoreLideranca, canViewScore, type UserRole, type CidadeBase } from "@/lib/scoring";
import { useMemo } from "react";

// Simulated current role
const CURRENT_ROLE: UserRole = "deputado";

const influenciaColors: Record<string, string> = {
  Alta: "bg-success/10 text-success border-success/20",
  Média: "bg-warning/10 text-warning border-warning/20",
  Baixa: "bg-muted text-muted-foreground",
};

export default function Liderancas() {
  const cidadesMap = useMemo(() => {
    const map = new Map<string, CidadeBase>();
    cidadesData.forEach((c) => map.set(c.name, c));
    return map;
  }, []);

  const liderancas = useMemo(
    () => liderancasData
      .map((l) => calcularScoreLideranca(l, cidadesMap))
      .sort((a, b) => b.score - a.score),
    [cidadesMap]
  );

  const showScore = canViewScore(CURRENT_ROLE);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Lideranças</h1>
          <p className="text-sm text-muted-foreground">CRM político — gestão de lideranças territoriais</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> Nova Liderança
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {liderancas.map((l) => (
          <Card key={l.name} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-primary">{l.img}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground">{l.name}</h3>
                  <p className="text-xs text-muted-foreground">{l.cargo}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{l.cidadePrincipal}</span>
                  </div>
                </div>
                {showScore && (
                  <div className="text-right">
                    <div className="text-lg font-bold text-foreground">{l.score}</div>
                    <p className="text-[10px] text-muted-foreground">Score</p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 mt-4 flex-wrap">
                <Badge variant="outline" className={`text-[10px] ${influenciaColors[l.influencia]}`}>
                  <Star className="h-3 w-3 mr-1" /> {l.influencia}
                </Badge>
                <Badge variant="outline" className="text-[10px]">{l.tipo}</Badge>
                <Badge variant="outline" className="text-[10px]">
                  {l.classificacao.icon} {l.classificacao.label}
                </Badge>
                <Badge variant="secondary" className="text-[10px] ml-auto">
                  <MapPin className="h-3 w-3 mr-1" /> {l.atuacao.length} cidades
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
