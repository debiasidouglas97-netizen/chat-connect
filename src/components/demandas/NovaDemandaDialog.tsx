import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileUploadZone, type AttachedFile } from "./FileUploadZone";
import { useCidades } from "@/hooks/use-cidades";
import type { Demanda } from "./types";

interface NovaDemandaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (demanda: Demanda) => void;
}

export function NovaDemandaDialog({ open, onOpenChange, onSave }: NovaDemandaDialogProps) {
  const { cidades: cidadesData } = useCidades();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [priority, setPriority] = useState("Média");
  const [responsible, setResponsible] = useState("");
  const [files, setFiles] = useState<AttachedFile[]>([]);

  const reset = () => {
    setTitle(""); setDescription(""); setCity(""); setPriority("Média"); setResponsible(""); setFiles([]);
  };

  const handleSave = () => {
    if (!title.trim() || !city) return;
    const demanda: Demanda = {
      id: crypto.randomUUID(),
      col: "nova",
      title: title.trim(),
      description: description.trim(),
      city,
      priority,
      responsible: responsible.trim() || "Não atribuído",
      origin: "manual",
      order_index: 0,
      attachments_count: files.length,
      attachments: files,
      created_at: new Date().toISOString(),
      history: [
        { id: crypto.randomUUID(), action: "Demanda criada", user: "Usuário atual", date: new Date() },
        ...files.map((f) => ({
          id: crypto.randomUUID(),
          action: `Arquivo "${f.name}" anexado`,
          user: f.uploadedBy,
          date: f.uploadedAt,
        })),
      ],
    };
    onSave(demanda);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Demanda</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Título *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título da demanda" />
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição detalhada" rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cidade *</Label>
              <Select value={city} onValueChange={setCity}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {cidadesData.map((c) => (
                    <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Urgente", "Alta", "Média", "Baixa"].map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Responsável</Label>
            <Input value={responsible} onChange={(e) => setResponsible(e.target.value)} placeholder="Nome do responsável" />
          </div>
          <div className="space-y-2">
            <Label>Anexos</Label>
            <FileUploadZone files={files} onFilesChange={setFiles} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!title.trim() || !city}>Criar Demanda</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
