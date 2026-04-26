import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowDown, ArrowUp, Plus, Trash2, Pencil } from "lucide-react";
import { slugifyFieldKey } from "@/lib/form-config-defaults";
import type { CustomFieldConfig, CustomFieldType } from "@/lib/form-config-types";
import { toast } from "sonner";

interface Props {
  fields: CustomFieldConfig[];
  onChange: (next: CustomFieldConfig[]) => void;
}

const TYPE_LABELS: Record<CustomFieldType, string> = {
  text: "Texto",
  textarea: "Texto longo",
  number: "Número",
  select: "Lista (select)",
  checkbox: "Sim/Não",
  date: "Data",
  phone: "Telefone",
  url: "URL",
};

export default function CustomFieldsConfigList({ fields, onChange }: Props) {
  const [editing, setEditing] = useState<CustomFieldConfig | null>(null);
  const [creating, setCreating] = useState(false);

  const ordered = [...fields].sort((a, b) => a.order - b.order);

  const move = (key: string, dir: -1 | 1) => {
    const idx = ordered.findIndex((f) => f.key === key);
    const target = idx + dir;
    if (target < 0 || target >= ordered.length) return;
    const a = ordered[idx];
    const b = ordered[target];
    onChange(
      fields.map((f) => {
        if (f.key === a.key) return { ...f, order: b.order };
        if (f.key === b.key) return { ...f, order: a.order };
        return f;
      }),
    );
  };

  const remove = (key: string) => onChange(fields.filter((f) => f.key !== key));

  const upsert = (field: CustomFieldConfig) => {
    const exists = fields.some((f) => f.key === field.key);
    if (exists) {
      onChange(fields.map((f) => (f.key === field.key ? field : f)));
    } else {
      onChange([...fields, field]);
    }
    setEditing(null);
    setCreating(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Crie campos exclusivos para o seu mandato (zona eleitoral, tags, observações estratégicas...).
        </p>
        <Button size="sm" onClick={() => setCreating(true)} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Novo campo
        </Button>
      </div>

      {ordered.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Nenhum campo personalizado criado ainda.
        </Card>
      ) : (
        <div className="border rounded-lg divide-y">
          {ordered.map((f) => (
            <div key={f.key} className="flex items-center gap-3 p-3 hover:bg-muted/30">
              <div className="flex flex-col">
                <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => move(f.key, -1)}>
                  <ArrowUp className="h-3 w-3" />
                </Button>
                <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => move(f.key, 1)}>
                  <ArrowDown className="h-3 w-3" />
                </Button>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{f.label}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Badge variant="outline" className="text-[10px] py-0">
                    {TYPE_LABELS[f.type]}
                  </Badge>
                  {f.required && (
                    <Badge variant="outline" className="text-[10px] py-0 text-destructive border-destructive/30">
                      obrigatório
                    </Badge>
                  )}
                  {!f.visible && (
                    <Badge variant="outline" className="text-[10px] py-0">
                      oculto
                    </Badge>
                  )}
                </div>
              </div>

              <Switch
                checked={f.visible}
                onCheckedChange={(v) =>
                  onChange(fields.map((x) => (x.key === f.key ? { ...x, visible: v } : x)))
                }
              />

              <Button size="icon" variant="ghost" onClick={() => setEditing(f)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => remove(f.key)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <CustomFieldEditor
        open={creating || editing !== null}
        existing={editing}
        existingKeys={fields.map((f) => f.key)}
        nextOrder={fields.length}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSave={upsert}
      />
    </div>
  );
}

// -------------------------------------------------------------------------

interface EditorProps {
  open: boolean;
  existing: CustomFieldConfig | null;
  existingKeys: string[];
  nextOrder: number;
  onClose: () => void;
  onSave: (field: CustomFieldConfig) => void;
}

function CustomFieldEditor({ open, existing, existingKeys, nextOrder, onClose, onSave }: EditorProps) {
  const [label, setLabel] = useState(existing?.label || "");
  const [type, setType] = useState<CustomFieldType>(existing?.type || "text");
  const [required, setRequired] = useState(existing?.required || false);
  const [visible, setVisible] = useState(existing?.visible ?? true);
  const [optionsText, setOptionsText] = useState((existing?.options || []).join("\n"));
  const [helperText, setHelperText] = useState(existing?.helperText || "");

  // Reset when opening
  useState(() => {
    if (open) {
      setLabel(existing?.label || "");
      setType(existing?.type || "text");
      setRequired(existing?.required || false);
      setVisible(existing?.visible ?? true);
      setOptionsText((existing?.options || []).join("\n"));
      setHelperText(existing?.helperText || "");
    }
  });

  const handleSave = () => {
    const trimmed = label.trim();
    if (!trimmed) {
      toast.error("Informe o nome do campo");
      return;
    }
    const key = existing?.key || slugifyFieldKey(trimmed);
    if (!existing && existingKeys.includes(key)) {
      toast.error("Já existe um campo com esse nome. Escolha outro.");
      return;
    }
    const opts =
      type === "select"
        ? optionsText
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];
    if (type === "select" && opts.length < 2) {
      toast.error("Listas precisam de pelo menos 2 opções.");
      return;
    }
    onSave({
      key,
      label: trimmed,
      type,
      visible,
      required,
      order: existing?.order ?? nextOrder,
      options: opts,
      helperText: helperText.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{existing ? "Editar campo" : "Novo campo personalizado"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Nome do campo *</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ex: Zona eleitoral, Base, Tags estratégicas"
            />
          </div>
          <div>
            <Label className="text-xs">Tipo *</Label>
            <Select value={type} onValueChange={(v) => setType(v as CustomFieldType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TYPE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {type === "select" && (
            <div>
              <Label className="text-xs">Opções (uma por linha)</Label>
              <textarea
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[100px]"
                value={optionsText}
                onChange={(e) => setOptionsText(e.target.value)}
                placeholder={"Religioso\nEmpresarial\nComunitário"}
              />
            </div>
          )}

          <div>
            <Label className="text-xs">Texto de ajuda (opcional)</Label>
            <Input
              value={helperText}
              onChange={(e) => setHelperText(e.target.value)}
              placeholder="Aparece logo abaixo do campo"
            />
          </div>

          <div className="flex items-center gap-6 pt-1">
            <label className="flex items-center gap-2 text-xs">
              <Switch checked={visible} onCheckedChange={setVisible} /> Visível
            </label>
            <label className="flex items-center gap-2 text-xs">
              <Switch checked={required} onCheckedChange={setRequired} /> Obrigatório
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>{existing ? "Salvar" : "Criar campo"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
