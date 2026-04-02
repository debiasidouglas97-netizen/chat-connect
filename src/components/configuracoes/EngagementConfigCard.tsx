import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Instagram, Save, RefreshCw, Eye, EyeOff, Activity, Wallet } from "lucide-react";
import { useEngagementConfig, useSyncEngagement } from "@/hooks/use-engagement";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function EngagementConfigCard() {
  const { config, isLoading, upsert } = useEngagementConfig();
  const syncMutation = useSyncEngagement();

  const [instagramHandle, setInstagramHandle] = useState("");
  const [apifyApiKey, setApifyApiKey] = useState("");
  const [frequencia, setFrequencia] = useState("24h");
  const [showKey, setShowKey] = useState(false);
  const [apifyBalance, setApifyBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  useEffect(() => {
    if (config) {
      setInstagramHandle(config.instagram_handle || "");
      setApifyApiKey(config.apify_api_key || "");
      setFrequencia(config.frequencia_sincronizacao || "24h");
    }
  }, [config]);

  // Fetch balance when API key is available
  useEffect(() => {
    if (apifyApiKey && apifyApiKey.length > 10) {
      fetchBalance(apifyApiKey);
    } else {
      setApifyBalance(null);
    }
  }, [apifyApiKey]);

  const fetchBalance = async (key: string) => {
    setBalanceLoading(true);
    try {
      const res = await fetch(`https://api.apify.com/v2/users/me?token=${key}`);
      if (res.ok) {
        const data = await res.json();
        const balance = data?.data?.plan?.usageUsd?.remainingUsd 
          ?? data?.data?.proxy?.groups?.[0]?.availableCount 
          ?? null;
        // Try different paths for balance
        const planData = data?.data?.plan;
        const monthlyUsage = planData?.monthlyUsageUsd;
        const limitUsd = planData?.limitUsd;
        
        if (monthlyUsage !== undefined && limitUsd !== undefined) {
          setApifyBalance(Math.max(0, limitUsd - monthlyUsage));
        } else if (data?.data?.plan?.remainingUsageUsd !== undefined) {
          setApifyBalance(data.data.plan.remainingUsageUsd);
        } else {
          // Fallback: show prepaid balance if available
          const prepaid = data?.data?.plan?.prepaidUsd;
          if (prepaid !== undefined) {
            setApifyBalance(prepaid);
          } else {
            setApifyBalance(null);
          }
        }
      } else {
        setApifyBalance(null);
      }
    } catch {
      setApifyBalance(null);
    } finally {
      setBalanceLoading(false);
    }
  };

  if (isLoading) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Engajamento Instagram (Apify)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          O sistema busca os últimos 5 posts e cruza comentários e curtidas com lideranças cadastradas.
          Score: comentário +5, menção +10, curtida +2.
        </p>

        <div>
          <Label className="flex items-center gap-1">
            <Instagram className="h-3 w-3" /> Instagram do Deputado
          </Label>
          <Input
            value={instagramHandle}
            onChange={(e) => setInstagramHandle(e.target.value)}
            placeholder="@perfil_deputado"
          />
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Handle do Instagram do deputado (sem @)
          </p>
        </div>

        <div>
          <Label className="flex items-center gap-1">🔑 API Key do Apify</Label>
          <div className="relative">
            <Input
              type={showKey ? "text" : "password"}
              value={apifyApiKey}
              onChange={(e) => setApifyApiKey(e.target.value)}
              placeholder="apify_api_XXXXXXXXX"
              className="pr-10"
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setShowKey(!showKey)}
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <div className="flex items-center justify-between mt-0.5">
            <p className="text-[10px] text-muted-foreground">
              Obtenha em{" "}
              <a href="https://console.apify.com/account/integrations" target="_blank" rel="noopener" className="text-primary underline">
                console.apify.com
              </a>
            </p>
            {/* Apify Balance */}
            {apifyApiKey && apifyApiKey.length > 10 && (
              <div className="flex items-center gap-1.5">
                <Wallet className="h-3 w-3 text-muted-foreground" />
                {balanceLoading ? (
                  <span className="text-[10px] text-muted-foreground animate-pulse">Consultando saldo...</span>
                ) : apifyBalance !== null ? (
                  <Badge 
                    variant="outline" 
                    className={`text-[10px] h-5 px-1.5 ${
                      apifyBalance > 5 
                        ? "bg-[#E6F4EA] text-[#2E7D32] border-[#C8E6C9]" 
                        : apifyBalance > 1 
                          ? "bg-[#FFF4E5] text-[#B26A00] border-[#FFE0B2]" 
                          : "bg-[#FDECEA] text-[#C62828] border-[#FFCDD2]"
                    }`}
                  >
                    💰 Saldo: ${apifyBalance.toFixed(2)}
                  </Badge>
                ) : (
                  <button
                    type="button"
                    onClick={() => fetchBalance(apifyApiKey)}
                    className="text-[10px] text-primary underline hover:text-primary/80"
                  >
                    Ver saldo
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div>
          <Label>Frequência de sincronização</Label>
          <select
            value={frequencia}
            onChange={(e) => setFrequencia(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="manual">Manual</option>
            <option value="6h">A cada 6 horas</option>
            <option value="12h">A cada 12 horas</option>
            <option value="24h">A cada 24 horas (recomendado)</option>
          </select>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() =>
              upsert.mutate({
                instagram_handle: instagramHandle.trim(),
                apify_api_key: apifyApiKey.trim(),
                frequencia_sincronizacao: frequencia,
              })
            }
            disabled={upsert.isPending}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {upsert.isPending ? "Salvando..." : "Salvar configuração"}
          </Button>

          <Button
            variant="outline"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending || !apifyApiKey.trim() || !instagramHandle.trim()}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${syncMutation.isPending ? "animate-spin" : ""}`} />
            {syncMutation.isPending ? "Sincronizando..." : "Sincronizar agora"}
          </Button>
        </div>

        {/* Status da última sync */}
        {config?.last_sync_at && (
          <div className="rounded-lg bg-muted/50 p-3 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium">Última sincronização:</span>
              <span className="text-xs text-muted-foreground">
                {format(new Date(config.last_sync_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium">Status:</span>
              <Badge
                variant={config.last_sync_status === "ok" ? "default" : "destructive"}
                className="text-[10px]"
              >
                {config.last_sync_status === "ok" ? "✅ Sucesso" : `❌ ${config.last_sync_status}`}
              </Badge>
            </div>
            {config.last_sync_error && (
              <p className="text-xs text-destructive">{config.last_sync_error}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
