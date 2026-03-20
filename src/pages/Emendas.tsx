import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Landmark, Plus, Pencil, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useEmendas, type EmendaRow } from "@/hooks/use-emendas";
import { useCidades } from "@/hooks/use-cidades";

const statusColors: Record<string, string> = {
  Proposta: "bg-muted text-muted-foreground",
  Aprovada: "bg-info/10 text-info border-info/20",
  Liberada: "bg-warning/10 text-warning border-warning/20",
  Paga: "bg-success/10 text-success border-success/20",
};

const TIPOS = ["Saúde", "Educação", "Infraestrutura", "Segurança", "Cultura", "Esporte", "Meio Ambiente"];
const STATUSES = ["Proposta", "Aprovada", "Liberada", "Paga"];

function EmendaFormDialog({ open, onOpenChange, onSave, initial, cidadeOptions }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  onSave: (e: { cidade: string; valor: string; status: string; tipo: string; ano: number }) => void;
  initial?: EmendaRow; cidadeOptions: string[];
}) {
  const [cidade, setCidade] = useState(initial?.cidade || "");
  const [valor, setValor] = useState(initial?.valor || "");
  const [status, setStatus] = useState(initial?.status || "Proposta");
  const [tipo, setTipo] = useState(initial?.tipo || "Saúde");
  const [ano, setAno] = useState(initial?.ano?.toString() || new Date().getFullYear().toString());

  const handleSave = () => {
    if (!cidade || !valor.trim()) return;
    onSave({ cidade, valor: valor.trim(), status, tipo, ano: Number(ano) });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{initial ? "Editar Emenda" : "Nova Emenda"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Cidade *</Label>
            <Select value={cidade} onValueChange={setCidade}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {cidadeOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Valor *</Label><Input value={valor} onChange={(e) => setValor(e.target.value)} placeholder="R$ 1.000.000" /></div>
            <div><Label className="text-xs">Ano</Label><Input type="number" value={ano} onChange={(e) => setAno(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Tipo</Label>
              <Select value={tipo} onValueChange={setTipo}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>
          <div className="flex gap-2 pt-2 border-t">
            <Button onClick={handleSave} disabled={!cidade || !valor.trim()}>Salvar</Button>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Emendas() {
  const { emendas, insert, update, remove } = useEmendas();
  const { cidades } = useCidades();
  const cidadeOptions = cidades.map((c) => c.name);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EmendaRow | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleSave = async (e: { cidade: string; valor: string; status: string; tipo: string; ano: number }) => {
    try {
      if (editing) {
        await update({ id: editing.id, data: e });
        toast.success("Emenda atualizada");
      } else {
        await insert(e);
        toast.success("Emenda cadastrada");
      }
      setEditing(undefined);
    } catch {
      toast.error("Erro ao salvar");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await remove(deleteId);
      setDeleteId(null);
      toast.success("Emenda excluída");
    } catch {
      toast.error("Erro ao excluir");
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Emendas Parlamentares</h1>
          <p className="text-sm text-muted-foreground">Controle e acompanhamento de emendas</p>
        </div>
        <Button className="gap-2" onClick={() => { setEditing(undefined); setFormOpen(true); }}>
          <Plus className="h-4 w-4" /> Nova Emenda
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {["Proposta", "Aprovada", "Liberada", "Paga"].map((s) => (
          <Card key={s}>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase">{s}</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {emendas.filter((e) => e.status === s).length}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cidade</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ano</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {emendas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma emenda cadastrada</TableCell>
                </TableRow>
              ) : emendas.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.cidade}</TableCell>
                  <TableCell>{e.tipo}</TableCell>
                  <TableCell className="font-semibold">{e.valor}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${statusColors[e.status]}`}>{e.status}</Badge>
                  </TableCell>
                  <TableCell>{e.ano}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(e); setFormOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(e.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <EmendaFormDialog open={formOpen} onOpenChange={setFormOpen} onSave={handleSave} initial={editing} cidadeOptions={cidadeOptions} />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir emenda</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir esta emenda?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
