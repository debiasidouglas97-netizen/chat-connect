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
import type { EleitorRow } from "@/hooks/use-eleitores";

interface FieldOption {
  key: keyof EleitorRow;
  label: string;
}

const FIELD_OPTIONS: FieldOption[] = [
  { key: "nome", label: "Nome" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "cidade", label: "Cidade" },
  { key: "telegram", label: "Telegram" },
  { key: "email", label: "E-mail" },
  { key: "cep", label: "CEP" },
  { key: "logradouro", label: "Logradouro" },
  { key: "numero", label: "Número" },
  { key: "bairro", label: "Bairro" },
  { key: "estado", label: "Estado" },
  { key: "observacoes", label: "Observações" },
  { key: "created_at", label: "Data de cadastro" },
];

type Format = "csv" | "json" | "xml";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  eleitores: EleitorRow[];
  liderancaMap: Map<string, any>;
}

const DEFAULT_FIELDS: (keyof EleitorRow)[] = ["nome", "whatsapp", "cidade", "telegram", "email"];

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

export default function ExportEleitoresDialog({ open, onOpenChange, eleitores, liderancaMap }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set(DEFAULT_FIELDS));
  const [includeLideranca, setIncludeLideranca] = useState(true);
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
    if (checked) {
      setSelected(new Set(FIELD_OPTIONS.map((f) => f.key as string)));
      setIncludeLideranca(true);
    } else {
      setSelected(new Set());
      setIncludeLideranca(false);
    }
  };

  const handleExport = () => {
    if (selected.size === 0 && !includeLideranca) {
      toast.error("Selecione ao menos um campo para exportar.");
      return;
    }
    if (eleitores.length === 0) {
      toast.error("Nenhum eleitor para exportar.");
      return;
    }

    const fields = FIELD_OPTIONS.filter((f) => selected.has(f.key as string));
    const rows = eleitores.map((e) => {
      const obj: Record<string, any> = {};
      for (const f of fields) {
        let val: any = e[f.key];
        if (f.key === "created_at" && val) {
          val = new Date(val).toLocaleString("pt-BR");
        }
        obj[f.label] = val ?? "";
      }
      if (includeLideranca) {
        const lid = e.lideranca_id ? liderancaMap.get(e.lideranca_id) : null;
        obj["Liderança"] = lid?.name || "";
      }
      return obj;
    });

    const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const filename = `eleitores_${ts}`;

    if (format === "csv") {
      const headers = Object.keys(rows[0] || {});
      const csv = [
        "sep=;",
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
          return `  <eleitor>\n${inner}\n  </eleitor>`;
        })
        .join("\n");
      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<eleitores>\n${xmlRows}\n</eleitores>`;
      downloadFile(xml, `${filename}.xml`, "application/xml");
    }

    toast.success(`${rows.length} registro(s) exportado(s) em ${format.toUpperCase()}`);
    onOpenChange(false);
  };

  const allChecked =
    selected.size === FIELD_OPTIONS.length && includeLideranca;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Exportar Eleitores
          </DialogTitle>
          <DialogDescription>
            Selecione os campos e o formato desejado para exportar a base ({eleitores.length} registros).
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
                  key={f.key as string}
                  className="flex items-center gap-2 text-xs cursor-pointer hover:bg-background/60 p-1 rounded"
                >
                  <Checkbox
                    checked={selected.has(f.key as string)}
                    onCheckedChange={(c) => toggleField(f.key as string, !!c)}
                  />
                  <span>{f.label}</span>
                </label>
              ))}
              <label className="flex items-center gap-2 text-xs cursor-pointer hover:bg-background/60 p-1 rounded">
                <Checkbox
                  checked={includeLideranca}
                  onCheckedChange={(c) => setIncludeLideranca(!!c)}
                />
                <span>Liderança vinculada</span>
              </label>
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
