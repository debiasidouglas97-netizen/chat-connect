import { Tv, Radio, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useStreamConfig } from "@/hooks/use-stream-config";
import { useNavigate } from "react-router-dom";
import StreamPlayer from "@/components/streaming/StreamPlayer";

export default function MandatoEmFoco() {
  const { config, isLoading } = useStreamConfig();
  const navigate = useNavigate();

  const isActive = config?.status === "active" && !!config?.stream_url;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Tv className="h-6 w-6 text-primary" />
            Mandato em Foco
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            TV Parlamentar ao vivo
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isActive && (
            <Badge variant="default" className="gap-1.5 bg-red-600 hover:bg-red-700">
              <Radio className="h-3 w-3 animate-pulse" />
              AO VIVO
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => navigate("/configuracoes")}
          >
            <Settings className="h-4 w-4" />
            Configurar
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-96 bg-muted/20 rounded-xl">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      ) : !isActive ? (
        <div className="flex flex-col items-center justify-center h-96 bg-muted/10 rounded-xl border border-dashed border-muted-foreground/20 gap-4">
          <Tv className="h-16 w-16 text-muted-foreground/30" />
          <p className="text-lg text-muted-foreground">Nenhuma transmissão configurada</p>
          <p className="text-sm text-muted-foreground/60 max-w-md text-center">
            Configure a URL da TV Parlamentar em Configurações → Integrações para começar a transmitir.
          </p>
          <Button variant="default" className="gap-2 mt-2" onClick={() => navigate("/configuracoes")}>
            <Settings className="h-4 w-4" />
            Ir para Configurações
          </Button>
        </div>
      ) : (
        <div className="max-w-5xl mx-auto">
          <StreamPlayer
            url={config.stream_url}
            streamType={config.stream_type as any}
          />
          <div className="mt-4 flex items-center gap-3 text-sm text-muted-foreground">
            <Badge variant="outline" className="text-xs">
              {config.stream_type === "auto" ? "Auto-detect" : config.stream_type.toUpperCase()}
            </Badge>
            <span className="truncate opacity-60">{config.stream_url}</span>
          </div>
        </div>
      )}
    </div>
  );
}
