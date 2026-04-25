import { useEffect, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Target, Percent, Hash } from "lucide-react";
import { useCidades } from "@/hooks/use-cidades";

export type MetaVotosTipo = "percentual" | "fixo";

interface Props {
  cargo: string;
  cidadePrincipal: string;
  tipo: MetaVotosTipo;
  valor: number | null;
  onChange: (tipo: MetaVotosTipo, valor: number | null) => void;
}

function detectCargoCategoria(cargo: string): "prefeito" | "vice_prefeito" | "vereador" | "outros" {
  const c = (cargo || "").toLowerCase();
  if (c.includes("vice") && c.includes("prefeit")) return "vice_prefeito";
  if (c.includes("prefeit")) return "prefeito";
  if (c.includes("vereador")) return "vereador";
  return "outros";
}

function getDefaults(cargo: string): { tipo: MetaVotosTipo; valor: number } {
  const cat = detectCargoCategoria(cargo);
  if (cat === "prefeito") return { tipo: "percentual", valor: 3 };
  if (cat === "vice_prefeito") return { tipo: "percentual", valor: 0.6 };
  if (cat === "vereador") return { tipo: "percentual", valor: 0.3 };
  return { tipo: "fixo", valor: 100 };
}

function getRangeOptions(cargo: string): number[] {
  const cat = detectCargoCategoria(cargo);
  if (cat === "prefeito") {
    return Array.from({ length: 20 }, (_, i) => i + 1); // 1..20
  }
  if (cat === "vice_prefeito" || cat === "vereador") {
    // 0.1..10.0 com passo 0.1 — permite escolher 0,6% etc.
    return Array.from({ length: 100 }, (_, i) => Number(((i + 1) / 10).toFixed(1)));
  }
  // outros: também oferecemos %, mas com passo padrão
  return Array.from({ length: 20 }, (_, i) => i + 1);
}

function formatNum(n: number): string {
  return new Intl.NumberFormat("pt-BR").format(Math.round(n));
}

export default function MetaVotosInput({ cargo, cidadePrincipal, tipo, valor, onChange }: Props) {
  const { cidades } = useCidades();

  const eleitores = useMemo(() => {
    const cidade = cidades.find((c) => c.name === cidadePrincipal);
    return cidade?.eleitores2024 || 0;
  }, [cidades, cidadePrincipal]);

  // Aplica defaults quando o cargo muda e ainda não há valor configurado
  useEffect(() => {
    if (valor === null || valor === undefined) {
      const def = getDefaults(cargo);
      onChange(def.tipo, def.valor);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cargo]);

  const cat = detectCargoCategoria(cargo);
  const rangeOptions = getRangeOptions(cargo);
  const currentValor = valor ?? getDefaults(cargo).valor;

  const estimativaVotos = useMemo(() => {
    if (tipo === "fixo") return currentValor;
    if (!eleitores) return 0;
    return (eleitores * currentValor) / 100;
  }, [tipo, currentValor, eleitores]);

  const handleTipoChange = (newTipo: string) => {
    if (!newTipo || (newTipo !== "percentual" && newTipo !== "fixo")) return;
    if (newTipo === tipo) return;
    if (newTipo === "percentual") {
      const def = getDefaults(cargo);
      onChange("percentual", def.tipo === "percentual" ? def.valor : 1);
    } else {
      // ao mudar para fixo, propor estimativa atual ou 100
      const propose = estimativaVotos > 0 ? Math.round(estimativaVotos) : 100;
      onChange("fixo", propose);
    }
  };

  return (
    <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs flex items-center gap-1.5 font-medium">
          <Target className="h-3.5 w-3.5 text-primary" />
          Meta de votos esperados
        </Label>
        <ToggleGroup
          type="single"
          value={tipo}
          onValueChange={handleTipoChange}
          size="sm"
          className="h-7"
        >
          <ToggleGroupItem value="percentual" className="h-7 px-2 text-[11px] data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
            <Percent className="h-3 w-3 mr-1" /> %
          </ToggleGroupItem>
          <ToggleGroupItem value="fixo" className="h-7 px-2 text-[11px] data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
            <Hash className="h-3 w-3 mr-1" /> Fixo
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="flex items-center gap-2">
        {tipo === "percentual" ? (
          <Select
            value={String(currentValor)}
            onValueChange={(v) => onChange("percentual", Number(v))}
          >
            <SelectTrigger className="h-9 flex-1">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {rangeOptions.map((opt) => (
                <SelectItem key={opt} value={String(opt)}>
                  {(cat === "vereador" || cat === "vice_prefeito") ? opt.toFixed(1).replace(".", ",") : opt}%
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            type="number"
            min={1}
            step={1}
            value={currentValor}
            onChange={(e) => onChange("fixo", e.target.value === "" ? null : Number(e.target.value))}
            placeholder="Ex: 100"
            className="h-9 flex-1"
          />
        )}

        <Badge variant="secondary" className="h-9 px-2.5 text-xs whitespace-nowrap">
          Estimativa: <span className="font-bold ml-1">{formatNum(estimativaVotos)}</span>
          <span className="ml-1 text-muted-foreground">votos</span>
        </Badge>
      </div>

      {tipo === "percentual" && (
        <p className="text-[10px] text-muted-foreground">
          Base: {formatNum(eleitores)} eleitores em {cidadePrincipal || "—"}
          {!eleitores && " (sem dados de eleitorado)"}
        </p>
      )}
    </div>
  );
}
