import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, MapPin, Users, FileText } from "lucide-react";
import { useEventos } from "@/hooks/use-eventos";

export default function Agenda() {
  const { eventos } = useEventos();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Agenda Inteligente</h1>
        <p className="text-sm text-muted-foreground">Eventos vinculados a cidades, lideranças e demandas</p>
      </div>

      {eventos.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg">Nenhum evento agendado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {eventos.map((ev) => (
            <Card key={ev.id} className="hover:shadow-md transition-shadow cursor-pointer">
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
      )}
    </div>
  );
}
