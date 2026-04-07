import { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Upload, Image, File, Download, Trash2, Search, Filter, X, Eye } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDocumentos, type DocumentoGrupo, type DocumentoArquivo } from "@/hooks/use-documentos";
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
  const { grupos, isLoading, uploadManual, deleteManual, getPublicUrl } = useDocumentos();
  const [search, setSearch] = useState("");
  const [filtroOrigem, setFiltroOrigem] = useState<string>("todos");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Lightbox state
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxName, setLightboxName] = useState("");

  const filtered = grupos.filter((g) => {
    if (filtroOrigem !== "todos" && g.origem !== filtroOrigem) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        g.titulo.toLowerCase().includes(s) ||
        g.arquivos.some((a) => a.file_name.toLowerCase().includes(s))
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

  const handleDeleteCard = async (grupo: DocumentoGrupo) => {
    if (grupo.origem !== "manual") return;
    try {
      for (const arq of grupo.arquivos) {
        await deleteManual.mutateAsync({ id: arq.id, storage_path: arq.storage_path });
      }
      toast.success("Documento removido da listagem");
    } catch {
      toast.error("Erro ao remover");
    }
  };

  const openLightbox = useCallback((bucket: string, storagePath: string, fileName: string) => {
    setLightboxUrl(getPublicUrl(bucket, storagePath));
    setLightboxName(fileName);
  }, [getPublicUrl]);

  const downloadFile = useCallback((bucket: string, storagePath: string) => {
    const url = getPublicUrl(bucket, storagePath);
    window.open(url, "_blank");
  }, [getPublicUrl]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
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
            placeholder="Buscar por título ou arquivo..."
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

      {/* Lista de Cards Agrupados */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground text-center py-8">Carregando documentos...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhum documento encontrado</p>
      ) : (
        <div className="space-y-4">
          {filtered.map((grupo) => (
            <Card key={grupo.key} className="hover:shadow-md transition-shadow overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <Badge variant={ORIGEM_COLORS[grupo.origem]} className="shrink-0 text-[10px]">
                      {ORIGEM_LABELS[grupo.origem]}
                    </Badge>
                    <CardTitle className="text-base truncate">{grupo.titulo}</CardTitle>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {grupo.arquivos.length} {grupo.arquivos.length === 1 ? "arquivo" : "arquivos"}
                    </span>
                  </div>
                  {grupo.origem === "manual" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive shrink-0"
                      onClick={() => handleDeleteCard(grupo)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {grupo.arquivos.map((arq) => {
                    const isImage = arq.file_type.startsWith("image/");
                    const url = getPublicUrl(arq.bucket, arq.storage_path);
                    const Icon = getFileIcon(arq.file_type);

                    return (
                      <div
                        key={arq.id}
                        className="group relative rounded-lg border bg-muted/30 overflow-hidden"
                      >
                        {/* Thumbnail / Icon */}
                        <div
                          className="aspect-square flex items-center justify-center cursor-pointer overflow-hidden bg-muted/50"
                          onClick={() => {
                            if (isImage) {
                              openLightbox(arq.bucket, arq.storage_path, arq.file_name);
                            } else {
                              downloadFile(arq.bucket, arq.storage_path);
                            }
                          }}
                        >
                          {isImage ? (
                            <img
                              src={url}
                              alt={arq.file_name}
                              className="w-full h-full object-cover transition-transform group-hover:scale-105"
                              loading="lazy"
                            />
                          ) : (
                            <Icon className="h-10 w-10 text-muted-foreground" />
                          )}

                          {/* Hover overlay */}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <Eye className="h-6 w-6 text-white" />
                          </div>
                        </div>

                        {/* File info */}
                        <div className="p-2 space-y-1">
                          <p className="text-[11px] font-medium text-foreground truncate" title={arq.file_name}>
                            {arq.file_name}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-muted-foreground">
                              {formatFileSize(arq.file_size)}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => downloadFile(arq.bucket, arq.storage_path)}
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(arq.created_at), "dd MMM yyyy", { locale: ptBR })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-white/80 z-50"
            onClick={() => setLightboxUrl(null)}
          >
            <X className="h-8 w-8" />
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 z-50">
            <span className="text-white text-sm">{lightboxName}</span>
            <Button
              size="sm"
              variant="secondary"
              className="gap-1"
              onClick={(e) => {
                e.stopPropagation();
                window.open(lightboxUrl, "_blank");
              }}
            >
              <Download className="h-4 w-4" /> Baixar
            </Button>
          </div>
          <img
            src={lightboxUrl}
            alt={lightboxName}
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
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
