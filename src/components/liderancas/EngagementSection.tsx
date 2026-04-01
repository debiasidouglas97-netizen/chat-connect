import { Badge } from "@/components/ui/badge";
import { useLeaderEngagementScore, useEngagementLogs } from "@/hooks/use-engagement";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Instagram, TrendingUp } from "lucide-react";

interface Props {
  leaderId: string;
}

export default function EngagementSection({ leaderId }: Props) {
  const { data: totalScore, isLoading: loadingScore } = useLeaderEngagementScore(leaderId);
  const { data: logs, isLoading: loadingLogs } = useEngagementLogs(leaderId);

  if (loadingScore || loadingLogs) {
    return (
      <div className="text-xs text-muted-foreground animate-pulse py-2">
        Carregando engajamento...
      </div>
    );
  }

  const score = totalScore || 0;
  const nivel = score >= 30 ? "Alto" : score >= 15 ? "Médio" : score > 0 ? "Baixo" : "Nenhum";
  const nivelColor =
    nivel === "Alto" ? "bg-[#E6F4EA] text-[#2E7D32] border-[#C8E6C9]" :
    nivel === "Médio" ? "bg-[#FFF4E5] text-[#B26A00] border-[#FFE0B2]" :
    nivel === "Baixo" ? "bg-muted text-muted-foreground" :
    "bg-muted text-muted-foreground";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-primary" />
        <p className="text-xs font-medium text-muted-foreground">Engajamento Político</p>
      </div>

      <div className="flex items-center gap-4">
        <div>
          <p className="text-2xl font-bold text-foreground">{score}</p>
          <p className="text-[10px] text-muted-foreground">pontos</p>
        </div>
        <Badge variant="outline" className={`text-xs ${nivelColor}`}>
          📊 {nivel}
        </Badge>
        {logs && logs.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {logs.length} interação(ões)
          </span>
        )}
      </div>

      {/* Histórico de interações */}
      {logs && logs.length > 0 && (
        <div className="space-y-1.5 max-h-40 overflow-y-auto">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Histórico</p>
          {logs.slice(0, 20).map((log) => (
            <div
              key={log.id}
              className="flex items-start gap-2 text-xs p-2 rounded-md bg-muted/50 border border-border/50"
            >
              <Instagram className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-foreground">@{log.instagram_username}</span>
                  <Badge variant="secondary" className="text-[9px] h-4 px-1">
                    {log.tipo_interacao === "mencao" ? "+10" : "+5"}
                  </Badge>
                </div>
                {log.comment_text && (
                  <p className="text-muted-foreground truncate mt-0.5">"{log.comment_text}"</p>
                )}
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {format(new Date(log.created_at), "dd MMM yyyy, HH:mm", { locale: ptBR })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {(!logs || logs.length === 0) && (
        <p className="text-xs text-muted-foreground italic">
          Nenhuma interação registrada ainda. Configure a sincronização em Configurações → Integrações.
        </p>
      )}
    </div>
  );
}
