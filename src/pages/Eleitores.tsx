import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Search, Pencil, Trash2, Users, MessageCircle, Mail, AtSign, Info, Download } from "lucide-react";
import { useEleitores, type EleitorRow } from "@/hooks/use-eleitores";
import { useLiderancas } from "@/hooks/use-liderancas";
import { useCidades } from "@/hooks/use-cidades";
import NovoEleitorDialog from "@/components/eleitores/NovoEleitorDialog";
import ExportEleitoresDialog from "@/components/eleitores/ExportEleitoresDialog";
import PerformanceLideranca from "@/components/eleitores/PerformanceLideranca";
import { badgeClassesForKey } from "@/lib/eleitor-colors";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { usePermissions } from "@/hooks/use-permissions";
import { toast } from "sonner";

export default function Eleitores() {
  const { eleitores, isLoading, remove } = useEleitores();
  const { liderancas } = useLiderancas();
  const { cidades } = useCidades();
  const { canDeleteEleitores, isWriter } = usePermissions() as any;
  const showExport = canDeleteEleitores; // admins/operators (deputado, chefe_gabinete, secretario)

  const [search, setSearch] = useState("");
  const [filterCidade, setFilterCidade] = useState<string>("__all__");
  const [filterLideranca, setFilterLideranca] = useState<string>("__all__");
  const [open, setOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [editing, setEditing] = useState<EleitorRow | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<EleitorRow | null>(null);

  const liderancaMap = useMemo(() => {
    const m = new Map<string, any>();
    for (const l of liderancas as any[]) m.set(l.id, l);
    return m;
  }, [liderancas]);

  const filtered = useMemo(() => {
    const s = search.toLowerCase().trim();
    return eleitores.filter((e) => {
      if (filterCidade !== "__all__" && e.cidade !== filterCidade) return false;
      if (filterLideranca !== "__all__") {
        if (filterLideranca === "__none__" && e.lideranca_id) return false;
        if (filterLideranca !== "__none__" && e.lideranca_id !== filterLideranca) return false;
      }
      if (!s) return true;
      return (
        e.nome.toLowerCase().includes(s) ||
        e.whatsapp.includes(s) ||
        (e.email || "").toLowerCase().includes(s) ||
        (e.cidade || "").toLowerCase().includes(s)
      );
    });
  }, [eleitores, search, filterCidade, filterLideranca]);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await remove(confirmDelete.id);
      toast.success("Eleitor removido");
    } catch (e: any) {
      toast.error(e.message || "Erro ao remover");
    } finally {
      setConfirmDelete(null);
    }
  };

  const totalCadastros = eleitores.length;
  const totalVinculados = eleitores.filter((e) => !!e.lideranca_id).length;

  return (
    <TooltipProvider>
      <div className="space-y-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              Eleitores
            </h1>
            <p className="text-sm text-muted-foreground">
              Cadastro e desempenho de base eleitoral por liderança
            </p>
          </div>
          <div className="flex items-center gap-2">
            {showExport && (
              <Button variant="outline" onClick={() => setExportOpen(true)} className="gap-2">
                <Download className="h-4 w-4" /> Exportar Dados
              </Button>
            )}
            <Button onClick={() => { setEditing(null); setOpen(true); }} className="gap-2">
              <Plus className="h-4 w-4" /> Novo Eleitor
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total cadastrado</p>
              <p className="text-2xl font-bold">{totalCadastros.toLocaleString("pt-BR")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Vinculados a lideranças</p>
              <p className="text-2xl font-bold text-emerald-600">{totalVinculados.toLocaleString("pt-BR")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Sem vínculo</p>
              <p className="text-2xl font-bold text-amber-600">{(totalCadastros - totalVinculados).toLocaleString("pt-BR")}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="lista">
          <TabsList>
            <TabsTrigger value="lista">Lista de Eleitores</TabsTrigger>
            <TabsTrigger value="performance">Desempenho de Lideranças</TabsTrigger>
          </TabsList>

          <TabsContent value="lista" className="space-y-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  Filtros
                  <Tooltip>
                    <TooltipTrigger><Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                    <TooltipContent>Busque por nome, WhatsApp, email ou filtre por cidade/liderança.</TooltipContent>
                  </Tooltip>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por nome, WhatsApp, email..."
                    className="pl-7"
                  />
                </div>
                <Select value={filterCidade} onValueChange={setFilterCidade}>
                  <SelectTrigger><SelectValue placeholder="Filtrar por cidade" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todas as cidades</SelectItem>
                    {cidades.map((c) => (
                      <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterLideranca} onValueChange={setFilterLideranca}>
                  <SelectTrigger><SelectValue placeholder="Filtrar por liderança" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todas as lideranças</SelectItem>
                    <SelectItem value="__none__">— Sem vínculo —</SelectItem>
                    {(liderancas as any[]).map((l) => (
                      <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>WhatsApp</TableHead>
                      <TableHead>Cidade</TableHead>
                      <TableHead>Liderança</TableHead>
                      <TableHead>Perfil</TableHead>
                      <TableHead>Contatos</TableHead>
                      <TableHead className="w-24 text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading && (
                      <TableRow><TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-8">Carregando...</TableCell></TableRow>
                    )}
                    {!isLoading && filtered.length === 0 && (
                      <TableRow><TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-8">Nenhum eleitor encontrado.</TableCell></TableRow>
                    )}
                    {filtered.map((e) => {
                      const lid = e.lideranca_id ? liderancaMap.get(e.lideranca_id) : null;
                      const cf = (e.custom_field_values || {}) as Record<string, any>;
                      const intencao = cf.intencao_voto as string | undefined;
                      const grau = cf.grau_apoio as string | undefined;
                      const prio = cf.prioridade as string | undefined;
                      return (
                        <TableRow key={e.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-7 w-7">
                                {(e as any).avatar_url ? <AvatarImage src={(e as any).avatar_url} className="object-cover" /> : null}
                                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                  {e.nome ? e.nome.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() : "?"}
                                </AvatarFallback>
                              </Avatar>
                              <span>{e.nome}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">{e.whatsapp}</TableCell>
                          <TableCell className="text-xs">{e.cidade}</TableCell>
                          <TableCell>
                            {lid ? (
                              <Badge variant="secondary" className="text-[10px]">
                                {lid.name}
                              </Badge>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap items-center gap-1">
                              {intencao && (
                                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${badgeClassesForKey("intencao_voto", intencao)}`}>
                                  {intencao}
                                </span>
                              )}
                              {grau && (
                                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${badgeClassesForKey("grau_apoio", grau)}`}>
                                  {grau}
                                </span>
                              )}
                              {prio && (
                                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${badgeClassesForKey("prioridade", prio)}`}>
                                  {prio}
                                </span>
                              )}
                              {!intencao && !grau && !prio && (
                                <span className="text-[10px] text-muted-foreground">—</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              {e.whatsapp && <MessageCircle className="h-3 w-3" />}
                              {e.email && <Mail className="h-3 w-3" />}
                              {e.telegram && <AtSign className="h-3 w-3" />}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditing(e); setOpen(true); }}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              {canDeleteEleitores && (
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setConfirmDelete(e)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance">
            <PerformanceLideranca />
          </TabsContent>
        </Tabs>

        <NovoEleitorDialog open={open} onOpenChange={setOpen} editing={editing} />

        <ExportEleitoresDialog
          open={exportOpen}
          onOpenChange={setExportOpen}
          eleitores={filtered}
          liderancaMap={liderancaMap}
        />

        <AlertDialog open={!!confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover eleitor?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. O cadastro de <strong>{confirmDelete?.nome}</strong> será excluído permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remover</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
