import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileUploadZone, type AttachedFile } from "./FileUploadZone";
import { MapPin, User, Download, Trash2, Eye, FileText, Image, File, Clock, Pencil, Send } from "lucide-react";
import { useCidades } from "@/hooks/use-cidades";
import type { Demanda, HistoryEntry } from "./types";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const priorityColors: Record<string, string> = {
  Urgente: "bg-destructive/10 text-destructive border-destructive/20",
  Alta: "bg-warning/10 text-warning border-warning/20",
  Média: "bg-info/10 text-info border-info/20",
  Baixa: "bg-muted text-muted-foreground",
};

const COLUMNS = [
  { id: "nova", title: "Nova" }, { id: "analise", title: "Em Análise" },
  { id: "encaminhada", title: "Encaminhada" }, { id: "execucao", title: "Em Execução" },
  { id: "resolvida", title: "Resolvida" },
];

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
  return new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

interface DemandaDetailDialogProps {
  demanda: Demanda | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (demanda: Demanda) => void;
  onDelete?: (id: number | string) => void;
}

export function DemandaDetailDialog({ demanda, open, onOpenChange, onUpdate, onDelete }: DemandaDetailDialogProps) {
  const { cidades: cidadesData } = useCidades();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [priority, setPriority] = useState("");
  const [responsible, setResponsible] = useState("");
  const [col, setCol] = useState("");

  if (!demanda) return null;

  const startEdit = () => {
    setTitle(demanda.title);
    setDescription(demanda.description || "");
    setCity(demanda.city);
    setPriority(demanda.priority);
    setResponsible(demanda.responsible);
    setCol(demanda.col);
    setEditing(true);
  };

  const handleSaveEdit = () => {
    onUpdate({
      ...demanda, title: title.trim(), description: description.trim(),
      city, priority, responsible: responsible.trim(), col,
    });
    setEditing(false);
  };

  const handleAddFiles = (newFiles: AttachedFile[]) => {
    onUpdate({ ...demanda, attachments: newFiles });
  };

  const handleDeleteFile = (fileId: string) => {
    onUpdate({
      ...demanda, attachments: demanda.attachments.filter((f) => f.id !== fileId),
    });
  };

  const handleDownload = (file: AttachedFile) => {
    const a = document.createElement("a"); a.href = file.url; a.download = file.name; a.click();
  };

  const handleDelete = () => {
    onDelete?.(demanda.id);
    setConfirmDelete(false);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setEditing(false); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            {!editing ? (
              <>
                <DialogTitle className="text-lg">{demanda.title}</DialogTitle>
                <div className="flex items-center gap-3 pt-1 flex-wrap">
                  <Badge variant="outline" className={priorityColors[demanda.priority]}>{demanda.priority}</Badge>
                  <Badge variant="secondary" className="text-xs">{COLUMNS.find((c) => c.id === demanda.col)?.title}</Badge>
                  {demanda.origin === "telegram" && (
                    <Badge variant="secondary" className="text-xs gap-0.5"><Send className="h-3 w-3" /> Telegram</Badge>
                  )}
                  <span className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> {demanda.city}</span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1"><User className="h-3 w-3" /> {demanda.creator_name || demanda.responsible}</span>
                </div>
              </>
            ) : (
              <DialogTitle>Editar Demanda</DialogTitle>
            )}
          </DialogHeader>

          {editing ? (
            <div className="space-y-3">
              <div><Label className="text-xs">Título *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
              <div><Label className="text-xs">Descrição</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Cidade</Label>
                  <Select value={city} onValueChange={setCity}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{cidadesData.map((c) => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}</SelectContent></Select>
                </div>
                <div>
                  <Label className="text-xs">Prioridade</Label>
                  <Select value={priority} onValueChange={setPriority}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Urgente", "Alta", "Média", "Baixa"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select>
                </div>
                <div>
                  <Label className="text-xs">Status</Label>
                  <Select value={col} onValueChange={setCol}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{COLUMNS.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent></Select>
                </div>
                <div><Label className="text-xs">Responsável</Label><Input value={responsible} onChange={(e) => setResponsible(e.target.value)} /></div>
              </div>
              <div className="flex gap-2 pt-2 border-t">
                <Button size="sm" onClick={handleSaveEdit}>Salvar</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button>
              </div>
            </div>
          ) : (
            <>
              {demanda.description && <p className="text-sm text-muted-foreground">{demanda.description}</p>}

              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" className="gap-1" onClick={startEdit}><Pencil className="h-3.5 w-3.5" /> Editar</Button>
                {onDelete && (
                  <Button size="sm" variant="destructive" className="gap-1" onClick={() => setConfirmDelete(true)}><Trash2 className="h-3.5 w-3.5" /> Excluir</Button>
                )}
              </div>

              <Tabs defaultValue="arquivos" className="mt-2">
                <TabsList className="w-full">
                  <TabsTrigger value="arquivos" className="flex-1">📂 Arquivos ({demanda.attachments.length})</TabsTrigger>
                  <TabsTrigger value="historico" className="flex-1">📋 Histórico ({demanda.history.length})</TabsTrigger>
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
                                <div className="h-12 w-12 rounded bg-muted flex items-center justify-center shrink-0"><Icon className="h-6 w-6 text-muted-foreground" /></div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{f.name}</p>
                                <p className="text-[10px] text-muted-foreground">{formatFileSize(f.size)} · {formatDate(f.uploadedAt)} · {f.uploadedBy}</p>
                              </div>
                              <div className="flex gap-1">
                                {isImage && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPreviewUrl(f.url)}><Eye className="h-4 w-4" /></Button>}
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownload(f)}><Download className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteFile(f.id)}><Trash2 className="h-4 w-4" /></Button>
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
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5"><Clock className="h-4 w-4 text-muted-foreground" /></div>
                          <div>
                            <p className="text-sm text-foreground">{entry.action}</p>
                            <p className="text-[10px] text-muted-foreground">{entry.user} · {formatDate(entry.date)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-3xl p-2">
          {previewUrl && <img src={previewUrl} alt="Preview" className="w-full rounded" />}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir demanda</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir <strong>{demanda.title}</strong>?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
