import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, GripVertical, Paperclip, MapPin, User } from "lucide-react";

const columns = [
  { id: "nova", title: "Nova", color: "bg-info" },
  { id: "analise", title: "Em Análise", color: "bg-warning" },
  { id: "encaminhada", title: "Encaminhada", color: "bg-primary" },
  { id: "execucao", title: "Em Execução", color: "bg-success" },
  { id: "resolvida", title: "Resolvida", color: "bg-muted-foreground" },
];

const mockDemandas = [
  { id: 1, col: "nova", title: "Pavimentação da Rua das Flores", city: "Uberlândia", priority: "Alta", responsible: "João Silva", attachments: 2 },
  { id: 2, col: "nova", title: "Reforma do posto de saúde central", city: "Uberaba", priority: "Urgente", responsible: "Maria Santos", attachments: 1 },
  { id: 3, col: "analise", title: "Construção de creche no Bairro Norte", city: "Araguari", priority: "Média", responsible: "Pedro Costa", attachments: 3 },
  { id: 4, col: "analise", title: "Iluminação pública na Av. Principal", city: "Uberlândia", priority: "Alta", responsible: "João Silva", attachments: 0 },
  { id: 5, col: "encaminhada", title: "Equipamentos para escola municipal", city: "Patrocínio", priority: "Média", responsible: "Ana Lima", attachments: 1 },
  { id: 6, col: "execucao", title: "Ponte sobre o Rio Paranaíba", city: "Ituiutaba", priority: "Alta", responsible: "Pedro Costa", attachments: 4 },
  { id: 7, col: "resolvida", title: "Ambulância para o município", city: "Monte Carmelo", priority: "Urgente", responsible: "Maria Santos", attachments: 2 },
];

const priorityColors: Record<string, string> = {
  Urgente: "bg-destructive/10 text-destructive border-destructive/20",
  Alta: "bg-warning/10 text-warning border-warning/20",
  Média: "bg-info/10 text-info border-info/20",
  Baixa: "bg-muted text-muted-foreground",
};

export default function Demandas() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Demandas</h1>
          <p className="text-sm text-muted-foreground">Kanban de gestão de demandas parlamentares</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> Nova Demanda
        </Button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((col) => {
          const items = mockDemandas.filter((d) => d.col === col.id);
          return (
            <div key={col.id} className="min-w-[280px] flex-1">
              <div className="flex items-center gap-2 mb-3">
                <div className={`h-2.5 w-2.5 rounded-full ${col.color}`} />
                <h3 className="text-sm font-semibold text-foreground">{col.title}</h3>
                <Badge variant="secondary" className="text-xs ml-auto">{items.length}</Badge>
              </div>
              <div className="space-y-3">
                {items.map((item) => (
                  <Card key={item.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground leading-tight">{item.title}</p>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <Badge variant="outline" className={`text-[10px] ${priorityColors[item.priority]}`}>
                              {item.priority}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> {item.city}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-3">
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <User className="h-3 w-3" /> {item.responsible}
                            </span>
                            {item.attachments > 0 && (
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Paperclip className="h-3 w-3" /> {item.attachments}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
