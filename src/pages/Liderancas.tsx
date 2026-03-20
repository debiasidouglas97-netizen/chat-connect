import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, MapPin, Phone, Star, TrendingUp } from "lucide-react";

const liderancas = [
  {
    name: "José Silva", city: "Uberlândia", cargo: "Presidente da Associação de Bairro",
    influencia: "Alta", tipo: "Comunitária", cidades: 3, score: 88,
    img: "JS",
  },
  {
    name: "Maria Oliveira", city: "Uberaba", cargo: "Vereadora",
    influencia: "Alta", tipo: "Política", cidades: 5, score: 92,
    img: "MO",
  },
  {
    name: "Carlos Pereira", city: "Araguari", cargo: "Líder sindical",
    influencia: "Média", tipo: "Eleitoral", cidades: 2, score: 65,
    img: "CP",
  },
  {
    name: "Ana Costa", city: "Patrocínio", cargo: "Diretora de escola",
    influencia: "Média", tipo: "Comunitária", cidades: 1, score: 55,
    img: "AC",
  },
  {
    name: "Roberto Santos", city: "Ituiutaba", cargo: "Empresário",
    influencia: "Baixa", tipo: "Eleitoral", cidades: 1, score: 35,
    img: "RS",
  },
  {
    name: "Patrícia Lima", city: "Monte Carmelo", cargo: "Coordenadora de ONG",
    influencia: "Alta", tipo: "Comunitária", cidades: 4, score: 81,
    img: "PL",
  },
];

const influenciaColors: Record<string, string> = {
  Alta: "bg-success/10 text-success border-success/20",
  Média: "bg-warning/10 text-warning border-warning/20",
  Baixa: "bg-muted text-muted-foreground",
};

const classificacao = (cidades: number, score: number) => {
  if (cidades >= 4 && score >= 75) return { label: "Força Estratégica", icon: "🏛️" };
  if (cidades >= 2 && score >= 50) return { label: "Força Regional", icon: "🌎" };
  return { label: "Força Local", icon: "🏙️" };
};

export default function Liderancas() {
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
        {liderancas.map((l) => {
          const cls = classificacao(l.cidades, l.score);
          return (
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
                      <span className="text-xs text-muted-foreground">{l.city}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-foreground">{l.score}</div>
                    <p className="text-[10px] text-muted-foreground">Score</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-4 flex-wrap">
                  <Badge variant="outline" className={`text-[10px] ${influenciaColors[l.influencia]}`}>
                    <Star className="h-3 w-3 mr-1" /> {l.influencia}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {l.tipo}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {cls.icon} {cls.label}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px] ml-auto">
                    <MapPin className="h-3 w-3 mr-1" /> {l.cidades} cidades
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
