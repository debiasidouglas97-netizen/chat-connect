import { useState, useMemo } from "react";
import { Search, RefreshCw, FileText, Filter, KanbanSquare, ExternalLink, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useProposicoes, useTramitacoes, Proposicao } from "@/hooks/use-proposicoes";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_COLORS: Record<string, string> = {
  "Apresentada": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "Tramitando": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  "Aprovada": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  "Arquivada": "bg-muted text-muted-foreground",
  "Rejeitada": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

function getStatusColor(status: string | null) {
  if (!status) return "bg-muted text-muted-foreground";
  for (const [key, val] of Object.entries(STATUS_COLORS)) {
    if (status.toLowerCase().includes(key.toLowerCase())) return val;
  }
  return "bg-muted text-muted-foreground";
}

const TIPOS = ["PL", "PEC", "PLP", "REQ", "PDL", "MPV", "INC", "RIC"];

export default function Proposicoes() {
  const { data: proposicoes, isLoading, syncNow, addToKanban } = useProposicoes();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<Proposicao | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const statusOptions = useMemo(() => {
    if (!proposicoes) return [];
    const set = new Set(proposicoes.map(p => p.status_proposicao).filter(Boolean));
    return Array.from(set) as string[];
  }, [proposicoes]);

  const filtered = useMemo(() => {
    if (!proposicoes) return [];
    return proposicoes.filter(p => {
      const q = search.toLowerCase();
      const matchSearch = !q ||
        p.tipo.toLowerCase().includes(q) ||
        String(p.numero).includes(q) ||
        (p.ementa || "").toLowerCase().includes(q) ||
        (p.autor || "").toLowerCase().includes(q);
      const matchTipo = tipoFilter === "all" || p.tipo === tipoFilter;
      const matchStatus = statusFilter === "all" || p.status_proposicao === statusFilter;
      return matchSearch && matchTipo && matchStatus;
    });
  }, [proposicoes, search, tipoFilter, statusFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset page when filters change
  const handleSearch = (val: string) => { setSearch(val); setPage(1); };
  const handleTipoFilter = (val: string) => { setTipoFilter(val); setPage(1); };
  const handleStatusFilter = (val: string) => { setStatusFilter(val); setPage(1); };

  const handleSync = () => {
    syncNow.mutate(undefined, {
      onSuccess: () => toast({ title: "Sincronização iniciada", description: "As proposições estão sendo atualizadas." }),
      onError: () => toast({ title: "Erro na sincronização", variant: "destructive" }),
    });
  };

  const handleAddToKanban = (prop: Proposicao) => {
    addToKanban.mutate(prop, {
      onSuccess: () => {
        toast({ title: "Adicionada ao Kanban", description: `${prop.tipo} ${prop.numero}/${prop.ano} foi adicionada ao Kanban.` });
        setSelected(null);
      },
      onError: () => toast({ title: "Erro ao adicionar", variant: "destructive" }),
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Proposições</h1>
          <p className="text-sm text-muted-foreground">Monitoramento de proposições legislativas do deputado</p>
        </div>
        <Button onClick={handleSync} disabled={syncNow.isPending} variant="outline" className="gap-2">
          <RefreshCw className={`h-4 w-4 ${syncNow.isPending ? "animate-spin" : ""}`} />
          {syncNow.isPending ? "Sincronizando..." : "Sincronizar agora"}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número, tipo, ementa ou autor..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={tipoFilter} onValueChange={setTipoFilter}>
          <SelectTrigger className="w-[140px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos tipos</SelectItem>
            {TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            {statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      {proposicoes && (
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>{proposicoes.length} proposições cadastradas</span>
          <span>·</span>
          <span>{filtered.length} exibidas</span>
          <span>·</span>
          <span>{proposicoes.filter(p => p.adicionado_kanban).length} no Kanban</span>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <FileText className="h-12 w-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">Nenhuma proposição encontrada</p>
          <p className="text-sm">Clique em "Sincronizar agora" para buscar na API da Câmara.</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Tipo</TableHead>
                <TableHead className="w-[120px]">Número/Ano</TableHead>
                <TableHead>Ementa</TableHead>
                <TableHead className="w-[160px]">Status</TableHead>
                <TableHead className="w-[160px]">Autor</TableHead>
                <TableHead className="w-[130px]">Atualização</TableHead>
                <TableHead className="w-[80px]">Kanban</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(prop => (
                <TableRow
                  key={prop.id}
                  className="cursor-pointer hover:bg-accent/50"
                  onClick={() => setSelected(prop)}
                >
                  <TableCell>
                    <Badge variant="outline" className="font-mono">{prop.tipo}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{prop.numero}/{prop.ano}</TableCell>
                  <TableCell className="max-w-[300px] truncate text-sm">{prop.ementa}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(prop.status_proposicao)}>
                      {prop.status_proposicao || "—"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm truncate max-w-[140px]">{prop.autor || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {prop.ultima_atualizacao
                      ? format(new Date(prop.ultima_atualizacao), "dd/MM/yyyy", { locale: ptBR })
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {prop.adicionado_kanban ? (
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-[10px]">
                        <KanbanSquare className="h-3 w-3 mr-1" /> Sim
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <ProposicaoDetailDialog
          proposicao={selected}
          onClose={() => setSelected(null)}
          onAddToKanban={handleAddToKanban}
          isAdding={addToKanban.isPending}
        />
      )}
    </div>
  );
}

function ProposicaoDetailDialog({
  proposicao,
  onClose,
  onAddToKanban,
  isAdding,
}: {
  proposicao: Proposicao;
  onClose: () => void;
  onAddToKanban: (p: Proposicao) => void;
  isAdding: boolean;
}) {
  const { data: tramitacoes, isLoading } = useTramitacoes(proposicao.id);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-base">{proposicao.tipo}</Badge>
            {proposicao.numero}/{proposicao.ano}
          </DialogTitle>
          <DialogDescription className="sr-only">Detalhes da proposição</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            {/* Status + Author */}
            <div className="flex flex-wrap gap-2">
              <Badge className={getStatusColor(proposicao.status_proposicao)}>
                {proposicao.status_proposicao || "Sem status"}
              </Badge>
              {proposicao.tema && <Badge variant="secondary">{proposicao.tema}</Badge>}
            </div>

            {/* Ementa */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-1">Ementa</h3>
              <p className="text-sm leading-relaxed">{proposicao.ementa || "Sem ementa disponível"}</p>
            </div>

            {/* Author */}
            {proposicao.autor && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-1">Autor(es)</h3>
                <p className="text-sm">{proposicao.autor}</p>
              </div>
            )}

            {/* Link */}
            {proposicao.url_inteiro_teor && (
              <a
                href={proposicao.url_inteiro_teor}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Ver inteiro teor
              </a>
            )}

            {/* Tramitações */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                Histórico de Tramitação
                <ChevronDown className="h-3.5 w-3.5" />
              </h3>
              {isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : !tramitacoes || tramitacoes.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma tramitação registrada.</p>
              ) : (
                <div className="space-y-3">
                  {tramitacoes.map(t => (
                    <div key={t.id} className="border-l-2 border-primary/30 pl-4 py-1">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {t.data_hora && (
                          <span>{format(new Date(t.data_hora), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                        )}
                        {t.sigla_orgao && <Badge variant="outline" className="text-[10px]">{t.sigla_orgao}</Badge>}
                      </div>
                      <p className="text-sm mt-1">{t.descricao_tramitacao}</p>
                      {t.despacho && <p className="text-xs text-muted-foreground mt-0.5">{t.despacho}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          {!proposicao.adicionado_kanban ? (
            <Button onClick={() => onAddToKanban(proposicao)} disabled={isAdding} className="gap-2">
              <KanbanSquare className="h-4 w-4" />
              {isAdding ? "Adicionando..." : "Adicionar ao Kanban"}
            </Button>
          ) : (
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 px-4 py-2">
              <KanbanSquare className="h-4 w-4 mr-2" /> Já no Kanban
            </Badge>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
