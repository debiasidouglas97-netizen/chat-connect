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
import { Separator } from "@/components/ui/separator";
import { FileUploadZone, type AttachedFile } from "./FileUploadZone";
import {
  MapPin, User, Download, Eye, FileText, Image, File, Clock, Pencil, Send,
  Video, Archive, ChevronRight, MessageCircle, Calendar, Timer, Globe,
} from "lucide-react";
import { useCidades } from "@/hooks/use-cidades";
import { useDemandaDetails } from "@/hooks/use-demanda-details";
import type { Demanda } from "./types";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const COLUMNS = [
  { id: "nova", title: "Nova", color: "bg-muted-foreground", textColor: "text-muted-foreground" },
  { id: "analise", title: "Em Análise", color: "bg-warning", textColor: "text-warning" },
  { id: "encaminhada", title: "Encaminhada", color: "bg-info", textColor: "text-info" },
  { id: "execucao", title: "Em Execução", color: "bg-primary", textColor: "text-primary" },
  { id: "resolvida", title: "Resolvida", color: "bg-success", textColor: "text-success" },
  { id: "arquivada", title: "Arquivada", color: "bg-muted-foreground", textColor: "text-muted-foreground" },
];

const priorityConfig: Record<string, { bg: string; text: string; dot: string }> = {
  Urgente: { bg: "bg-destructive/10", text: "text-destructive", dot: "bg-destructive" },
  Alta: { bg: "bg-warning/10", text: "text-warning", dot: "bg-warning" },
  Média: { bg: "bg-info/10", text: "text-info", dot: "bg-info" },
  Baixa: { bg: "bg-muted", text: "text-muted-foreground", dot: "bg-muted-foreground" },
};

const NEXT_STATUS: Record<string, string> = {
  nova: "analise",
  analise: "encaminhada",
  encaminhada: "execucao",
  execucao: "resolvida",
};

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(type: string) {
  if (type.startsWith("image/")) return Image;
  if (type.startsWith("video/")) return Video;
  if (type === "application/pdf") return FileText;
  return File;
}

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function timeAgo(date: string | Date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR });
}

interface DemandaDetailDialogProps {
  demanda: Demanda | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (demanda: Demanda) => void;
  onArchive?: (id: string) => void;
  onMoveNext?: (demanda: Demanda, nextStatus: string) => void;
}

export function DemandaDetailDialog({
  demanda, open, onOpenChange, onUpdate, onArchive, onMoveNext,
}: DemandaDetailDialogProps) {
  const { cidades: cidadesData } = useCidades();
  const {
    attachments: dbAttachments, history: dbHistory, comments: dbComments,
    isLoading: detailsLoading, addComment, isAddingComment,
  } = useDemandaDetails(open && demanda ? demanda.id : null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [commentText, setCommentText] = useState("");

  // Edit state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [priority, setPriority] = useState("");
  const [responsible, setResponsible] = useState("");
  const [col, setCol] = useState("");

  if (!demanda) return null;

  const currentCol = COLUMNS.find((c) => c.id === demanda.col);
  const pConfig = priorityConfig[demanda.priority] || priorityConfig.Média;
  const nextStatus = NEXT_STATUS[demanda.col];
  const nextCol = nextStatus ? COLUMNS.find((c) => c.id === nextStatus) : null;

  // Find created_at from raw demanda or history
  const createdAt = dbHistory.length > 0
    ? dbHistory[dbHistory.length - 1]?.created_at
    : undefined;

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

  const handleDownload = (url: string, name: string) => {
    const a = document.createElement("a");
    a.href = url; a.download = name; a.target = "_blank"; a.click();
  };

  const handleArchive = () => {
    onArchive?.(demanda.id);
    setConfirmArchive(false);
    onOpenChange(false);
  };

  const handleMoveNext = () => {
    if (nextStatus) {
      onMoveNext?.(demanda, nextStatus);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    try {
      await addComment({ text: commentText.trim(), author: "Equipe do Gabinete" });
      setCommentText("");
    } catch {
      // error handled by mutation
    }
  };

  const totalAttachments = dbAttachments.length + demanda.attachments.length;

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setEditing(false); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0 overflow-hidden animate-scale-in">

          {/* ===== HEADER ===== */}
          <div className="p-6 pb-4 border-b bg-card">
            <DialogHeader className="space-y-3">
              {!editing ? (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <DialogTitle className="text-xl font-bold leading-tight pr-4">
                      {demanda.title}
                    </DialogTitle>
                    <div className="flex gap-1.5 shrink-0">
                      <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={startEdit}>
                        <Pencil className="h-3.5 w-3.5" /> Editar
                      </Button>
                      <Button
                        size="sm" variant="outline"
                        className="gap-1.5 h-8 text-muted-foreground hover:text-foreground"
                        onClick={() => setConfirmArchive(true)}
                      >
                        <Archive className="h-3.5 w-3.5" /> Arquivar
                      </Button>
                    </div>
                  </div>

                  {/* Status & Priority badges */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={`${currentCol?.color} text-white border-0 gap-1`}>
                      {currentCol?.title || demanda.col}
                    </Badge>
                    <Badge variant="outline" className={`${pConfig.bg} ${pConfig.text} border-0 gap-1`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${pConfig.dot}`} />
                      {demanda.priority}
                    </Badge>
                    {demanda.origin === "telegram" && (
                      <Badge variant="secondary" className="text-xs gap-1">
                        <Send className="h-3 w-3" /> Telegram
                      </Badge>
                    )}
                    {demanda.origin === "manual" && (
                      <Badge variant="secondary" className="text-xs gap-1">
                        <Globe className="h-3 w-3" /> Sistema
                      </Badge>
                    )}
                  </div>

                  {/* Metadata */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" /> {demanda.city}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5" /> {demanda.creator_name || demanda.responsible}
                    </span>
                    {createdAt && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" /> {formatDate(createdAt)}
                      </span>
                    )}
                    {createdAt && (
                      <span className="flex items-center gap-1">
                        <Timer className="h-3.5 w-3.5" /> Criada {timeAgo(createdAt)}
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <DialogTitle className="text-lg">Editar Demanda</DialogTitle>
              )}
            </DialogHeader>
          </div>

          {/* ===== BODY ===== */}
          <ScrollArea className="max-h-[calc(90vh-180px)]">
            <div className="p-6 space-y-4">
              {editing ? (
                /* ===== EDIT FORM ===== */
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
                  {/* Description */}
                  {demanda.description && (
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Descrição</h4>
                      <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{demanda.description}</p>
                    </div>
                  )}

                  {/* Move to next step */}
                  {nextCol && (
                    <Button
                      className="w-full gap-2 h-10"
                      onClick={handleMoveNext}
                    >
                      Mover para "{nextCol.title}" <ChevronRight className="h-4 w-4" />
                    </Button>
                  )}

                  <Separator />

                  {/* ===== TABS ===== */}
                  <Tabs defaultValue="arquivos">
                    <TabsList className="w-full grid grid-cols-3">
                      <TabsTrigger value="arquivos" className="gap-1 text-xs">
                        📂 Arquivos <Badge variant="secondary" className="h-5 min-w-5 text-[10px] px-1">{totalAttachments}</Badge>
                      </TabsTrigger>
                      <TabsTrigger value="comentarios" className="gap-1 text-xs">
                        💬 Comentários <Badge variant="secondary" className="h-5 min-w-5 text-[10px] px-1">{dbComments.length}</Badge>
                      </TabsTrigger>
                      <TabsTrigger value="historico" className="gap-1 text-xs">
                        📋 Histórico <Badge variant="secondary" className="h-5 min-w-5 text-[10px] px-1">{dbHistory.length}</Badge>
                      </TabsTrigger>
                    </TabsList>

                    {/* === ARQUIVOS TAB === */}
                    <TabsContent value="arquivos" className="space-y-4 mt-4">
                      <FileUploadZone files={demanda.attachments} onFilesChange={handleAddFiles} />

                      {dbAttachments.length > 0 && (
                        <div className="space-y-2">
                          {dbAttachments.map((f) => {
                            const Icon = getFileIcon(f.file_type);
                            const isImage = f.file_type.startsWith("image/");
                            const isVideo = f.file_type.startsWith("video/");
                            return (
                              <div key={f.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors group">
                                {isImage ? (
                                  <img src={f.url} alt={f.file_name} className="h-12 w-12 rounded object-cover shrink-0" />
                                ) : (
                                  <div className="h-12 w-12 rounded bg-muted flex items-center justify-center shrink-0">
                                    <Icon className="h-6 w-6 text-muted-foreground" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate">{f.file_name}</p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {formatFileSize(f.file_size)} · {formatDate(f.created_at)} · {f.uploaded_by}
                                    {f.source === "telegram" && " · via Telegram"}
                                  </p>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {isImage && (
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPreviewUrl(f.url)}>
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {isVideo && (
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(f.url, "_blank")}>
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  )}
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownload(f.url, f.file_name)}>
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {demanda.attachments.length > 0 && (
                        <div className="space-y-2">
                          {demanda.attachments.map((f) => {
                            const Icon = getFileIcon(f.type);
                            const isImage = f.type.startsWith("image/");
                            return (
                              <div key={f.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors group">
                                {isImage ? (
                                  <img src={f.url} alt={f.name} className="h-12 w-12 rounded object-cover shrink-0" />
                                ) : (
                                  <div className="h-12 w-12 rounded bg-muted flex items-center justify-center shrink-0">
                                    <Icon className="h-6 w-6 text-muted-foreground" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate">{f.name}</p>
                                  <p className="text-[10px] text-muted-foreground">{formatFileSize(f.size)} · {formatDate(f.uploadedAt)}</p>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {isImage && (
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPreviewUrl(f.url)}>
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  )}
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownload(f.url, f.name)}>
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {totalAttachments === 0 && !detailsLoading && (
                        <p className="text-xs text-muted-foreground text-center py-4">Nenhum arquivo anexado</p>
                      )}
                    </TabsContent>

                    {/* === COMENTÁRIOS TAB === */}
                    <TabsContent value="comentarios" className="space-y-4 mt-4">
                      {/* Comment input */}
                      <div className="flex gap-2">
                        <Input
                          placeholder="Escreva um comentário..."
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
                          disabled={isAddingComment}
                        />
                        <Button
                          size="sm" className="shrink-0"
                          onClick={handleAddComment}
                          disabled={!commentText.trim() || isAddingComment}
                        >
                          Enviar
                        </Button>
                      </div>

                      {/* Comments list */}
                      <ScrollArea className="max-h-[300px]">
                        <div className="space-y-3">
                          {dbComments.map((c) => (
                            <div key={c.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                              <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                                c.source === "telegram" ? "bg-info/10" : "bg-primary/10"
                              }`}>
                                {c.source === "telegram" ? (
                                  <Send className="h-4 w-4 text-info" />
                                ) : (
                                  <MessageCircle className="h-4 w-4 text-primary" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-foreground">{c.author}</span>
                                  {c.source === "telegram" && (
                                    <Badge variant="secondary" className="text-[9px] h-4">Telegram</Badge>
                                  )}
                                  <span className="text-[10px] text-muted-foreground ml-auto">{timeAgo(c.created_at)}</span>
                                </div>
                                <p className="text-sm text-muted-foreground mt-0.5 whitespace-pre-wrap">{c.text}</p>
                              </div>
                            </div>
                          ))}
                          {dbComments.length === 0 && !detailsLoading && (
                            <p className="text-xs text-muted-foreground text-center py-4">Nenhum comentário ainda</p>
                          )}
                        </div>
                      </ScrollArea>
                    </TabsContent>

                    {/* === HISTÓRICO TAB === */}
                    <TabsContent value="historico" className="mt-4">
                      <ScrollArea className="max-h-[400px]">
                        <div className="space-y-1">
                          {dbHistory.map((entry) => {
                            const toCol = entry.new_status ? COLUMNS.find((c) => c.id === entry.new_status) : null;
                            return (
                              <div key={entry.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/30 transition-colors">
                                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-foreground">{entry.action}</p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] text-muted-foreground">{entry.actor}</span>
                                    <span className="text-[10px] text-muted-foreground">·</span>
                                    <span className="text-[10px] text-muted-foreground">{formatDate(entry.created_at)}</span>
                                    <span className="text-[10px] text-muted-foreground">({timeAgo(entry.created_at)})</span>
                                  </div>
                                </div>
                                {toCol && (
                                  <Badge variant="outline" className="text-[10px] shrink-0">{toCol.title}</Badge>
                                )}
                              </div>
                            );
                          })}
                          {dbHistory.length === 0 && !detailsLoading && (
                            <p className="text-xs text-muted-foreground text-center py-4">Nenhum registro no histórico</p>
                          )}
                        </div>
                      </ScrollArea>
                    </TabsContent>
                  </Tabs>
                </>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Image Preview */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-3xl p-2">
          {previewUrl && <img src={previewUrl} alt="Preview" className="w-full rounded" />}
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation */}
      <AlertDialog open={confirmArchive} onOpenChange={setConfirmArchive}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arquivar demanda</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja arquivar <strong>{demanda.title}</strong>?
              <br /><span className="text-xs">A demanda será removida do Kanban mas permanecerá no sistema.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive}>Arquivar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
