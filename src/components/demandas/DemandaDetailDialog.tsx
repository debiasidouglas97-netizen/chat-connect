import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileUploadZone, type AttachedFile } from "./FileUploadZone";
import { MapPin, User, Download, Trash2, Eye, FileText, Image, File, Clock } from "lucide-react";
import type { Demanda, HistoryEntry } from "./types";

const priorityColors: Record<string, string> = {
  Urgente: "bg-destructive/10 text-destructive border-destructive/20",
  Alta: "bg-warning/10 text-warning border-warning/20",
  Média: "bg-info/10 text-info border-info/20",
  Baixa: "bg-muted text-muted-foreground",
};

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(type: string) {
  if (type.startsWith("image/")) return Image;
  if (type === "application/pdf") return FileText;
  return File;
}

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

interface DemandaDetailDialogProps {
  demanda: Demanda | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (demanda: Demanda) => void;
}

export function DemandaDetailDialog({ demanda, open, onOpenChange, onUpdate }: DemandaDetailDialogProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  if (!demanda) return null;

  const handleAddFiles = (newFiles: AttachedFile[]) => {
    const newHistory: HistoryEntry[] = newFiles
      .filter((f) => !demanda.attachments.find((a) => a.id === f.id))
      .map((f) => ({
        id: crypto.randomUUID(),
        action: `Arquivo "${f.name}" anexado`,
        user: "Usuário atual",
        date: new Date(),
      }));
    onUpdate({
      ...demanda,
      attachments: newFiles,
      history: [...demanda.history, ...newHistory],
    });
  };

  const handleDeleteFile = (fileId: string) => {
    const file = demanda.attachments.find((f) => f.id === fileId);
    if (!file) return;
    onUpdate({
      ...demanda,
      attachments: demanda.attachments.filter((f) => f.id !== fileId),
      history: [
        ...demanda.history,
        { id: crypto.randomUUID(), action: `Arquivo "${file.name}" removido`, user: "Usuário atual", date: new Date() },
      ],
    });
  };

  const handleDownload = (file: AttachedFile) => {
    const a = document.createElement("a");
    a.href = file.url;
    a.download = file.name;
    a.click();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">{demanda.title}</DialogTitle>
            <div className="flex items-center gap-3 pt-1">
              <Badge variant="outline" className={priorityColors[demanda.priority]}>{demanda.priority}</Badge>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {demanda.city}
              </span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <User className="h-3 w-3" /> {demanda.responsible}
              </span>
            </div>
          </DialogHeader>

          {demanda.description && (
            <p className="text-sm text-muted-foreground">{demanda.description}</p>
          )}

          <Tabs defaultValue="arquivos" className="mt-2">
            <TabsList className="w-full">
              <TabsTrigger value="arquivos" className="flex-1">
                📂 Arquivos ({demanda.attachments.length})
              </TabsTrigger>
              <TabsTrigger value="historico" className="flex-1">
                📋 Histórico ({demanda.history.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="arquivos" className="space-y-4">
              <FileUploadZone files={demanda.attachments} onFilesChange={handleAddFiles} />

              {demanda.attachments.length > 0 && (
                <ScrollArea className="max-h-[300px]">
                  <div className="space-y-2">
                    {demanda.attachments.map((f) => {
                      const Icon = getFileIcon(f.type);
                      const isImage = f.type.startsWith("image/");
                      return (
                        <div key={f.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card group">
                          {isImage ? (
                            <img src={f.url} alt={f.name} className="h-12 w-12 rounded object-cover shrink-0" />
                          ) : (
                            <div className="h-12 w-12 rounded bg-muted flex items-center justify-center shrink-0">
                              <Icon className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{f.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {formatFileSize(f.size)} · {formatDate(f.uploadedAt)} · {f.uploadedBy}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            {isImage && (
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPreviewUrl(f.url)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownload(f)}>
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteFile(f.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>

            <TabsContent value="historico">
              <ScrollArea className="max-h-[400px]">
                <div className="space-y-3">
                  {[...demanda.history].reverse().map((entry) => (
                    <div key={entry.id} className="flex items-start gap-3 p-2">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm text-foreground">{entry.action}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {entry.user} · {formatDate(entry.date)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Image Preview */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-3xl p-2">
          {previewUrl && <img src={previewUrl} alt="Preview" className="w-full rounded" />}
        </DialogContent>
      </Dialog>
    </>
  );
}
