import { useState } from "react";
import { Megaphone, Plus, Send, Clock, FileText, ExternalLink, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useMobilizacoes, type Mobilizacao } from "@/hooks/use-mobilizacoes";
import { NovaMobilizacaoDialog } from "@/components/mobilizacao/NovaMobilizacaoDialog";
import { MobilizacaoDetailDialog } from "@/components/mobilizacao/MobilizacaoDetailDialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusConfig: Record<string, { label: string; icon: typeof Send; className: string }> = {
  enviado: { label: "Enviado", icon: Send, className: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" },
  agendado: { label: "Agendado", icon: Clock, className: "bg-amber-500/10 text-amber-700 border-amber-500/30" },
  rascunho: { label: "Rascunho", icon: FileText, className: "bg-muted text-muted-foreground" },
};

const tipoLabels: Record<string, string> = {
  post: "📸 Post",
  video: "🎬 Vídeo",
  evento: "📅 Evento",
  campanha: "📢 Campanha",
  outro: "📄 Outro",
};

export default function MobilizacaoPage() {
  const { mobilizacoes, isLoading, deleteMobilizacao } = useMobilizacoes();
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState<Mobilizacao | null>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Megaphone className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Mobilização Digital</h1>
            <p className="text-sm text-muted-foreground">Ative sua base para amplificar conteúdos nas redes sociais</p>
          </div>
        </div>
        <Button onClick={() => setShowNew(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Nova Mobilização
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Send className="h-8 w-8 text-emerald-500" />
            <div>
              <p className="text-2xl font-bold">{mobilizacoes.filter(m => m.status === "enviado").length}</p>
              <p className="text-xs text-muted-foreground">Enviadas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-8 w-8 text-amber-500" />
            <div>
              <p className="text-2xl font-bold">{mobilizacoes.filter(m => m.status === "agendado").length}</p>
              <p className="text-xs text-muted-foreground">Agendadas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Megaphone className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{mobilizacoes.reduce((sum, m) => sum + m.total_enviado, 0)}</p>
              <p className="text-xs text-muted-foreground">Total de disparos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : mobilizacoes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Megaphone className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">Nenhuma mobilização criada ainda</p>
            <Button onClick={() => setShowNew(true)} variant="outline" className="mt-4 gap-2">
              <Plus className="h-4 w-4" /> Criar primeira mobilização
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {mobilizacoes.map(mob => {
            const sc = statusConfig[mob.status] || statusConfig.rascunho;
            const Icon = sc.icon;
            return (
              <Card
                key={mob.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelected(mob)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">{mob.titulo}</h3>
                        <Badge className={sc.className}>
                          <Icon className="h-3 w-3 mr-1" /> {sc.label}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <span>{tipoLabels[mob.tipo] || mob.tipo}</span>
                        <span>•</span>
                        <span>{mob.segmentacao_tipo === "todas" ? "Todas lideranças" : mob.segmentacao_tipo}</span>
                        <span>•</span>
                        <span>{mob.total_enviado} enviados</span>
                        <span>•</span>
                        <span>{format(new Date(mob.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                      </div>
                      <a
                        href={mob.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
                        onClick={e => e.stopPropagation()}
                      >
                        {mob.link.length > 60 ? mob.link.slice(0, 60) + "..." : mob.link}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">por {mob.criado_por}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive/60 hover:text-destructive"
                        onClick={e => { e.stopPropagation(); deleteMobilizacao.mutate(mob.id); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <NovaMobilizacaoDialog open={showNew} onOpenChange={setShowNew} />
      <MobilizacaoDetailDialog mobilizacao={selected} open={!!selected} onOpenChange={() => setSelected(null)} />
    </div>
  );
}
