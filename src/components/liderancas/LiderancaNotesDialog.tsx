import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pin, PinOff, Trash2, Search, AlertTriangle, Handshake, Shield, HeartHandshake, Star, Target } from "lucide-react";
import { useLeadershipNotes, type NoteTag } from "@/hooks/use-leadership-notes";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

const TAG_CONFIG: Record<NoteTag, { label: string; icon: React.ReactNode; color: string }> = {
  relacionamento: { label: "Relacionamento", icon: <Handshake className="h-3 w-3" />, color: "bg-blue-100 text-blue-700 border-blue-200" },
  politico: { label: "Político", icon: <Shield className="h-3 w-3" />, color: "bg-purple-100 text-purple-700 border-purple-200" },
  conflito: { label: "Conflito", icon: <AlertTriangle className="h-3 w-3" />, color: "bg-red-100 text-red-700 border-red-200" },
  apoio: { label: "Apoio", icon: <HeartHandshake className="h-3 w-3" />, color: "bg-green-100 text-green-700 border-green-200" },
  alerta: { label: "Alerta", icon: <Star className="h-3 w-3" />, color: "bg-amber-100 text-amber-700 border-amber-200" },
  estrategico: { label: "Estratégico", icon: <Target className="h-3 w-3" />, color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  liderancaName: string;
}

export default function LiderancaNotesDialog({ open, onOpenChange, liderancaName }: Props) {
  const { notes, isLoading, addNote, updateNote, deleteNote } = useLeadershipNotes(liderancaName);
  const [newText, setNewText] = useState("");
  const [newTag, setNewTag] = useState<NoteTag | "">("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  const filtered = search
    ? notes.filter((n) => n.text.toLowerCase().includes(search.toLowerCase()))
    : notes;

  const handleAdd = async () => {
    if (!newText.trim()) return;
    try {
      await addNote.mutateAsync({ text: newText.trim(), tag: newTag || undefined });
      setNewText("");
      setNewTag("");
      setShowForm(false);
      toast.success("Nota adicionada");
    } catch {
      toast.error("Erro ao adicionar nota");
    }
  };

  const handlePin = async (id: string, current: boolean) => {
    await updateNote.mutateAsync({ id, is_pinned: !current });
  };

  const handleDelete = async (id: string) => {
    await deleteNote.mutateAsync(id);
    toast.success("Nota removida");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg">📝 Notas — {liderancaName}</DialogTitle>
        </DialogHeader>

        {/* Search + Add */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar notas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button size="sm" className="gap-1" onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4" /> Nova nota
          </Button>
        </div>

        {/* New note form */}
        {showForm && (
          <Card className="border-dashed border-primary/40">
            <CardContent className="p-4 space-y-3">
              <Textarea
                placeholder="Escreva a nota estratégica..."
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                rows={3}
              />
              <div className="flex items-center gap-2">
                <Select value={newTag} onValueChange={(v) => setNewTag(v as NoteTag)}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Tipo (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TAG_CONFIG).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>
                        <span className="flex items-center gap-2">{cfg.icon} {cfg.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={handleAdd} disabled={!newText.trim() || addNote.isPending}>
                  Salvar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); setNewText(""); setNewTag(""); }}>
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notes list */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {isLoading && <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>}
          {!isLoading && filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              {search ? "Nenhuma nota encontrada" : "Nenhuma nota registrada"}
            </p>
          )}
          {filtered.map((note) => (
            <Card key={note.id} className={note.is_pinned ? "border-primary/40 bg-primary/5" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground whitespace-pre-wrap">{note.text}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {note.tag && TAG_CONFIG[note.tag] && (
                        <Badge variant="outline" className={`text-[10px] ${TAG_CONFIG[note.tag].color}`}>
                          {TAG_CONFIG[note.tag].icon}
                          <span className="ml-1">{TAG_CONFIG[note.tag].label}</span>
                        </Badge>
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(note.created_at), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                      <span className="text-[10px] text-muted-foreground">• {note.author}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => handlePin(note.id, note.is_pinned)}
                      title={note.is_pinned ? "Desafixar" : "Fixar no topo"}
                    >
                      {note.is_pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(note.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
