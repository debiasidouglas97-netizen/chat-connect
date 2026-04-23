import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Upload, FileText, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const STATES = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

const YEARS = ["2022", "2018", "2014"];
const ELEITORADO_YEARS = ["2024", "2022", "2020"];

export default function AdminConfiguracoes() {
  const queryClient = useQueryClient();
  const [uploadingState, setUploadingState] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState("2022");
  const [eleitoradoYear, setEleitoradoYear] = useState("2024");
  const [uploadingEleitorado, setUploadingEleitorado] = useState(false);

  const { data: files = [], isLoading } = useQuery({
    queryKey: ["tse-data-files"],
    queryFn: async () => {
      const { data, error } = await supabase.storage.from("tse-data").list("", {
        limit: 200,
        sortBy: { column: "name", order: "asc" },
      });
      if (error) throw error;
      return data || [];
    },
  });

  const getFileForState = (uf: string) => {
    return files.find((f: any) => {
      const name = f.name.toLowerCase();
      const ufLower = uf.toLowerCase();
      const year = selectedYear;
      return (
        name.includes(`_${year}_${ufLower}`) ||
        name.includes(`_${ufLower}_${year}`) ||
        name.includes(`votacao_${year}_${ufLower}`)
      );
    });
  };

  const handleUpload = async (uf: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    const allowed = ["csv", "gz", "zip"];
    if (!ext || !allowed.includes(ext)) {
      toast.error("Apenas arquivos CSV, CSV.GZ ou ZIP são aceitos.");
      return;
    }

    setUploadingState(uf);

    try {
      // Determine storage name based on file type
      let storageName: string;
      if (file.name.endsWith(".csv.gz") || file.name.endsWith(".gz")) {
        storageName = `votacao_${selectedYear}_${uf}.csv.gz`;
      } else if (file.name.endsWith(".zip")) {
        storageName = `votacao_${selectedYear}_${uf}.zip`;
      } else {
        storageName = `votacao_${selectedYear}_${uf}.csv`;
      }

      // Remove any existing files for this state/year
      const possibleNames = [
        `votacao_${selectedYear}_${uf}.csv`,
        `votacao_${selectedYear}_${uf}.csv.gz`,
        `votacao_${selectedYear}_${uf}.zip`,
      ];
      await supabase.storage.from("tse-data").remove(possibleNames);

      const contentType = file.name.endsWith(".zip")
        ? "application/zip"
        : file.name.endsWith(".gz")
        ? "application/gzip"
        : "text/csv";

      const { error } = await supabase.storage
        .from("tse-data")
        .upload(storageName, file, { contentType, upsert: true });

      if (error) throw error;

      toast.success(`✅ ${uf} — arquivo enviado com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ["tse-data-files"] });
    } catch (err: any) {
      toast.error(`Erro ao enviar ${uf}: ${err.message || "Erro desconhecido"}`);
    } finally {
      setUploadingState(null);
      e.target.value = "";
    }
  };

  const handleDelete = async (uf: string) => {
    const possibleNames = [
      `votacao_${selectedYear}_${uf}.csv`,
      `votacao_${selectedYear}_${uf}.csv.gz`,
      `votacao_${selectedYear}_${uf}.zip`,
    ];
    try {
      await supabase.storage.from("tse-data").remove(possibleNames);
      toast.success(`Dados de ${uf} removidos.`);
      queryClient.invalidateQueries({ queryKey: ["tse-data-files"] });
    } catch (err: any) {
      toast.error("Erro ao remover: " + err.message);
    }
  };

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
            Faça upload dos arquivos CSV (ou compactados .csv.gz / .zip) de votação do TSE por estado.
            Baixe em{" "}
            <a
              href="https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_candidato_munzona/votacao_candidato_munzona_2022.zip"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              cdn.tse.jus.br
            </a>
            , extraia o CSV do estado desejado e envie aqui. Arquivos compactados são recomendados.
          </p>

          <div className="flex items-end gap-3">
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
          </div>

          {/* States grid */}
          <div className="border rounded-lg divide-y">
            {isLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">Carregando...</div>
            ) : (
              STATES.map((uf) => {
                const existingFile = getFileForState(uf);
                const isUploading = uploadingState === uf;
                const sizeMB = existingFile
                  ? ((existingFile.metadata?.size || 0) / 1024 / 1024).toFixed(1)
                  : null;

                return (
                  <div key={uf} className="flex items-center gap-3 p-3">
                    {existingFile ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                    )}

                    <Badge variant={existingFile ? "default" : "outline"} className="w-10 justify-center text-xs">
                      {uf}
                    </Badge>

                    <div className="flex-1 min-w-0">
                      {existingFile ? (
                        <p className="text-xs text-muted-foreground">
                          {existingFile.name} • {sizeMB}MB
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">Sem dados</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {existingFile && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-destructive hover:text-destructive"
                          onClick={() => handleDelete(uf)}
                        >
                          Remover
                        </Button>
                      )}

                      <Label
                        htmlFor={`upload-${uf}`}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs cursor-pointer transition-colors
                          ${isUploading ? "opacity-50 pointer-events-none" : "hover:bg-accent"}`}
                      >
                        {isUploading ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Upload className="h-3 w-3" />
                        )}
                        {isUploading ? "Enviando..." : existingFile ? "Substituir" : "Enviar"}
                      </Label>
                      <input
                        id={`upload-${uf}`}
                        type="file"
                        accept=".csv,.gz,.zip"
                        className="hidden"
                        onChange={(e) => handleUpload(uf, e)}
                        disabled={isUploading}
                      />
                    </div>
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
