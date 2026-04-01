import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Eye } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useEmendas, type EmendaRow } from "@/hooks/use-emendas";
import { useCidades } from "@/hooks/use-cidades";
import { useLiderancas } from "@/hooks/use-liderancas";
import EmendaFormDialog from "@/components/emendas/EmendaFormDialog";
import EmendaDetailDialog from "@/components/emendas/EmendaDetailDialog";

const statusColors: Record<string, { bg: string; text: string; border: string }> = {
  Proposta: { bg: "bg-[#FFF4E5]", text: "text-[#B26A00]", border: "border-[#FFE0B2]" },
  Aprovada: { bg: "bg-[#E6F4EA]", text: "text-[#2E7D32]", border: "border-[#C8E6C9]" },
  Liberada: { bg: "bg-[#E3F2FD]", text: "text-[#1565C0]", border: "border-[#BBDEFB]" },
  "Em execução": { bg: "bg-[#E8F5E9]", text: "text-[#2E7D32]", border: "border-[#C8E6C9]" },
  Paga: { bg: "bg-[#F3E5F5]", text: "text-[#6A1B9A]", border: "border-[#E1BEE7]" },
};

const prioridadeColors: Record<string, string> = {
  Alta: "bg-[#FFEBEE] text-[#C62828] border-[#FFCDD2]",
  Média: "bg-[#FFF8E1] text-[#F57F17] border-[#FFECB3]",
  Baixa: "bg-muted text-muted-foreground",
};

const STATUSES = ["Proposta", "Aprovada", "Liberada", "Em execução", "Paga"];

export default function Emendas() {
  const { emendas, insert, update, remove } = useEmendas();
  const { cidades } = useCidades();
  const { liderancas } = useLiderancas();
  const cidadeOptions = cidades.map(c => c.name);
  const liderancaOptions = liderancas.map(l => l.name);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EmendaRow | undefined>();
  const [detailEmenda, setDetailEmenda] = useState<EmendaRow | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [filterCidade, setFilterCidade] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterAno, setFilterAno] = useState("all");

  const anos = useMemo(() => [...new Set(emendas.map(e => e.ano))].sort((a, b) => b - a), [emendas]);

  const filtered = useMemo(() => {
    return emendas.filter(e => {
      if (search && !(e.titulo || "").toLowerCase().includes(search.toLowerCase()) && !e.cidade.toLowerCase().includes(search.toLowerCase()) && !e.tipo.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterCidade !== "all" && e.cidade !== filterCidade) return false;
      if (filterStatus !== "all" && e.status !== filterStatus) return false;
      if (filterAno !== "all" && e.ano !== Number(filterAno)) return false;
      return true;
    });
  }, [emendas, search, filterCidade, filterStatus, filterAno]);

  const handleSave = async (e: any) => {
    try {
      if (editing) {
        await update({ id: editing.id, data: e });
        toast.success("Emenda atualizada");
        return editing;
      } else {
        const result = await insert(e);
        toast.success("Emenda cadastrada");
        return result;
      }
    } catch {
      toast.error("Erro ao salvar");
    } finally {
      setEditing(undefined);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await remove(deleteId);
      setDeleteId(null);
      setDetailEmenda(null);
      toast.success("Emenda excluída");
    } catch {
      toast.error("Erro ao excluir");
    }
  };

  const statusCounts = STATUSES.map(s => ({ label: s, count: emendas.filter(e => e.status === s).length }));

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Emendas Parlamentares</h1>
          <p className="text-sm text-muted-foreground">Gestão completa de emendas com anexos e vínculos</p>
        </div>
        <Button className="gap-2" onClick={() => { setEditing(undefined); setFormOpen(true); }}>
          <Plus className="h-4 w-4" /> Nova Emenda
        </Button>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {statusCounts.map(s => (
          <Card key={s.label} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilterStatus(filterStatus === s.label ? "all" : s.label)}>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground uppercase">{s.label}</p>
              <p className="text-2xl font-bold text-foreground mt-1">{s.count}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Buscar por título, cidade ou tipo..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterCidade} onValueChange={setFilterCidade}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Cidade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas cidades</SelectItem>
            {cidadeOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterAno} onValueChange={setFilterAno}>
          <SelectTrigger className="w-[120px]"><SelectValue placeholder="Ano" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos anos</SelectItem>
            {anos.map(a => <SelectItem key={a} value={a.toString()}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Emenda</TableHead>
                <TableHead>Cidade</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Ano</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhuma emenda encontrada</TableCell>
                </TableRow>
              ) : filtered.map(e => (
                <TableRow key={e.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setDetailEmenda(e)}>
                  <TableCell className="font-medium max-w-[200px] truncate">{e.titulo || `${e.tipo} - ${e.cidade}`}</TableCell>
                  <TableCell>{e.cidade}</TableCell>
                  <TableCell>{e.tipo}</TableCell>
                  <TableCell className="font-semibold">{e.valor}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${statusColors[e.status]}`}>{e.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${prioridadeColors[e.prioridade]}`}>{e.prioridade}</Badge>
                  </TableCell>
                  <TableCell>{e.ano}</TableCell>
                  <TableCell className="text-right" onClick={ev => ev.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDetailEmenda(e)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <EmendaFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSave={handleSave}
        initial={editing}
        cidadeOptions={cidadeOptions}
        liderancaOptions={liderancaOptions}
      />

      <EmendaDetailDialog
        open={!!detailEmenda}
        onOpenChange={() => setDetailEmenda(null)}
        emenda={detailEmenda}
        onEdit={() => { setEditing(detailEmenda!); setDetailEmenda(null); setFormOpen(true); }}
        onDelete={() => { setDeleteId(detailEmenda!.id); setDetailEmenda(null); }}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir emenda</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir esta emenda? Todos os anexos serão removidos.</AlertDialogDescription>
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
