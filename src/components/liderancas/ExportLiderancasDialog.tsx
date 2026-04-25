import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Download, FileJson, FileText, FileCode } from "lucide-react";
import { toast } from "sonner";

interface FieldOption {
  key: string;
  label: string;
  get: (l: any) => any;
}

const FIELD_OPTIONS: FieldOption[] = [
  { key: "name", label: "Nome", get: (l) => l.name },
  { key: "cargo", label: "Cargo", get: (l) => l.cargo },
  { key: "cidade_principal", label: "Cidade Principal", get: (l) => l.cidadePrincipal },
  { key: "tipo", label: "Tipo", get: (l) => l.tipo },
  { key: "influencia", label: "Influência", get: (l) => l.influencia },
  { key: "classificacao", label: "Classificação", get: (l) => l.classificacao_manual || l.classificacao?.label || "" },
  { key: "whatsapp", label: "WhatsApp", get: (l) => l.whatsapp || "" },
  { key: "phone", label: "Telefone", get: (l) => l.phone || "" },
  { key: "email", label: "E-mail", get: (l) => l.email || "" },
  { key: "telegram", label: "Telegram", get: (l) => l.telegram_username || "" },
  { key: "instagram", label: "Instagram", get: (l) => l.instagram || "" },
  { key: "facebook", label: "Facebook", get: (l) => l.facebook || "" },
  { key: "youtube", label: "YouTube", get: (l) => l.youtube || "" },
  { key: "cep", label: "CEP", get: (l) => l.address_cep || "" },
  { key: "logradouro", label: "Logradouro", get: (l) => l.address_street || "" },
  { key: "numero", label: "Número", get: (l) => l.address_number || "" },
  { key: "bairro", label: "Bairro", get: (l) => l.address_neighborhood || "" },
  { key: "estado", label: "Estado", get: (l) => l.address_state || "" },
  {
    key: "meta_votos",
    label: "Meta de Votos",
    get: (l) => {
      if (l.meta_votos_valor == null) return "";
      return l.meta_votos_tipo === "fixo"
        ? `${l.meta_votos_valor} (fixo)`
        : `${l.meta_votos_valor}% (percentual)`;
    },
  },
  { key: "atuacao_count", label: "Cidades de atuação", get: (l) => l.atuacao?.length || 0 },
  { key: "score", label: "Score", get: (l) => l.score ?? "" },
  { key: "engajamento", label: "Engajamento", get: (l) => l.engajamento ?? 0 },
];

type Format = "csv" | "json" | "xml";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  liderancas: any[];
}

const DEFAULT_FIELDS = ["name", "cargo", "cidade_principal", "tipo", "whatsapp", "email"];

function escapeCSV(value: any): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(";") || str.includes('"') || str.includes("\n") || str.includes(",")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function escapeXML(value: any): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function ExportLiderancasDialog({ open, onOpenChange, liderancas }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set(DEFAULT_FIELDS));
  const [format, setFormat] = useState<Format>("csv");

  const toggleField = (key: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const toggleAll = (checked: boolean) => {
    if (checked) setSelected(new Set(FIELD_OPTIONS.map((f) => f.key)));
    else setSelected(new Set());
  };

  const handleExport = () => {
    if (selected.size === 0) {
      toast.error("Selecione ao menos um campo para exportar.");
      return;
    }
    if (liderancas.length === 0) {
      toast.error("Nenhuma liderança para exportar.");
      return;
    }

    const fields = FIELD_OPTIONS.filter((f) => selected.has(f.key));
    const rows = liderancas.map((l) => {
      const obj: Record<string, any> = {};
      for (const f of fields) {
        obj[f.label] = f.get(l) ?? "";
      }
      return obj;
    });

    const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const filename = `liderancas_${ts}`;

    if (format === "csv") {
      const headers = Object.keys(rows[0] || {});
      const csv = [
        headers.join(";"),
        ...rows.map((r) => headers.map((h) => escapeCSV(r[h])).join(";")),
      ].join("\r\n");
      downloadFile("\ufeff" + csv, `${filename}.csv`, "text/csv;charset=utf-8");
    } else if (format === "json") {
      downloadFile(JSON.stringify(rows, null, 2), `${filename}.json`, "application/json");
    } else {
      const xmlRows = rows
        .map((r) => {
          const inner = Object.entries(r)
            .map(([k, v]) => {
              const tag = k.replace(/[^a-zA-Z0-9]/g, "_");
              return `    <${tag}>${escapeXML(v)}</${tag}>`;
            })
            .join("\n");
          return `  <lideranca>\n${inner}\n  </lideranca>`;
        })
        .join("\n");
      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<liderancas>\n${xmlRows}\n</liderancas>`;
      downloadFile(xml, `${filename}.xml`, "application/xml");
    }

    toast.success(`${rows.length} registro(s) exportado(s) em ${format.toUpperCase()}`);
    onOpenChange(false);
  };

  const allChecked = selected.size === FIELD_OPTIONS.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Exportar Lideranças
          </DialogTitle>
          <DialogDescription>
            Selecione os campos e o formato desejado para exportar a base ({liderancas.length} registros).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-semibold">Campos a exportar</Label>
              <button
                type="button"
                onClick={() => toggleAll(!allChecked)}
                className="text-xs text-primary hover:underline"
              >
                {allChecked ? "Desmarcar todos" : "Selecionar todos"}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 p-3 rounded-md border bg-muted/30 max-h-64 overflow-y-auto">
              {FIELD_OPTIONS.map((f) => (
                <label
                  key={f.key}
                  className="flex items-center gap-2 text-xs cursor-pointer hover:bg-background/60 p-1 rounded"
                >
                  <Checkbox
                    checked={selected.has(f.key)}
                    onCheckedChange={(c) => toggleField(f.key, !!c)}
                  />
                  <span>{f.label}</span>
                </label>
              ))}
            </div>
          </div>

          <Separator />

          <div>
            <Label className="text-sm font-semibold mb-2 block">Formato do arquivo</Label>
            <RadioGroup value={format} onValueChange={(v) => setFormat(v as Format)} className="grid grid-cols-3 gap-2">
              <label
                className={`flex flex-col items-center justify-center gap-1 p-3 rounded-md border-2 cursor-pointer transition-all ${
                  format === "csv"
                    ? "border-primary bg-primary/10 ring-2 ring-primary/30 shadow-sm"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <RadioGroupItem value="csv" className="sr-only" />
                <FileText className={`h-5 w-5 ${format === "csv" ? "text-primary" : "text-emerald-600"}`} />
                <span className="text-xs font-medium">CSV</span>
                <span className="text-[10px] text-muted-foreground">Excel</span>
              </label>
              <label
                className={`flex flex-col items-center justify-center gap-1 p-3 rounded-md border-2 cursor-pointer transition-all ${
                  format === "json"
                    ? "border-primary bg-primary/10 ring-2 ring-primary/30 shadow-sm"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <RadioGroupItem value="json" className="sr-only" />
                <FileJson className={`h-5 w-5 ${format === "json" ? "text-primary" : "text-amber-600"}`} />
                <span className="text-xs font-medium">JSON</span>
                <span className="text-[10px] text-muted-foreground">API</span>
              </label>
              <label
                className={`flex flex-col items-center justify-center gap-1 p-3 rounded-md border-2 cursor-pointer transition-all ${
                  format === "xml"
                    ? "border-primary bg-primary/10 ring-2 ring-primary/30 shadow-sm"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <RadioGroupItem value="xml" className="sr-only" />
                <FileCode className={`h-5 w-5 ${format === "xml" ? "text-primary" : "text-blue-600"}`} />
                <span className="text-xs font-medium">XML</span>
                <span className="text-[10px] text-muted-foreground">Estruturado</span>
              </label>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            Exportar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
