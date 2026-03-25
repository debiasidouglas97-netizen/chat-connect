import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Download, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { EmendaRow } from "@/hooks/use-emendas";
import { useEmendaAttachments } from "@/hooks/use-emendas";

const statusColors: Record<string, string> = {
  Proposta: "bg-muted text-muted-foreground",
  Aprovada: "bg-info/10 text-info border-info/20",
  Liberada: "bg-warning/10 text-warning border-warning/20",
  "Em execução": "bg-accent/10 text-accent-foreground border-accent/20",
  Paga: "bg-success/10 text-success border-success/20",
};

const prioridadeColors: Record<string, string> = {
  Alta: "bg-destructive/10 text-destructive",
  Média: "bg-warning/10 text-warning",
  Baixa: "bg-muted text-muted-foreground",
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  emenda: EmendaRow | null;
  onEdit: () => void;
  onDelete: () => void;
}

export default function EmendaDetailDialog({ open, onOpenChange, emenda, onEdit, onDelete }: Props) {
  const { attachments } = useEmendaAttachments(emenda?.id || null);

  if (!emenda) return null;

  const getFileUrl = (path: string) => {
    const { data } = supabase.storage.from("emenda-attachments").getPublicUrl(path);
    return data.publicUrl;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {emenda.titulo || `Emenda ${emenda.tipo} - ${emenda.cidade}`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className={statusColors[emenda.status]}>{emenda.status}</Badge>
            <Badge variant="outline" className={prioridadeColors[emenda.prioridade]}>{emenda.prioridade}</Badge>
            <Badge variant="outline">{emenda.tipo}</Badge>
            <Badge variant="secondary">{emenda.ano}</Badge>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Cidade</p>
              <p className="text-sm font-medium">{emenda.cidade}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Valor</p>
              <p className="text-sm font-bold text-primary">{emenda.valor}</p>
            </div>
            {emenda.regiao && (
              <div>
                <p className="text-xs text-muted-foreground">Região</p>
                <p className="text-sm">{emenda.regiao}</p>
              </div>
            )}
          </div>

          {emenda.descricao && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Descrição</p>
              <p className="text-sm whitespace-pre-wrap bg-muted/50 rounded p-3">{emenda.descricao}</p>
            </div>
          )}

          {emenda.objetivo_politico && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Objetivo político</p>
              <p className="text-sm whitespace-pre-wrap bg-muted/50 rounded p-3">{emenda.objetivo_politico}</p>
            </div>
          )}

          {emenda.liderancas_relacionadas?.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Lideranças relacionadas</p>
              <div className="flex flex-wrap gap-1">
                {emenda.liderancas_relacionadas.map(l => (
                  <Badge key={l} variant="secondary" className="text-xs">{l}</Badge>
                ))}
              </div>
            </div>
          )}

          {emenda.notas && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Observações internas</p>
              <p className="text-sm whitespace-pre-wrap bg-muted/50 rounded p-3">{emenda.notas}</p>
            </div>
          )}

          {attachments.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Anexos ({attachments.length})</p>
              <div className="space-y-1">
                {attachments.map(att => (
                  <a
                    key={att.id}
                    href={getFileUrl(att.storage_path)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-muted/50 rounded px-3 py-2 hover:bg-muted transition-colors"
                  >
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm truncate flex-1">{att.file_name}</span>
                    <Download className="h-4 w-4 text-muted-foreground" />
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-3 border-t">
            <Button variant="outline" size="sm" className="gap-1" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" /> Editar
            </Button>
            <Button variant="outline" size="sm" className="gap-1 text-destructive hover:text-destructive" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5" /> Excluir
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
