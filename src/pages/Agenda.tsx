import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, MapPin, Users, FileText, Clock } from "lucide-react";

const eventos = [
  { data: "20 Mar", hora: "09:00", titulo: "Reunião com prefeito de Uberlândia", cidade: "Uberlândia", tipo: "Reunião", liderancas: 2, demandas: 3 },
  { data: "20 Mar", hora: "14:00", titulo: "Visita ao posto de saúde", cidade: "Uberaba", tipo: "Visita", liderancas: 1, demandas: 1 },
  { data: "21 Mar", hora: "10:00", titulo: "Inauguração de escola", cidade: "Araguari", tipo: "Evento", liderancas: 4, demandas: 2 },
  { data: "22 Mar", hora: "08:30", titulo: "Audiência pública — saneamento", cidade: "Patrocínio", tipo: "Audiência", liderancas: 6, demandas: 5 },
  { data: "23 Mar", hora: "15:00", titulo: "Entrega de equipamentos", cidade: "Ituiutaba", tipo: "Entrega", liderancas: 2, demandas: 1 },
];

export default function Agenda() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Agenda Inteligente</h1>
        <p className="text-sm text-muted-foreground">Eventos vinculados a cidades, lideranças e demandas</p>
      </div>

      <div className="space-y-3">
        {eventos.map((ev, i) => (
          <Card key={i} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4 flex items-start gap-4">
              <div className="text-center shrink-0 bg-primary/10 rounded-lg p-3 min-w-[70px]">
                <p className="text-xs text-primary font-semibold">{ev.data}</p>
                <p className="text-lg font-bold text-foreground">{ev.hora}</p>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">{ev.titulo}</h3>
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <Badge variant="outline" className="text-[10px]">
                    <CalendarDays className="h-3 w-3 mr-1" /> {ev.tipo}
                  </Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {ev.cidade}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Users className="h-3 w-3" /> {ev.liderancas} lideranças
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <FileText className="h-3 w-3" /> {ev.demandas} demandas
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
