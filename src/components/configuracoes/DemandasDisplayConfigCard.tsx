import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Save, Eye } from "lucide-react";
import { toast } from "sonner";
import {
  ALL_DEMANDA_ORIGINS,
  useDemandasDisplayConfig,
} from "@/hooks/use-demandas-display-config";

export default function DemandasDisplayConfigCard() {
  const { config, isLoading, update } = useDemandasDisplayConfig();
  const [origins, setOrigins] = useState<string[]>([]);
  const [maxAgeDays, setMaxAgeDays] = useState<string>("");

  useEffect(() => {
    setOrigins(config.visibleOrigins);
    setMaxAgeDays(config.maxAgeDays != null ? String(config.maxAgeDays) : "");
  }, [config.visibleOrigins, config.maxAgeDays]);

  const toggle = (key: string) =>
    setOrigins((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );

  const handleSave = async () => {
    const days = maxAgeDays.trim() === "" ? null : Math.max(0, parseInt(maxAgeDays, 10));
    if (days !== null && Number.isNaN(days)) {
      toast.error("Tempo máximo inválido");
      return;
    }
    try {
      await update.mutateAsync({ visibleOrigins: origins, maxAgeDays: days });
      toast.success("Configuração de demandas salva!");
    } catch (e: any) {
      toast.error("Erro ao salvar: " + e.message);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Eye className="h-5 w-5 text-primary" />
          Exibição do Kanban de Demandas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-xs text-muted-foreground">
          Escolha quais tipos de cards aparecem no Kanban de Demandas e por
          quanto tempo eles ficam visíveis.
        </p>

        <div>
          <Label className="text-sm font-semibold">Tipos de cards visíveis</Label>
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ALL_DEMANDA_ORIGINS.map((o) => {
              const checked = origins.includes(o.key);
              return (
                <label
                  key={o.key}
                  className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 cursor-pointer hover:bg-muted/40"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggle(o.key)}
                    disabled={isLoading}
                  />
                  <span className="text-sm">{o.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="max-w-xs">
          <Label className="text-sm font-semibold">
            Tempo máximo de exibição (dias)
          </Label>
          <Input
            type="number"
            min={0}
            value={maxAgeDays}
            onChange={(e) => setMaxAgeDays(e.target.value)}
            placeholder="Ex.: 30 (vazio = sem limite)"
          />
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Cards mais antigos que esse período deixam de aparecer no Kanban.
            Deixe em branco para mostrar tudo.
          </p>
        </div>

        <Button
          onClick={handleSave}
          disabled={update.isPending || isLoading}
          className="gap-2"
        >
          <Save className="h-4 w-4" />
          {update.isPending ? "Salvando..." : "Salvar configuração"}
        </Button>
      </CardContent>
    </Card>
  );
}
