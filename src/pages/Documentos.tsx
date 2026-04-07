import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Upload, Image, File, Download, Trash2, Search, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDocumentos, type DocumentoUnificado } from "@/hooks/use-documentos";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(type: string) {
  if (type.startsWith("image/")) return Image;
  if (type === "application/pdf") return FileText;
  return File;
}

const ORIGEM_LABELS: Record<string, string> = {
  emenda: "Emenda",
  demanda: "Demanda",
  manual: "Manual",
};

const ORIGEM_COLORS: Record<string, "default" | "secondary" | "outline"> = {
  emenda: "default",
  demanda: "secondary",
  manual: "outline",
};

export default function Documentos() {
  const { docs, isLoading, uploadManual, deleteManual, getPublicUrl } = useDocumentos();
  const [search, setSearch] = useState("");
  const [filtroOrigem, setFiltroOrigem] = useState<string>("todos");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = docs.filter((d) => {
    if (filtroOrigem !== "todos" && d.origem !== filtroOrigem) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        d.titulo.toLowerCase().includes(s) ||
        d.file_name.toLowerCase().includes(s) ||
        d.origem_titulo.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const handleUpload = async () => {
    if (!selectedFile || !titulo.trim()) return;
    try {
      await uploadManual.mutateAsync({ file: selectedFile, titulo: titulo.trim() });
      toast.success("Documento enviado com sucesso");
      setUploadOpen(false);
      setTitulo("");
      setSelectedFile(null);
    } catch {
      toast.error("Erro ao enviar documento");
    }
  };

  const handleDelete = async (doc: DocumentoUnificado) => {
    if (doc.origem !== "manual") return;
    try {
      await deleteManual.mutateAsync(doc);
      toast.success("Documento removido");
    } catch {
      toast.error("Erro ao remover");
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Documentos</h1>
          <p className="text-sm text-muted-foreground">
            Arquivos de emendas, demandas e uploads manuais
          </p>
        </div>
        <Button className="gap-2" onClick={() => setUploadOpen(true)}>
          <Upload className="h-4 w-4" /> Upload Manual
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título, arquivo ou origem..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filtroOrigem} onValueChange={setFiltroOrigem}>
          <SelectTrigger className="w-40">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="emenda">Emendas</SelectItem>
            <SelectItem value="demanda">Demandas</SelectItem>
            <SelectItem value="manual">Manuais</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground text-center py-8">Carregando documentos...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhum documento encontrado</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((doc) => {
            const Icon = getFileIcon(doc.file_type);
            return (
              <Card key={`${doc.origem}-${doc.id}`} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{doc.file_name}</p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <Badge variant={ORIGEM_COLORS[doc.origem]} className="text-[10px]">
                        {ORIGEM_LABELS[doc.origem]}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground font-medium truncate max-w-[200px]">
                        {doc.origem_titulo}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(doc.created_at), "dd MMM yyyy", { locale: ptBR })}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatFileSize(doc.file_size)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => window.open(getPublicUrl(doc), "_blank")}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    {doc.origem === "manual" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleDelete(doc)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload de Documento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Título do documento *</Label>
              <Input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex: Ofício 234/2024 — Prefeitura"
              />
            </div>
            <div>
              <Label className="text-xs">Arquivo *</Label>
              <div
                className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors mt-1"
                onClick={() => fileRef.current?.click()}
              >
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <span className="text-sm">{selectedFile.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({formatFileSize(selectedFile.size)})
                    </span>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Clique para selecionar</p>
                    <p className="text-xs text-muted-foreground mt-1">PDF, DOC, JPG, PNG — máx. 20MB</p>
                  </>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleUpload}
                disabled={!titulo.trim() || !selectedFile || uploadManual.isPending}
              >
                {uploadManual.isPending ? "Enviando..." : "Enviar"}
              </Button>
              <Button variant="ghost" onClick={() => setUploadOpen(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
