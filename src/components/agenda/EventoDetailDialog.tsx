import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CalendarDays, MapPin, Clock, Users, FileText, Edit, Trash2, AlertTriangle } from "lucide-react";
import type { EventoRow } from "@/hooks/use-eventos";

const statusColor: Record<string, string> = {
  Confirmado: "bg-green-500/10 text-green-700 border-green-200",
  Pendente: "bg-yellow-500/10 text-yellow-700 border-yellow-200",
  Cancelado: "bg-red-500/10 text-red-700 border-red-200",
};

const prioridadeColor: Record<string, string> = {
  Alta: "bg-red-500/10 text-red-700",
  Média: "bg-yellow-500/10 text-yellow-700",
  Baixa: "bg-blue-500/10 text-blue-700",
};

interface Props {
  evento: EventoRow | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onEdit: (ev: EventoRow) => void;
  onDelete: (id: string) => void;
}

export default function EventoDetailDialog({ evento, open, onOpenChange, onEdit, onDelete }: Props) {
  if (!evento) return null;

  const formatDate = (d: string) => {
    try {
      const [y, m, day] = d.split("-");
      return `${day}/${m}/${y}`;
    } catch { return d; }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-start justify-between gap-2">
            <DialogTitle className="text-lg">{evento.titulo}</DialogTitle>
            <div className="flex gap-1 shrink-0">
              <Button size="icon" variant="ghost" onClick={() => { onOpenChange(false); onEdit(evento); }}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="text-destructive" onClick={() => {
                if (confirm("Excluir este evento?")) { onDelete(evento.id); onOpenChange(false); }
              }}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge className={statusColor[evento.status] || ""}>{evento.status}</Badge>
            <Badge className={prioridadeColor[evento.prioridade] || ""}>{evento.prioridade}</Badge>
            <Badge variant="outline">{evento.tipo}</Badge>
            {evento.impacto_politico && (
              <Badge variant="outline">Impacto: {evento.impacto_politico}</Badge>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span>{formatDate(evento.data)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{evento.dia_inteiro ? "Dia inteiro" : `${evento.hora}${evento.hora_fim ? ` - ${evento.hora_fim}` : ""}`}</span>
            </div>
            <div className="flex items-center gap-2 col-span-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{evento.cidade}{evento.local_nome ? ` — ${evento.local_nome}` : ""}</span>
            </div>
          </div>

          {evento.description && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Descrição</p>
                <p className="text-sm">{evento.description}</p>
              </div>
            </>
          )}

          {evento.endereco && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Endereço</p>
              <p className="text-sm">{evento.endereco}</p>
            </div>
          )}

          {evento.participantes_liderancas && evento.participantes_liderancas.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                  <Users className="h-3 w-3" /> Lideranças participantes
                </p>
                <div className="flex flex-wrap gap-1">
                  {evento.participantes_liderancas.map(name => (
                    <Badge key={name} variant="secondary" className="text-xs">{name}</Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {evento.secretario_responsavel && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Secretário responsável</p>
              <p className="text-sm">{evento.secretario_responsavel}</p>
            </div>
          )}

          {evento.notas && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                  <FileText className="h-3 w-3" /> Notas
                </p>
                <p className="text-sm whitespace-pre-wrap">{evento.notas}</p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
