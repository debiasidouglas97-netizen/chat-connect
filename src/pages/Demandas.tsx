import { useState, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, GripVertical, Paperclip, MapPin, User, MessageCircle, Send } from "lucide-react";
import { NovaDemandaDialog } from "@/components/demandas/NovaDemandaDialog";
import { DemandaDetailDialog } from "@/components/demandas/DemandaDetailDialog";
import type { Demanda } from "@/components/demandas/types";
import { useDemandas } from "@/hooks/use-demandas";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import type { Demanda } from "@/components/demandas/types";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const columns = [
  { id: "nova", title: "Nova", color: "bg-info" },
  { id: "analise", title: "Em Análise", color: "bg-warning" },
  { id: "encaminhada", title: "Encaminhada", color: "bg-primary" },
  { id: "execucao", title: "Em Execução", color: "bg-success" },
  { id: "resolvida", title: "Resolvida", color: "bg-muted-foreground" },
];

const statusLabels: Record<string, string> = {
  nova: "Nova",
  analise: "Em Análise",
  encaminhada: "Encaminhada",
  execucao: "Em Execução",
  resolvida: "Resolvida",
  arquivada: "Arquivada",
};

const priorityColors: Record<string, string> = {
  Urgente: "bg-destructive/10 text-destructive border-destructive/20",
  Alta: "bg-warning/10 text-warning border-warning/20",
  Média: "bg-info/10 text-info border-info/20",
  Baixa: "bg-muted text-muted-foreground",
};

type CardType = "demanda" | "emenda" | "agenda" | "comunicacao";

const cardTypeConfig: Record<CardType, { label: string; badgeClass: string }> = {
  demanda: { label: "DEMANDA", badgeClass: "bg-[hsl(var(--card-demanda-border))] text-white" },
  emenda: { label: "EMENDA", badgeClass: "bg-[hsl(var(--card-emenda-border))] text-white" },
  agenda: { label: "AGENDA", badgeClass: "bg-[hsl(var(--card-agenda-border))] text-white" },
  comunicacao: { label: "COMUNICAÇÃO", badgeClass: "bg-[hsl(var(--card-comunicacao-border))] text-white" },
};

function getCardType(item: Demanda): CardType {
  if (item.origin === "emenda") return "emenda";
  if (item.origin === "agenda") return "agenda";
  if (item.origin === "comunicacao") return "comunicacao";
  return "demanda";
}

function getCardStyles(type: CardType) {
  return {
    bg: `bg-[hsl(var(--card-${type}))]`,
    border: `border-l-[3px] border-l-[hsl(var(--card-${type}-border))]`,
    text: `text-[hsl(var(--card-${type}-text))]`,
  };
}


function fireConfetti() {
  confetti({
    particleCount: 80,
    spread: 60,
    origin: { y: 0.7 },
    colors: ["#22c55e", "#16a34a", "#4ade80", "#86efac"],
  });
}

// Sortable card component
function SortableCard({
  item,
  onClick,
}: {
  item: Demanda;
  onClick: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`cursor-pointer hover:shadow-md transition-all duration-150 ${
        isDragging ? "shadow-lg scale-[1.02] ring-2 ring-primary/30" : ""
      } ${item.col === "resolvida" ? "border-success/30 bg-success/5" : ""}`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-2">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing mt-0.5"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground leading-tight">
              {item.title}
            </p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge
                variant="outline"
                className={`text-[10px] ${priorityColors[item.priority]}`}
              >
                {item.priority}
              </Badge>
              {item.origin === "telegram" && (
                <Badge variant="secondary" className="text-[10px] gap-0.5">
                  <Send className="h-2.5 w-2.5" /> Telegram
                </Badge>
              )}
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {item.city}
              </span>
            </div>
            <div className="flex items-center justify-between mt-3">
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <User className="h-3 w-3" />{" "}
                {item.creator_name || item.responsible}
              </span>
              <div className="flex items-center gap-2">
                {item.attachments_count > 0 && (
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Paperclip className="h-3 w-3" /> {item.attachments_count}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Droppable column
function DroppableColumn({
  col,
  items,
  onCardClick,
  isOver,
}: {
  col: (typeof columns)[0];
  items: Demanda[];
  onCardClick: (d: Demanda) => void;
  isOver: boolean;
}) {
  const { setNodeRef } = useDroppable({ id: col.id });

  return (
    <div className="min-w-[280px] flex-1">
      <div className="flex items-center gap-2 mb-3">
        <div className={`h-2.5 w-2.5 rounded-full ${col.color}`} />
        <h3 className="text-sm font-semibold text-foreground">{col.title}</h3>
        <Badge variant="secondary" className="text-xs ml-auto">
          {items.length}
        </Badge>
      </div>
      <div
        ref={setNodeRef}
        className={`space-y-3 min-h-[100px] p-2 rounded-lg transition-colors duration-200 ${
          isOver ? "bg-primary/10 ring-2 ring-primary/20" : "bg-transparent"
        }`}
      >
        <SortableContext
          items={items.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          {items.map((item) => (
            <SortableCard
              key={item.id}
              item={item}
              onClick={() => onCardClick(item)}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

export default function Demandas() {
  const {
    demandas: rawDemandas,
    insert,
    update,
    remove,
    addHistory,
    notifyStatusChange,
  } = useDemandas();
  const [newOpen, setNewOpen] = useState(false);
  const [selectedDemanda, setSelectedDemanda] = useState<Demanda | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const demandas: Demanda[] = useMemo(
    () =>
      rawDemandas.map((d) => ({
        id: d.id,
        col: d.col
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .replace(/\s+/g, "_"),
        title: d.title,
        description: d.description || "",
        city: d.city,
        priority: d.priority,
        responsible: d.responsible || "Não atribuído",
        origin: d.origin || "manual",
        creator_chat_id: d.creator_chat_id,
        creator_name: d.creator_name,
        order_index: d.order_index || 0,
        attachments_count: d.attachments || 0,
        attachments: [],
        history: [],
        created_at: d.created_at,
      })),
    [rawDemandas]
  );

  const activeItem = useMemo(
    () => demandas.find((d) => d.id === activeId) || null,
    [demandas, activeId]
  );

  const handleCreate = async (d: Demanda) => {
    try {
      const result = await insert({
        col: d.col,
        title: d.title,
        city: d.city,
        priority: d.priority,
        responsible: d.responsible,
        description: d.description,
      });
      if (result?.id) {
        await addHistory(result.id, "Demanda criada", "Usuário atual");
      }
      toast.success("Demanda criada");
    } catch {
      toast.error("Erro ao criar");
    }
  };

  const handleUpdate = async (updated: Demanda) => {
    try {
      const original = demandas.find((d) => d.id === updated.id);
      const oldCol = original?.col;
      await update({
        id: updated.id,
        data: {
          col: updated.col,
          title: updated.title,
          city: updated.city,
          priority: updated.priority,
          responsible: updated.responsible,
          description: updated.description,
        },
      });

      if (oldCol && oldCol !== updated.col) {
        await addHistory(
          updated.id,
          `Status alterado de "${statusLabels[oldCol]}" para "${statusLabels[updated.col]}"`,
          "Usuário atual",
          oldCol,
          updated.col
        );
        await notifyStatusChange(updated.id, updated.col);
        if (updated.col === "resolvida") {
          fireConfetti();
          toast.success("🎉 Demanda concluída com sucesso!");
        } else {
          toast.success("Demanda atualizada");
        }
      } else {
        toast.success("Demanda atualizada");
      }
      setSelectedDemanda(null);
    } catch {
      toast.error("Erro ao atualizar");
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await update({ id, data: { col: "arquivada" } });
      await addHistory(id, "Demanda arquivada", "Usuário atual");
      setSelectedDemanda(null);
      toast.success("Demanda arquivada");
    } catch {
      toast.error("Erro ao arquivar");
    }
  };

  const handleMoveNext = async (demanda: Demanda, nextStatus: string) => {
    try {
      const oldCol = demanda.col;
      await update({ id: demanda.id, data: { col: nextStatus } });
      await addHistory(
        demanda.id,
        `Status alterado de "${statusLabels[oldCol]}" para "${statusLabels[nextStatus]}"`,
        "Usuário atual",
        oldCol,
        nextStatus
      );
      await notifyStatusChange(demanda.id, nextStatus);
      if (nextStatus === "resolvida") {
        fireConfetti();
        toast.success("🎉 Demanda concluída com sucesso!");
      } else {
        toast.success(`Movida para "${statusLabels[nextStatus]}"`);
      }
      setSelectedDemanda(null);
    } catch {
      toast.error("Erro ao mover demanda");
    }
  };

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { over } = event;
      if (!over) {
        setOverColumnId(null);
        return;
      }
      // Find which column the over item belongs to
      const overItem = demandas.find((d) => d.id === String(over.id));
      if (overItem) {
        setOverColumnId(overItem.col);
      } else {
        // Check if over is a column id
        const col = columns.find((c) => c.id === String(over.id));
        if (col) setOverColumnId(col.id);
      }
    },
    [demandas]
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);
      setOverColumnId(null);

      if (!over) return;

      const activeItemData = demandas.find((d) => d.id === String(active.id));
      if (!activeItemData) return;

      const overId = String(over.id);
      const overItem = demandas.find((d) => d.id === overId);

      let targetCol: string;
      if (overItem) {
        targetCol = overItem.col;
      } else {
        targetCol = overId;
      }

      // Validate target column
      if (!columns.find((c) => c.id === targetCol)) return;

      const oldCol = activeItemData.col;

      if (oldCol !== targetCol) {
        // Moving to different column
        try {
          await update({
            id: activeItemData.id,
            data: { col: targetCol },
          });
          await addHistory(
            activeItemData.id,
            `Status alterado de "${statusLabels[oldCol]}" para "${statusLabels[targetCol]}"`,
            "Usuário atual",
            oldCol,
            targetCol
          );
          await notifyStatusChange(activeItemData.id, targetCol);
          if (targetCol === "resolvida") {
            fireConfetti();
            toast.success("🎉 Demanda concluída com sucesso!");
          } else {
            toast.success(
              `Movida para "${statusLabels[targetCol]}"`
            );
          }
        } catch {
          toast.error("Erro ao mover demanda");
        }
      } else if (overItem && active.id !== over.id) {
        // Reordering within same column
        const colItems = demandas
          .filter((d) => d.col === targetCol)
          .sort((a, b) => a.order_index - b.order_index);
        const oldIndex = colItems.findIndex((d) => d.id === String(active.id));
        const newIndex = colItems.findIndex((d) => d.id === overId);
        if (oldIndex !== -1 && newIndex !== -1) {
          const reordered = arrayMove(colItems, oldIndex, newIndex);
          // Update order_index for all reordered items
          for (let i = 0; i < reordered.length; i++) {
            if (reordered[i].order_index !== i) {
              await update({
                id: reordered[i].id,
                data: { order_index: i },
              });
            }
          }
        }
      }
    },
    [demandas, update, addHistory, notifyStatusChange]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Demandas</h1>
          <p className="text-sm text-muted-foreground">
            Kanban de gestão de demandas parlamentares
          </p>
        </div>
        <Button className="gap-2" onClick={() => setNewOpen(true)}>
          <Plus className="h-4 w-4" /> Nova Demanda
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map((col) => {
            const items = demandas
              .filter((d) => d.col === col.id)
              .sort((a, b) => a.order_index - b.order_index);
            return (
              <DroppableColumn
                key={col.id}
                col={col}
                items={items}
                onCardClick={setSelectedDemanda}
                isOver={overColumnId === col.id && activeItem?.col !== col.id}
              />
            );
          })}
        </div>

        <DragOverlay>
          {activeItem ? (
            <Card className="shadow-2xl scale-[1.05] rotate-[2deg] ring-2 ring-primary/40 opacity-95 w-[280px]">
              <CardContent className="p-4">
                <div className="flex items-start gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground leading-tight">
                      {activeItem.title}
                    </p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${priorityColors[activeItem.priority]}`}
                      >
                        {activeItem.priority}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {activeItem.city}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </DragOverlay>
      </DndContext>

      <NovaDemandaDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        onSave={handleCreate}
      />
      <DemandaDetailDialog
        demanda={selectedDemanda}
        open={!!selectedDemanda}
        onOpenChange={(v) => {
          if (!v) setSelectedDemanda(null);
        }}
        onUpdate={handleUpdate}
        onArchive={handleArchive}
        onMoveNext={handleMoveNext}
      />
    </div>
  );
}
