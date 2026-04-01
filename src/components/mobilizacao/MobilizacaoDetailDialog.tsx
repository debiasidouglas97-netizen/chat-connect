import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useMobilizacaoDestinatarios, type Mobilizacao } from "@/hooks/use-mobilizacoes";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle2, XCircle, ExternalLink } from "lucide-react";

interface Props {
  mobilizacao: Mobilizacao | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const statusColors: Record<string, string> = {
  enviado: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  agendado: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  rascunho: "bg-muted text-muted-foreground",
};

const tipoLabels: Record<string, string> = {
  post: "Post Instagram",
  video: "Vídeo",
  evento: "Evento",
  campanha: "Campanha",
  outro: "Outro",
};

export function MobilizacaoDetailDialog({ mobilizacao, open, onOpenChange }: Props) {
  const { data: destinatarios = [] } = useMobilizacaoDestinatarios(mobilizacao?.id ?? null);

  if (!mobilizacao) return null;

  const enviados = destinatarios.filter(d => d.telegram_enviado).length;
  const total = destinatarios.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{mobilizacao.titulo}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge className={statusColors[mobilizacao.status]}>{mobilizacao.status}</Badge>
            <Badge variant="outline">{tipoLabels[mobilizacao.tipo] || mobilizacao.tipo}</Badge>
            <Badge variant="outline">{mobilizacao.segmentacao_tipo === "todas" ? "Todas lideranças" : mobilizacao.segmentacao_tipo}</Badge>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Criado por:</span>
              <p className="font-medium">{mobilizacao.criado_por}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Enviado por:</span>
              <p className="font-medium">{mobilizacao.enviado_por || "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Data:</span>
              <p className="font-medium">{format(new Date(mobilizacao.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Alcance:</span>
              <p className="font-medium">{enviados}/{total} enviados via Telegram</p>
            </div>
          </div>

          <div>
            <span className="text-muted-foreground text-sm">Link:</span>
            <a href={mobilizacao.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline text-sm">
              {mobilizacao.link} <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div>
            <span className="text-muted-foreground text-sm">Mensagem:</span>
            <pre className="mt-1 p-3 bg-muted/30 rounded-lg text-sm whitespace-pre-wrap font-sans">{mobilizacao.mensagem}</pre>
          </div>

          {mobilizacao.segmentacao_valor && mobilizacao.segmentacao_valor.length > 0 && (
            <div>
              <span className="text-muted-foreground text-sm">Segmentação:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {mobilizacao.segmentacao_valor.map(v => <Badge key={v} variant="outline">{v}</Badge>)}
              </div>
            </div>
          )}

          {destinatarios.length > 0 && (
            <div>
              <span className="text-muted-foreground text-sm font-semibold">Destinatários ({total})</span>
              <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
                {destinatarios.map(d => (
                  <div key={d.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/20 text-sm">
                    <div>
                      <span className="font-medium">{d.lideranca_name}</span>
                      {d.cidade && <span className="text-muted-foreground ml-2">• {d.cidade}</span>}
                    </div>
                    {d.telegram_enviado ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
