import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, GripVertical, Paperclip, MapPin, User } from "lucide-react";
import { demandasData as rawDemandas } from "@/lib/mock-data";
import { NovaDemandaDialog } from "@/components/demandas/NovaDemandaDialog";
import { DemandaDetailDialog } from "@/components/demandas/DemandaDetailDialog";
import type { Demanda } from "@/components/demandas/types";

const columns = [
  { id: "nova", title: "Nova", color: "bg-info" },
  { id: "analise", title: "Em Análise", color: "bg-warning" },
  { id: "encaminhada", title: "Encaminhada", color: "bg-primary" },
  { id: "execucao", title: "Em Execução", color: "bg-success" },
  { id: "resolvida", title: "Resolvida", color: "bg-muted-foreground" },
];

const priorityColors: Record<string, string> = {
  Urgente: "bg-destructive/10 text-destructive border-destructive/20",
  Alta: "bg-warning/10 text-warning border-warning/20",
  Média: "bg-info/10 text-info border-info/20",
  Baixa: "bg-muted text-muted-foreground",
};

// Convert legacy mock data to new Demanda type
const initialDemandas: Demanda[] = rawDemandas.map((d) => ({
  ...d,
  description: "",
  attachments: [],
  history: [{ id: crypto.randomUUID(), action: "Demanda criada", user: "Sistema", date: new Date("2025-01-15") }],
}));

export default function Demandas() {
  const [demandas, setDemandas] = useState<Demanda[]>(initialDemandas);
  const [newOpen, setNewOpen] = useState(false);
  const [selectedDemanda, setSelectedDemanda] = useState<Demanda | null>(null);

  const handleCreate = (d: Demanda) => setDemandas((prev) => [...prev, d]);

  const handleUpdate = (updated: Demanda) => {
    setDemandas((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    setSelectedDemanda(updated);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Demandas</h1>
          <p className="text-sm text-muted-foreground">Kanban de gestão de demandas parlamentares</p>
        </div>
        <Button className="gap-2" onClick={() => setNewOpen(true)}>
          <Plus className="h-4 w-4" /> Nova Demanda
        </Button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((col) => {
          const items = demandas.filter((d) => d.col === col.id);
          return (
            <div key={col.id} className="min-w-[280px] flex-1">
              <div className="flex items-center gap-2 mb-3">
                <div className={`h-2.5 w-2.5 rounded-full ${col.color}`} />
                <h3 className="text-sm font-semibold text-foreground">{col.title}</h3>
                <Badge variant="secondary" className="text-xs ml-auto">{items.length}</Badge>
              </div>
              <div className="space-y-3">
                {items.map((item) => (
                  <Card
                    key={item.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedDemanda(item)}
                  >
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
                            {item.attachments.length > 0 && (
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Paperclip className="h-3 w-3" /> {item.attachments.length}
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

      <NovaDemandaDialog open={newOpen} onOpenChange={setNewOpen} onSave={handleCreate} />
      <DemandaDetailDialog
        demanda={selectedDemanda}
        open={!!selectedDemanda}
        onOpenChange={(v) => { if (!v) setSelectedDemanda(null); }}
        onUpdate={handleUpdate}
      />
    </div>
  );
}
