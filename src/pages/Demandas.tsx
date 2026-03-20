import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, GripVertical, Paperclip, MapPin, User } from "lucide-react";
import { NovaDemandaDialog } from "@/components/demandas/NovaDemandaDialog";
import { DemandaDetailDialog } from "@/components/demandas/DemandaDetailDialog";
import type { Demanda } from "@/components/demandas/types";
import { useDemandas } from "@/hooks/use-demandas";
import { toast } from "sonner";

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

export default function Demandas() {
  const { demandas: rawDemandas, insert, update, remove } = useDemandas();
  const [newOpen, setNewOpen] = useState(false);
  const [selectedDemanda, setSelectedDemanda] = useState<Demanda | null>(null);

  // Convert DB rows to Demanda type for UI
  const demandas: Demanda[] = useMemo(() => rawDemandas.map((d) => ({
    id: d.id as any,
    col: d.col,
    title: d.title,
    description: "",
    city: d.city,
    priority: d.priority,
    responsible: d.responsible || "Não atribuído",
    attachments: [],
    history: [],
  })), [rawDemandas]);

  const handleCreate = async (d: Demanda) => {
    try {
      await insert({ col: d.col, title: d.title, city: d.city, priority: d.priority, responsible: d.responsible });
      toast.success("Demanda criada");
    } catch {
      toast.error("Erro ao criar");
    }
  };

  const handleUpdate = async (updated: Demanda) => {
    try {
      await update({ id: String(updated.id), data: { col: updated.col, title: updated.title, city: updated.city, priority: updated.priority, responsible: updated.responsible } });
      setSelectedDemanda(null);
      toast.success("Demanda atualizada");
    } catch {
      toast.error("Erro ao atualizar");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await remove(String(id));
      setSelectedDemanda(null);
      toast.success("Demanda excluída");
    } catch {
      toast.error("Erro ao excluir");
    }
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
        onDelete={handleDelete}
      />
    </div>
  );
}
