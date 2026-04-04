import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Trash2, FileText, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const STATES = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

const YEARS = ["2022", "2018", "2014"];

export default function AdminConfiguracoes() {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [selectedYear, setSelectedYear] = useState("2022");
  const [selectedState, setSelectedState] = useState("");

  const { data: files = [], isLoading } = useQuery({
    queryKey: ["tse-data-files"],
    queryFn: async () => {
      const { data, error } = await supabase.storage.from("tse-data").list("", {
        limit: 100,
        sortBy: { column: "name", order: "asc" },
      });
      if (error) throw error;
      return data || [];
    },
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv") && !file.name.endsWith(".csv.gz")) {
      toast.error("Apenas arquivos CSV ou CSV.GZ são aceitos.");
      return;
    }

    const uf = selectedState || file.name.match(/_([A-Z]{2})\.csv/i)?.[1]?.toUpperCase();
    const year = selectedYear || "2022";

    if (!uf || !STATES.includes(uf)) {
      toast.error("Selecione o estado ou use um arquivo com a UF no nome (ex: votacao_RJ.csv).");
      return;
    }

    const storageName = `votacao_${year}_${uf}.csv`;

    setUploading(true);
    try {
      // Remove existing file if any
      await supabase.storage.from("tse-data").remove([storageName]);

      const { error } = await supabase.storage
        .from("tse-data")
        .upload(storageName, file, {
          contentType: "text/csv",
          upsert: true,
        });

      if (error) throw error;

      toast.success(`✅ Arquivo ${storageName} enviado com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ["tse-data-files"] });
    } catch (err: any) {
      toast.error("Erro ao enviar: " + (err.message || "Erro desconhecido"));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDelete = async (fileName: string) => {
    try {
      const { error } = await supabase.storage.from("tse-data").remove([fileName]);
      if (error) throw error;
      toast.success(`Arquivo ${fileName} removido.`);
      queryClient.invalidateQueries({ queryKey: ["tse-data-files"] });
    } catch (err: any) {
      toast.error("Erro ao remover: " + err.message);
    }
  };

  const tseFiles = files.filter((f: any) => f.name.startsWith("votacao_"));

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-muted-foreground text-sm">Gerencie dados globais da plataforma</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Dados Eleitorais (TSE)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Faça upload dos arquivos CSV de votação do TSE por estado. 
            Baixe o arquivo ZIP em{" "}
            <a
              href="https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_candidato_munzona/votacao_candidato_munzona_2022.zip"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              cdn.tse.jus.br
            </a>
            , extraia o CSV do estado desejado e envie aqui.
          </p>

          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label>Ano da Eleição</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => (
                    <SelectItem key={y} value={y}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Estado (UF)</Label>
              <Select value={selectedState} onValueChange={setSelectedState}>
                <SelectTrigger className="w-28">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {STATES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label
                htmlFor="tse-upload"
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-md border cursor-pointer transition-colors
                  ${uploading ? "opacity-50 pointer-events-none" : "hover:bg-accent"}`}
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? "Enviando..." : "Enviar CSV"}
              </Label>
              <Input
                id="tse-upload"
                type="file"
                accept=".csv,.gz"
                className="hidden"
                onChange={handleUpload}
                disabled={uploading || !selectedState}
              />
            </div>
          </div>

          {!selectedState && (
            <p className="text-xs text-amber-600">Selecione o estado antes de enviar o arquivo.</p>
          )}

          {/* Uploaded files list */}
          <div className="border rounded-lg divide-y">
            {isLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">Carregando...</div>
            ) : tseFiles.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Nenhum arquivo TSE enviado ainda.
              </div>
            ) : (
              tseFiles.map((f: any) => {
                const match = f.name.match(/votacao_(\d+)_([A-Z]{2})\.csv/);
                const year = match?.[1] || "?";
                const state = match?.[2] || "?";
                const sizeMB = ((f.metadata?.size || 0) / 1024 / 1024).toFixed(1);

                return (
                  <div key={f.name} className="flex items-center gap-3 p-3">
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{f.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {state} • Eleição {year} • {sizeMB}MB
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">{state}</Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(f.name)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
