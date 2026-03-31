import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import * as dashjs from "dashjs";
import { Tv, AlertCircle, Loader2 } from "lucide-react";

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

function getProxyUrl(originalUrl: string): string {
  // If it's already HTTPS, no proxy needed
  if (originalUrl.startsWith("https://")) return originalUrl;
  // Route HTTP streams through our edge function proxy
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  return `${supabaseUrl}/functions/v1/stream-proxy?url=${encodeURIComponent(originalUrl)}`;
}

export default function StreamPlayer({ url, streamType }: StreamPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const dashPlayerRef = useRef<dashjs.MediaPlayerClass | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const resolvedType = streamType === "auto" ? detectType(url) : streamType;

  useEffect(() => {
    setError(null);
    setLoading(true);

    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    if (dashPlayerRef.current) { dashPlayerRef.current.destroy(); dashPlayerRef.current = null; }

    if (!url || resolvedType === "embed") {
      setLoading(false);
      return;
    }

    const video = videoRef.current;
    if (!video) { setLoading(false); return; }

    const proxyUrl = getProxyUrl(url);

    if (resolvedType === "hls") {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 30,
          maxBufferLength: 30,
        });
        hls.loadSource(proxyUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setLoading(false);
          video.play().catch(() => {});
        });
        hls.on(Hls.Events.LEVEL_LOADED, () => {
          setLoading(false);
        });
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (!data.fatal) return;
          setLoading(false);
          console.error("HLS fatal error", data);
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            setError(`Erro de rede ao carregar o stream (${data.details}).`);
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
            setError("Erro de mídia ao reproduzir o stream.");
          } else {
            setError(`Erro ao carregar stream HLS (${data.details}).`);
          }
        });
        hlsRef.current = hls;
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = proxyUrl;
        video.addEventListener("loadeddata", () => setLoading(false), { once: true });
        video.addEventListener("error", () => { setLoading(false); setError("Erro ao carregar stream."); }, { once: true });
      } else {
        setLoading(false);
        setError("Seu navegador não suporta HLS.");
      }
    } else if (resolvedType === "dash") {
      const player = dashjs.MediaPlayer().create();
      player.initialize(video, getProxyUrl(url), false);
      player.on("streamInitialized", () => setLoading(false));
      player.on("error", () => { setLoading(false); setError("Erro ao carregar stream DASH."); });
      dashPlayerRef.current = player;
    } else {
      setLoading(false);
      setError("Formato não reconhecido. Use HLS (.m3u8), DASH (.mpd) ou Embed.");
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
    <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      )}
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
