import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Brain, MapPin, Users, Landmark, FileText, Calendar,
  Megaphone, ArrowRight, RefreshCw,
} from "lucide-react";
import { useActivityLogs } from "@/hooks/use-activity-logs";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const eventConfig: Record<string, { icon: typeof MapPin; color: string; bgColor: string }> = {
  cidade_criada: { icon: MapPin, color: "text-[hsl(145_50%_35%)]", bgColor: "bg-[hsl(145_50%_92%)]" },
  lideranca_criada: { icon: Users, color: "text-[hsl(210_50%_35%)]", bgColor: "bg-[hsl(210_50%_92%)]" },
  emenda_criada: { icon: Landmark, color: "text-[hsl(48_70%_35%)]", bgColor: "bg-[hsl(48_70%_90%)]" },
  demanda_criada: { icon: FileText, color: "text-[hsl(280_40%_40%)]", bgColor: "bg-[hsl(280_40%_92%)]" },
  demanda_status: { icon: RefreshCw, color: "text-[hsl(200_60%_35%)]", bgColor: "bg-[hsl(200_60%_92%)]" },
  evento_criado: { icon: Calendar, color: "text-[hsl(340_50%_40%)]", bgColor: "bg-[hsl(340_50%_92%)]" },
  mobilizacao_enviada: { icon: Megaphone, color: "text-[hsl(25_70%_40%)]", bgColor: "bg-[hsl(25_70%_92%)]" },
};

const prioridadeBadge: Record<string, string> = {
  critico: "bg-destructive/10 text-destructive border-destructive/20",
  relevante: "bg-warning/10 text-warning border-warning/20",
  informativo: "bg-muted text-muted-foreground border-border",
};

export default function InteligenciaMandato() {
  const [showAll, setShowAll] = useState(false);
  const { logs, isLoading, processAI, isProcessing } = useActivityLogs(showAll ? 50 : 5);

  // Auto-process AI descriptions for logs that don't have them
  useEffect(() => {
    const pending = logs.some((l) => !l.descricao_ia);
    if (pending && !isProcessing) {
      processAI().catch(() => {});
    }
  }, [logs]);

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Inteligência do Mandato
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {logs.length} eventos
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
          ))
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Nenhuma atividade registrada ainda. Comece cadastrando cidades, lideranças ou demandas.
          </div>
        ) : (
          logs.map((log) => {
            const cfg = eventConfig[log.tipo_evento] || eventConfig.demanda_criada;
            const Icon = cfg.icon;
            const timeAgo = formatDistanceToNow(new Date(log.created_at), {
              addSuffix: true,
              locale: ptBR,
            });

            return (
              <div
                key={log.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${cfg.bgColor}`}>
                    <Icon className={`h-4 w-4 ${cfg.color}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground leading-tight truncate">
                      {log.descricao_ia || log.descricao_bruta}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">{timeAgo}</span>
                      <Badge variant="outline" className={`text-[10px] ${prioridadeBadge[log.prioridade] || prioridadeBadge.informativo}`}>
                        {log.prioridade}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
