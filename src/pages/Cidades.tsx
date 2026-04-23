import { useState, useMemo, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Users, FileText, Landmark, Flame, AlertTriangle, Snowflake, Plus, Pencil, Trash2, Search, Filter, Loader2, LayoutGrid, List, ArrowDownWideNarrow, ArrowUpWideNarrow, Vote } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { calcularScoreCidade, canViewScore, type UserRole, type CidadeBase } from "@/lib/scoring";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCidades } from "@/hooks/use-cidades";
import { useTenant } from "@/hooks/use-tenant";
import { supabase } from "@/integrations/supabase/client";
import { downloadAndParseTSEVotes } from "@/lib/tse-parser";
import CidadeDetailDialog from "@/components/cidades/CidadeDetailDialog";
import CidadeFormDialog, { fetchMunicipiosByUF, fetchPopulacoesBulk } from "@/components/cidades/CidadeFormDialog";

const CURRENT_ROLE: UserRole = "deputado";

const statusConfig = {
  alta: { icon: Flame, label: "Alta", className: "bg-success/10 text-success border-success/20" },
  atencao: { icon: AlertTriangle, label: "Atenção", className: "bg-warning/10 text-warning border-warning/20" },
  baixa: { icon: Snowflake, label: "Baixa", className: "bg-info/10 text-info border-info/20" },
};

const FAIXAS_POPULACAO = [
  { max: 50000, label: "Cidade pequena", bg: "#D1FAE5", border: "#A7F3D0", text: "#065F46" },
  { max: 200000, label: "Cidade média", bg: "#DBEAFE", border: "#BFDBFE", text: "#1E40AF" },
  { max: 500000, label: "Cidade grande", bg: "#FEF3C7", border: "#FDE68A", text: "#92400E" },
  { max: 1000000, label: "Metrópole regional", bg: "#FED7AA", border: "#FDBA74", text: "#9A3412" },
  { max: Infinity, label: "Metrópole", bg: "#FECACA", border: "#FCA5A5", text: "#991B1B" },
];

function parsePopulation(pop: string): number {
  if (!pop || pop === "0") return 0;
  return Number(pop.replace(/\./g, "").replace(/,/g, "")) || 0;
}

function getPopulationClass(pop: string) {
  const num = parsePopulation(pop);
  return FAIXAS_POPULACAO.find(f => num <= f.max) || FAIXAS_POPULACAO[0];
}

export default function Cidades() {
  const { cidades: cidadesRaw, insert, update, remove } = useCidades();
  const { tenantId } = useTenant();
  const [formOpen, setFormOpen] = useState(false);
  const [editingCity, setEditingCity] = useState<(CidadeBase & { id: string }) | undefined>();
  const [deleteCity, setDeleteCity] = useState<(CidadeBase & { id: string }) | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterEstado, setFilterEstado] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");
  const [detailCity, setDetailCity] = useState<any | null>(null);

  const [sortField, setSortField] = useState<"none" | "pop" | "liderancas" | "votos" | "conversao">("none");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");

  const allCidades = useMemo(
    () => cidadesRaw.map((c) => ({ ...calcularScoreCidade(c), id: (c as any).id })),
    [cidadesRaw]
  );

  const cidades = useMemo(() => {
    const filtered = allCidades.filter((c) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!c.name.toLowerCase().includes(q) && !c.regiao.toLowerCase().includes(q)) return false;
      }
      if (filterEstado !== "all" && c.regiao !== filterEstado) return false;
      if (filterStatus !== "all" && c.status !== filterStatus) return false;
      return true;
    });

    if (sortField === "pop") {
      return [...filtered].sort((a, b) => sortDir === "desc" 
        ? parsePopulation(b.population) - parsePopulation(a.population)
        : parsePopulation(a.population) - parsePopulation(b.population));
    } else if (sortField === "liderancas") {
      return [...filtered].sort((a, b) => sortDir === "desc"
        ? b.liderancas - a.liderancas
        : a.liderancas - b.liderancas);
    } else if (sortField === "votos") {
      return [...filtered].sort((a, b) => sortDir === "desc"
        ? ((b as any).votos2022 || 0) - ((a as any).votos2022 || 0)
        : ((a as any).votos2022 || 0) - ((b as any).votos2022 || 0));
    } else if (sortField === "conversao") {
      const getConversao = (c: any) => {
        const votos = c.votos2022 || 0;
        const pop = parseInt(String(c.population).replace(/\D/g, ""), 10) || 1;
        return (votos / pop) * 100;
      };
      return [...filtered].sort((a, b) => sortDir === "desc"
        ? getConversao(b) - getConversao(a)
        : getConversao(a) - getConversao(b));
    }
    return [...filtered].sort((a, b) => b.score - a.score);
  }, [allCidades, searchQuery, filterEstado, filterStatus, sortField, sortDir]);

  const activeFilterCount = [filterEstado !== "all", filterStatus !== "all"].filter(Boolean).length;
  const estados = useMemo(() => [...new Set(allCidades.map(c => c.regiao))].sort(), [allCidades]);
  const showScore = canViewScore(CURRENT_ROLE);

  const autoFetchVotes = async (cityNames: string[]) => {
    if (!tenantId || cityNames.length === 0) return;
    try {
      const { data: tenant } = await supabase
        .from("tenants")
        .select("nr_candidato_tse, estado, ano_eleicao")
        .eq("id", tenantId)
        .single();
      if (!tenant?.nr_candidato_tse || !tenant?.estado) return;

      const uf = tenant.estado;
      const ano = tenant.ano_eleicao || 2022;
      const votes = await downloadAndParseTSEVotes(tenant.nr_candidato_tse, uf, ano);
      if (Object.keys(votes).length === 0) return;

      // Call edge function to update DB with votes
      await supabase.functions.invoke("fetch-tse-votes", {
        body: { tenant_id: tenantId, votes },
      });
    } catch (err) {
      console.error("Auto-fetch votes error:", err);
    }
  };

  const handleSave = async (c: CidadeBase) => {
    try {
      if (editingCity) {
        await update({ id: editingCity.id, data: c });
        toast.success("Cidade atualizada");
      } else {
        await insert(c);
        toast.success("Cidade cadastrada");
        // Auto-fetch votes in background
        autoFetchVotes([c.name]).then(() => {
          // Silently done - query will be invalidated
        });
      }
      setEditingCity(undefined);
    } catch {
      toast.error("Erro ao salvar");
    }
  };

  const handleDelete = async () => {
    if (!deleteCity) return;
    try {
      await remove(deleteCity.id);
      setDeleteCity(null);
      toast.success("Cidade excluída");
    } catch {
      toast.error("Erro ao excluir");
    }
  };

  // Backfill populations for cities with "0" or empty population
  const backfillRunRef = useRef(false);
  useEffect(() => {
    if (backfillRunRef.current || cidadesRaw.length === 0) return;
    const missing = cidadesRaw.filter((c: any) => !c.population || c.population === "0");
    if (missing.length === 0) return;
    backfillRunRef.current = true;

    (async () => {
      const byUF = new Map<string, Array<{ id: string; name: string }>>();
      for (const c of missing as any[]) {
        const uf = c.regiao || "";
        if (!uf || uf.length !== 2) continue;
        if (!byUF.has(uf)) byUF.set(uf, []);
        byUF.get(uf)!.push({ id: c.id, name: c.name.split("/")[0] });
      }

      for (const [uf, cities] of byUF) {
        try {
          const munis = await fetchMunicipiosByUF(uf);
          const matchedIds: number[] = [];
          const cityToMuniId = new Map<string, number>();

          for (const city of cities) {
            const found = munis.find((m: any) => m.nome.toLowerCase() === city.name.toLowerCase());
            if (found) {
              matchedIds.push(found.id);
              cityToMuniId.set(city.id, found.id);
            }
          }

          if (matchedIds.length === 0) continue;
          const popMap = await fetchPopulacoesBulk(matchedIds);

          for (const city of cities) {
            const muniId = cityToMuniId.get(city.id);
            if (muniId && popMap.has(muniId)) {
              const raw = cidadesRaw.find((c: any) => c.id === city.id) as any;
              if (raw) {
                await update({ id: city.id, data: { ...raw, population: popMap.get(muniId)! } });
              }
            }
          }
        } catch {}
      }
    })();
  }, [cidadesRaw, update]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestão de Cidades</h1>
          <p className="text-sm text-muted-foreground">Monitoramento territorial</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={async () => {
              if (!tenantId) return;
              try {
                const { data: tenant } = await supabase
                  .from("tenants")
                  .select("estado")
                  .eq("id", tenantId)
                  .single();
                if (!tenant?.estado) {
                  toast.error("Configure o estado do mandato em Configurações.");
                  return;
                }
                toast.loading("Baixando eleitorado do TSE...", { id: "elei" });
                const { data, error } = await supabase.functions.invoke("fetch-tse-eleitorado", {
                  body: { tenant_id: tenantId, uf: tenant.estado, ano: 2024 },
                });
                if (error) throw error;
                if ((data as any)?.success) {
                  toast.success(`Eleitorado atualizado em ${(data as any).cities_updated} cidades`, { id: "elei" });
                } else {
                  toast.error((data as any)?.error || "Falha ao importar", { id: "elei" });
                }
              } catch (err: any) {
                toast.error(err?.message || "Erro ao importar eleitorado", { id: "elei" });
              }
            }}
          >
            <Vote className="h-4 w-4" /> Importar Eleitorado TSE 2024
          </Button>
          <Button className="gap-2" onClick={() => { setEditingCity(undefined); setFormOpen(true); }}>
            <Plus className="h-4 w-4" /> Nova Cidade
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cidades por nome ou região..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
           <Button
            variant="outline"
            className="gap-2"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4" />
            Filtros
            {activeFilterCount > 0 && (
              <Badge className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                {activeFilterCount}
              </Badge>
            )}
           </Button>
           <TooltipProvider>
             <Tooltip>
               <TooltipTrigger asChild>
                 <Button
                   variant={sortField === "pop" ? "default" : "outline"}
                   className="gap-2"
                   onClick={() => {
                     if (sortField !== "pop") { setSortField("pop"); setSortDir("desc"); }
                     else if (sortDir === "desc") { setSortDir("asc"); }
                     else { setSortField("none"); }
                   }}
                 >
                   {sortField === "pop" && sortDir === "asc" ? <ArrowUpWideNarrow className="h-4 w-4" /> : <ArrowDownWideNarrow className="h-4 w-4" />}
                   Pop.
                 </Button>
               </TooltipTrigger>
               <TooltipContent>
                 {sortField !== "pop" ? "Ordenar por população (maior → menor)" : sortDir === "desc" ? "Ordenar por população (menor → maior)" : "Voltar ao score"}
               </TooltipContent>
             </Tooltip>
           </TooltipProvider>
           <TooltipProvider>
             <Tooltip>
               <TooltipTrigger asChild>
                 <Button
                   variant={sortField === "liderancas" ? "default" : "outline"}
                   className="gap-2"
                   onClick={() => {
                     if (sortField !== "liderancas") { setSortField("liderancas"); setSortDir("desc"); }
                     else if (sortDir === "desc") { setSortDir("asc"); }
                     else { setSortField("none"); }
                   }}
                 >
                   {sortField === "liderancas" && sortDir === "asc" ? <ArrowUpWideNarrow className="h-4 w-4" /> : <ArrowDownWideNarrow className="h-4 w-4" />}
                   Lideranças
                 </Button>
               </TooltipTrigger>
               <TooltipContent>
                 {sortField !== "liderancas" ? "Ordenar por lideranças (maior → menor)" : sortDir === "desc" ? "Ordenar por lideranças (menor → maior)" : "Voltar ao score"}
               </TooltipContent>
              </Tooltip>
            </TooltipProvider>
           <TooltipProvider>
             <Tooltip>
               <TooltipTrigger asChild>
                 <Button
                   variant={sortField === "votos" ? "default" : "outline"}
                   className="gap-2"
                   onClick={() => {
                     if (sortField !== "votos") { setSortField("votos"); setSortDir("desc"); }
                     else if (sortDir === "desc") { setSortDir("asc"); }
                     else { setSortField("none"); }
                   }}
                 >
                   {sortField === "votos" && sortDir === "asc" ? <ArrowUpWideNarrow className="h-4 w-4" /> : <ArrowDownWideNarrow className="h-4 w-4" />}
                   Votos
                 </Button>
               </TooltipTrigger>
                <TooltipContent>
                  {sortField !== "votos" ? "Ordenar por votação (maior → menor)" : sortDir === "desc" ? "Ordenar por votação (menor → maior)" : "Voltar ao score"}
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={sortField === "conversao" ? "default" : "outline"}
                    className="gap-2"
                    onClick={() => {
                      if (sortField !== "conversao") { setSortField("conversao"); setSortDir("desc"); }
                      else if (sortDir === "desc") { setSortDir("asc"); }
                      else { setSortField("none"); }
                    }}
                  >
                    {sortField === "conversao" && sortDir === "asc" ? <ArrowUpWideNarrow className="h-4 w-4" /> : <ArrowDownWideNarrow className="h-4 w-4" />}
                    % Conversão
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {sortField !== "conversao" ? "Ordenar por conversão de votos (maior → menor)" : sortDir === "desc" ? "Ordenar por conversão (menor → maior)" : "Voltar ao score"}
                </TooltipContent>
              </Tooltip>
           </TooltipProvider>
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === "cards" ? "default" : "ghost"}
              size="icon"
              className="h-9 w-9 rounded-r-none"
              onClick={() => setViewMode("cards")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="icon"
              className="h-9 w-9 rounded-l-none"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {showFilters && (
          <div className="flex flex-col sm:flex-row gap-3 mt-3 pt-3 border-t">
            <div className="flex-1">
              <Label className="text-xs font-semibold uppercase tracking-wider">Estado</Label>
              <Select value={filterEstado} onValueChange={setFilterEstado}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os estados</SelectItem>
                  {estados.map(e => (
                    <SelectItem key={e} value={e}>{e}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label className="text-xs font-semibold uppercase tracking-wider">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="atencao">Atenção</SelectItem>
                  <SelectItem value="baixa">Baixa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" className="self-end text-xs" onClick={() => { setFilterEstado("all"); setFilterStatus("all"); }}>
                Limpar filtros
              </Button>
            )}
          </div>
        )}
      </Card>

      {cidades.length === 0 && allCidades.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg">Nenhuma cidade cadastrada</p>
          <p className="text-sm">Clique em "Nova Cidade" para começar</p>
        </div>
      ) : cidades.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg">Nenhuma cidade encontrada</p>
          <p className="text-sm">Tente ajustar os filtros ou a busca</p>
        </div>
      ) : viewMode === "cards" ? (
        <TooltipProvider>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {cidades.map((c) => {
              const cfg = statusConfig[c.status];
              const popClass = getPopulationClass(c.population);
              const popNum = parsePopulation(c.population);
              return (
                <Card
                  key={c.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  style={{ backgroundColor: popClass.bg, borderColor: popClass.border }}
                  onClick={() => setDetailCity(c)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-5 w-5" style={{ color: popClass.text }} />
                        <CardTitle className="text-base" style={{ color: popClass.text }}>{c.name}</CardTitle>
                      </div>
                      <div className="flex items-center gap-1">
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge
                              variant="outline"
                              className="text-[10px] cursor-help"
                              style={{ backgroundColor: `${popClass.bg}CC`, borderColor: popClass.border, color: popClass.text }}
                            >
                              {popClass.label}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="font-semibold">{popClass.label}</p>
                            <p className="text-xs">População: {popNum > 0 ? popNum.toLocaleString("pt-BR") : "N/D"}</p>
                          </TooltipContent>
                        </Tooltip>
                        <Badge variant="outline" className={`text-[10px] ${cfg.className}`}>
                          <cfg.icon className="h-3 w-3 mr-1" /> {cfg.label}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(() => {
                      const votos = (c as any).votos2022 || 0;
                      const pop = parseInt(String(c.population).replace(/\D/g, ""), 10) || 1;
                      const pct = Math.min(100, (votos / pop) * 100);
                      const hasPct = votos > 0;
                      return (
                        <div className="flex items-center gap-2">
                          <Progress value={hasPct ? pct : (showScore ? c.score : 0)} className="h-2 flex-1" />
                          <span className="text-sm font-bold w-8 text-right" style={{ color: popClass.text }}>
                            {hasPct ? `${pct.toFixed(1)}%` : (showScore ? c.score : "-")}
                          </span>
                        </div>
                      );
                    })()}
                    <div className="grid grid-cols-2 gap-2 text-xs" style={{ color: popClass.text }}>
                      <span className="font-semibold">Pop: {c.population}</span>
                      <span>Peso: {c.peso}/10</span>
                      <span className="font-semibold flex items-center gap-1">
                        <Vote className="h-3 w-3" />
                        Eleitores: {(c as any).eleitores2024 > 0 ? ((c as any).eleitores2024 as number).toLocaleString("pt-BR") : "—"}
                      </span>
                      <span></span>
                      <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> {c.demandas} demandas</span>
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {c.liderancas} lideranças</span>
                      <span className="flex items-center gap-1"><Landmark className="h-3 w-3" /> {c.emendas} emendas</span>
                      <span>{c.regiao}</span>
                    </div>
                    {(c as any).votos2022 > 0 && (
                      <div className="flex items-center justify-end mt-1">
                        <div className="text-right">
                          <p className="text-2xl font-black italic" style={{ color: popClass.text }}>
                            {((c as any).votos2022 as number).toLocaleString("pt-BR")}
                          </p>
                          <p className="text-[10px] font-semibold uppercase tracking-wider italic" style={{ color: popClass.text, opacity: 0.7 }}>
                            Votos
                          </p>
                        </div>
                      </div>
                    )}
                    <div className="flex gap-1 pt-1">
                      <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={(e) => { e.stopPropagation(); setEditingCity(c); setFormOpen(true); }}>
                        <Pencil className="h-3 w-3" /> Editar
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteCity(c); }}>
                        <Trash2 className="h-3 w-3" /> Excluir
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TooltipProvider>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cidade</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>População</TableHead>
                <TableHead>Eleitores 2024</TableHead>
                <TableHead>Peso</TableHead>
                <TableHead>Status</TableHead>
                {showScore && <TableHead>Score</TableHead>}
                <TableHead>Demandas</TableHead>
                <TableHead>Lideranças</TableHead>
                <TableHead>Emendas</TableHead>
                <TableHead>Votos 2022</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cidades.map((c) => {
                const cfg = statusConfig[c.status];
                const popClass = getPopulationClass(c.population);
                return (
                  <TableRow key={c.id} className="cursor-pointer" style={{ backgroundColor: `${popClass.bg}80` }} onClick={() => setDetailCity(c)}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" style={{ color: popClass.text }} />
                        {c.name}
                      </div>
                    </TableCell>
                    <TableCell>{c.regiao}</TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger className="cursor-help">
                            <Badge variant="outline" className="text-[10px]" style={{ backgroundColor: popClass.bg, borderColor: popClass.border, color: popClass.text }}>
                              {c.population} — {popClass.label}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="font-semibold">{popClass.label}</p>
                            <p className="text-xs">Pop: {parsePopulation(c.population).toLocaleString("pt-BR")}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell>
                      {(c as any).eleitores2024 > 0 ? (
                        <span className="font-medium">{((c as any).eleitores2024 as number).toLocaleString("pt-BR")}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>{c.peso}/10</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] ${cfg.className}`}>
                        <cfg.icon className="h-3 w-3 mr-1" /> {cfg.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const votos = (c as any).votos2022 || 0;
                        const pop = parseInt(String(c.population).replace(/\D/g, ""), 10) || 1;
                        const pct = Math.min(100, (votos / pop) * 100);
                        return votos > 0 ? (
                          <div className="flex items-center gap-2">
                            <Progress value={pct} className="h-2 w-16" />
                            <span className="text-sm font-bold">{pct.toFixed(1)}%</span>
                          </div>
                        ) : (
                          showScore ? (
                            <div className="flex items-center gap-2">
                              <Progress value={c.score} className="h-2 w-16" />
                              <span className="text-sm font-bold">{c.score}</span>
                            </div>
                          ) : <span className="text-muted-foreground">-</span>
                        );
                      })()}
                    </TableCell>
                    <TableCell>{c.demandas}</TableCell>
                    <TableCell>{c.liderancas}</TableCell>
                    <TableCell>{c.emendas}</TableCell>
                    <TableCell>
                      {(c as any).votos2022 > 0 ? (
                        <span className="font-bold">{((c as any).votos2022 as number).toLocaleString("pt-BR")}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                         <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={(e) => { e.stopPropagation(); setEditingCity(c); setFormOpen(true); }}>
                           <Pencil className="h-3 w-3" /> Editar
                         </Button>
                         <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteCity(c); }}>
                           <Trash2 className="h-3 w-3" /> Excluir
                         </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <CidadeFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSave={handleSave}
        onBatchSave={async (cities) => {
          for (const c of cities) {
            await insert(c);
          }
          autoFetchVotes(cities.map(c => c.name));
        }}
        initial={editingCity}
      />

      <AlertDialog open={!!deleteCity} onOpenChange={() => setDeleteCity(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cidade</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir <strong>{deleteCity?.name}</strong>?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CidadeDetailDialog
        open={!!detailCity}
        onOpenChange={(v) => !v && setDetailCity(null)}
        cidade={detailCity}
      />
    </div>
  );
}
