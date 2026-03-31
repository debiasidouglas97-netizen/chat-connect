import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import dashjs from "dashjs";
import { Tv, AlertCircle } from "lucide-react";

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

export default function StreamPlayer({ url, streamType }: StreamPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const dashPlayerRef = useRef<dashjs.MediaPlayerClass | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resolvedType = streamType === "auto" ? detectType(url) : streamType;

  useEffect(() => {
    setError(null);
    // Cleanup previous
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    if (dashPlayerRef.current) { dashPlayerRef.current.destroy(); dashPlayerRef.current = null; }

    if (!url || resolvedType === "embed") return;

    const video = videoRef.current;
    if (!video) return;

    if (resolvedType === "hls") {
      if (Hls.isSupported()) {
        const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) setError("Erro ao carregar stream HLS. Verifique a URL.");
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

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] bg-black/90 rounded-xl text-destructive gap-4">
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
