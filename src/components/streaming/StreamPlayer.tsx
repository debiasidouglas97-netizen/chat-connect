import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import * as dashjs from "dashjs";
import { Tv, AlertCircle, ShieldAlert } from "lucide-react";

interface StreamPlayerProps {
  url: string;
  streamType: "auto" | "hls" | "dash" | "embed";
}

function detectType(url: string): "hls" | "dash" | "embed" | "unknown" {
  const lower = url.toLowerCase();
  if (lower.includes(".m3u8")) return "hls";
  if (lower.includes(".mpd")) return "dash";
  if (lower.includes("embed") || lower.includes("<iframe")) return "embed";
  return "unknown";
}

function isMixedContent(url: string): boolean {
  return window.location.protocol === "https:" && url.startsWith("http://");
}

export default function StreamPlayer({ url, streamType }: StreamPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const dashPlayerRef = useRef<dashjs.MediaPlayerClass | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mixedContent, setMixedContent] = useState(false);

  const resolvedType = streamType === "auto" ? detectType(url) : streamType;

  useEffect(() => {
    setError(null);
    setMixedContent(false);

    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    if (dashPlayerRef.current) { dashPlayerRef.current.destroy(); dashPlayerRef.current = null; }

    if (!url || resolvedType === "embed") return;

    // Check mixed content
    if (isMixedContent(url)) {
      setMixedContent(true);
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    if (resolvedType === "hls") {
      if (Hls.isSupported()) {
        const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(() => {});
        });
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
              setError("Erro de rede ao carregar o stream. Verifique se a URL está acessível e o servidor permite conexões externas (CORS).");
            } else {
              setError("Erro ao carregar stream HLS. Verifique a URL.");
            }
          }
        });
        hlsRef.current = hls;
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = url;
      } else {
        setError("Seu navegador não suporta HLS.");
      }
    } else if (resolvedType === "dash") {
      const player = dashjs.MediaPlayer().create();
      player.initialize(video, url, false);
      player.on("error", () => setError("Erro ao carregar stream DASH. Verifique a URL."));
      dashPlayerRef.current = player;
    } else {
      setError("Formato de stream não reconhecido. Use HLS (.m3u8), DASH (.mpd) ou Embed.");
    }

    return () => {
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
      if (dashPlayerRef.current) { dashPlayerRef.current.destroy(); dashPlayerRef.current = null; }
    };
  }, [url, resolvedType]);

  if (!url) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] bg-black/90 rounded-xl text-muted-foreground gap-4">
        <Tv className="h-16 w-16 opacity-30" />
        <p className="text-lg">Nenhuma transmissão configurada</p>
        <p className="text-sm opacity-60">Configure a URL em Configurações → Integrações</p>
      </div>
    );
  }

  if (mixedContent) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] bg-black/90 rounded-xl text-amber-400 gap-4 p-8">
        <ShieldAlert className="h-12 w-12" />
        <p className="text-lg font-semibold text-center">Conteúdo misto bloqueado pelo navegador</p>
        <p className="text-sm text-center text-muted-foreground max-w-lg">
          O site roda em HTTPS mas a URL do stream usa HTTP. O navegador bloqueia isso por segurança.
        </p>
        <div className="text-sm text-muted-foreground space-y-2 max-w-lg">
          <p className="font-medium text-foreground">Soluções:</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li><strong>Recomendado:</strong> Use HTTPS no servidor de streaming</li>
            <li><strong>Alternativa:</strong> Mude o tipo para "Embed" nas configurações e use a URL do embed: <code className="bg-muted px-1 rounded text-[10px]">{url.replace("index.m3u8", "embed.html")}</code></li>
            <li><strong>Teste rápido:</strong> Abra diretamente em nova aba para verificar se o stream funciona</li>
          </ul>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary underline mt-2"
        >
          Abrir stream diretamente →
        </a>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] bg-black/90 rounded-xl text-destructive gap-4 p-8">
        <AlertCircle className="h-12 w-12" />
        <p className="text-sm text-center max-w-md">{error}</p>
      </div>
    );
  }

  if (resolvedType === "embed") {
    const iframeSrc = url.includes("<iframe")
      ? url.match(/src="([^"]+)"/)?.[1] || url
      : url;
    return (
      <div className="w-full aspect-video bg-black rounded-xl overflow-hidden">
        <iframe
          src={iframeSrc}
          className="w-full h-full border-0"
          allowFullScreen
          allow="autoplay; encrypted-media; fullscreen"
          title="Mandato em Foco"
        />
      </div>
    );
  }

  return (
    <div className="w-full aspect-video bg-black rounded-xl overflow-hidden">
      <video
        ref={videoRef}
        className="w-full h-full"
        controls
        autoPlay={false}
        playsInline
      />
    </div>
  );
}
