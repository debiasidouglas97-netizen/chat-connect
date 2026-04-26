import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowDown, ArrowUp, Lock } from "lucide-react";
import { NATIVE_FIELDS_CATALOG } from "@/lib/form-config-defaults";
import type { FormSegment, NativeFieldConfig } from "@/lib/form-config-types";

interface Props {
  segment: FormSegment;
  config: Record<string, NativeFieldConfig>;
  onChange: (next: Record<string, NativeFieldConfig>) => void;
}

/**
 * Lista os campos nativos do segmento agrupados, com toggles de visibilidade,
 * obrigatoriedade, label customizável e reordenação dentro do grupo.
 */
export default function NativeFieldsConfigList({ segment, config, onChange }: Props) {
  const catalog = NATIVE_FIELDS_CATALOG[segment];

  // Agrupa por `group`, mantendo ordem do catálogo dentro de cada grupo
  // mas exibindo conforme `order` da config.
  const grouped = catalog.reduce<Record<string, typeof catalog>>((acc, def) => {
    (acc[def.group] ||= []).push(def);
    return acc;
  }, {});

  const update = (key: string, patch: Partial<NativeFieldConfig>) => {
    onChange({
      ...config,
      [key]: {
        ...config[key],
        key,
        visible: config[key]?.visible ?? true,
        required: config[key]?.required ?? false,
        order: config[key]?.order ?? 0,
        ...patch,
      },
    });
  };

  const move = (key: string, dir: -1 | 1) => {
    // Reordena dentro do grupo do campo
    const def = catalog.find((d) => d.key === key);
    if (!def) return;
    const groupKeys = (grouped[def.group] || []).map((d) => d.key);
    const ordered = [...groupKeys].sort(
      (a, b) => (config[a]?.order ?? 0) - (config[b]?.order ?? 0),
    );
    const idx = ordered.indexOf(key);
    const target = idx + dir;
    if (target < 0 || target >= ordered.length) return;
    const swap = ordered[target];
    const newConfig = { ...config };
    const a = config[key]?.order ?? 0;
    const b = config[swap]?.order ?? 0;
    newConfig[key] = { ...config[key], key, order: b };
    newConfig[swap] = { ...config[swap], key: swap, order: a };
    onChange(newConfig);
  };

  return (
    <div className="space-y-5">
      {Object.entries(grouped).map(([group, defs]) => {
        const ordered = [...defs].sort(
          (a, b) => (config[a.key]?.order ?? 0) - (config[b.key]?.order ?? 0),
        );
        return (
          <div key={group} className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {group}
            </p>
            <div className="border rounded-lg divide-y">
              {ordered.map((def) => {
                const cfg = config[def.key] || {
                  key: def.key,
                  visible: true,
                  required: !!def.locked,
                  order: 0,
                };
                const locked = def.locked;
                return (
                  <div
                    key={def.key}
                    className="flex flex-wrap items-center gap-3 p-3 hover:bg-muted/30 transition-colors"
                  >
                    {/* reorder */}
                    <div className="flex flex-col">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-5 w-5"
                        onClick={() => move(def.key, -1)}
                      >
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-5 w-5"
                        onClick={() => move(def.key, 1)}
                      >
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                    </div>

                    <div className="flex-1 min-w-[200px]">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium">{def.defaultLabel}</span>
                        {locked && (
                          <Badge variant="outline" className="gap-1 text-[10px] py-0">
                            <Lock className="h-2.5 w-2.5" /> obrigatório
                          </Badge>
                        )}
                      </div>
                      <Input
                        value={cfg.label ?? ""}
                        onChange={(e) => update(def.key, { label: e.target.value })}
                        placeholder={`Rótulo (default: ${def.defaultLabel})`}
                        className="h-7 text-xs mt-1"
                      />
                    </div>

                    <label className="flex items-center gap-2 text-xs">
                      <Switch
                        checked={cfg.visible}
                        onCheckedChange={(v) => update(def.key, { visible: v })}
                        disabled={locked}
                      />
                      Visível
                    </label>

                    <label className="flex items-center gap-2 text-xs">
                      <Switch
                        checked={cfg.required}
                        onCheckedChange={(v) => update(def.key, { required: v })}
                        disabled={locked}
                      />
                      Obrigatório
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
