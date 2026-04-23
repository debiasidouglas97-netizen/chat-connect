import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, TrendingUp, Users, Target } from "lucide-react";
import { useLiderancas } from "@/hooks/use-liderancas";
import { useCidades } from "@/hooks/use-cidades";
import { useEleitores } from "@/hooks/use-eleitores";
import { detectCategoriaMeta, calcEstimativaVotos, formatNumberBR } from "@/lib/meta-votos";

export default function PerformanceLideranca() {
  const { liderancas } = useLiderancas();
  const { cidades } = useCidades();
  const { eleitores } = useEleitores();

  const eleitoresPorLideranca = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of eleitores) {
      if (!e.lideranca_id) continue;
      map.set(e.lideranca_id, (map.get(e.lideranca_id) || 0) + 1);
    }
    return map;
  }, [eleitores]);

  const eleitoresPorCidade = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of cidades) map.set(c.name, c.eleitores2024 || 0);
    return map;
  }, [cidades]);

  const dados = useMemo(() => {
    return liderancas.map((l: any) => {
      const cat = detectCategoriaMeta(l.cargo);
      const eleitoresCidade = eleitoresPorCidade.get(l.cidadePrincipal) || 0;
      const meta = calcEstimativaVotos(l.meta_votos_tipo, l.meta_votos_valor, eleitoresCidade);
      const cadastrados = eleitoresPorLideranca.get(l.id) || 0;
      const progresso = meta > 0 ? Math.min(100, (cadastrados / meta) * 100) : 0;
      return { l, cat, eleitoresCidade, meta, cadastrados, progresso };
    });
  }, [liderancas, eleitoresPorCidade, eleitoresPorLideranca]);

  const marketShare = dados.filter((d) => d.cat === "market_share");
  const operacional = dados.filter((d) => d.cat === "operacional");

  // Hierarquia: somar cadastrados das lideranças operacionais a Prefeitos da mesma cidade
  const baseGrupoPorPrefeito = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of operacional) {
      const cidade = d.l.cidadePrincipal;
      const prefeitos = marketShare.filter((m) => m.l.cidadePrincipal === cidade && (m.l.cargo || "").toLowerCase().includes("prefeit"));
      for (const p of prefeitos) {
        map.set(p.l.id, (map.get(p.l.id) || 0) + d.cadastrados);
      }
    }
    return map;
  }, [marketShare, operacional]);

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Market Share — Azul */}
        <Card className="border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              Market Share — Voto de Opinião
              <Tooltip>
                <TooltipTrigger><Info className="h-3.5 w-3.5 text-muted-foreground" /></TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  Prefeitos e Vereadores trabalham a <strong>imagem</strong> e influência sobre o eleitorado.
                  A meta é uma % do total de eleitores da cidade.
                </TooltipContent>
              </Tooltip>
              <Badge variant="secondary" className="ml-auto bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">
                {marketShare.length} lideranças
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {marketShare.length === 0 && (
              <p className="text-xs text-muted-foreground">Nenhuma liderança Prefeito ou Vereador cadastrada.</p>
            )}
            {marketShare.map(({ l, eleitoresCidade, meta }) => {
              const baseGrupo = baseGrupoPorPrefeito.get(l.id) || 0;
              const pct = l.meta_votos_tipo === "percentual" ? l.meta_votos_valor : 0;
              return (
                <div key={l.id} className="space-y-1.5 rounded-md border border-blue-100 bg-blue-50/40 dark:bg-blue-950/20 dark:border-blue-900/40 p-3">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-foreground">{l.name}</p>
                      <p className="text-[10px] text-muted-foreground">{l.cargo} · {l.cidadePrincipal}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-blue-700 dark:text-blue-300 font-bold">{formatNumberBR(meta)} votos</p>
                      <p className="text-[10px] text-muted-foreground">
                        {pct ? `${String(pct).replace(".", ",")}% de ${formatNumberBR(eleitoresCidade)}` : "meta fixa"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={100} className="h-2 [&>div]:bg-blue-500" />
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">influência</span>
                  </div>
                  {baseGrupo > 0 && (
                    <p className="text-[10px] text-emerald-700 dark:text-emerald-300">
                      + <strong>{formatNumberBR(baseGrupo)}</strong> votos cadastrados pelas lideranças operacionais da cidade
                    </p>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Operacional — Verde */}
        <Card className="border-emerald-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-600" />
              Lideranças Operacionais — Voto de Cadastro
              <Tooltip>
                <TooltipTrigger><Info className="h-3.5 w-3.5 text-muted-foreground" /></TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  Lideranças de base trabalham o <strong>dado direto</strong>: cada eleitor cadastrado com WhatsApp
                  conta para a meta nominal da liderança.
                </TooltipContent>
              </Tooltip>
              <Badge variant="secondary" className="ml-auto bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                {operacional.length} lideranças
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {operacional.length === 0 && (
              <p className="text-xs text-muted-foreground">Nenhuma liderança operacional cadastrada.</p>
            )}
            {operacional.map(({ l, meta, cadastrados, progresso }) => {
              const eficiencia = meta > 0 ? `${Math.round(progresso)}%` : "—";
              return (
                <div key={l.id} className="space-y-1.5 rounded-md border border-emerald-100 bg-emerald-50/40 dark:bg-emerald-950/20 dark:border-emerald-900/40 p-3">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-foreground">{l.name}</p>
                      <p className="text-[10px] text-muted-foreground">{l.cargo} · {l.cidadePrincipal}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-emerald-700 dark:text-emerald-300 font-bold">
                        {formatNumberBR(cadastrados)} / {formatNumberBR(meta)}
                      </p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1 justify-end">
                        <Target className="h-2.5 w-2.5" /> {eficiencia} de eficiência
                      </p>
                    </div>
                  </div>
                  <Progress value={progresso} className="h-2 [&>div]:bg-emerald-500" />
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
