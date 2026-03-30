import { useState, useMemo, useEffect, useRef } from "react";
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
import { MapPin, Users, FileText, Landmark, Flame, AlertTriangle, Snowflake, Plus, Pencil, Trash2, Search, Filter, Loader2, LayoutGrid, List, ArrowDownWideNarrow, ArrowUpWideNarrow } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { calcularScoreCidade, canViewScore, type UserRole, type CidadeBase } from "@/lib/scoring";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCidades } from "@/hooks/use-cidades";
import CidadeDetailDialog from "@/components/cidades/CidadeDetailDialog";

const CURRENT_ROLE: UserRole = "deputado";

const statusConfig = {
  alta: { icon: Flame, label: "Alta", className: "bg-success/10 text-success border-success/20" },
  atencao: { icon: AlertTriangle, label: "Atenção", className: "bg-warning/10 text-warning border-warning/20" },
  baixa: { icon: Snowflake, label: "Baixa", className: "bg-info/10 text-info border-info/20" },
};

// Population classification for color coding
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

const ESTADOS_BR = [
  { sigla: "AC", nome: "Acre" }, { sigla: "AL", nome: "Alagoas" }, { sigla: "AP", nome: "Amapá" },
  { sigla: "AM", nome: "Amazonas" }, { sigla: "BA", nome: "Bahia" }, { sigla: "CE", nome: "Ceará" },
  { sigla: "DF", nome: "Distrito Federal" }, { sigla: "ES", nome: "Espírito Santo" }, { sigla: "GO", nome: "Goiás" },
  { sigla: "MA", nome: "Maranhão" }, { sigla: "MT", nome: "Mato Grosso" }, { sigla: "MS", nome: "Mato Grosso do Sul" },
  { sigla: "MG", nome: "Minas Gerais" }, { sigla: "PA", nome: "Pará" }, { sigla: "PB", nome: "Paraíba" },
  { sigla: "PR", nome: "Paraná" }, { sigla: "PE", nome: "Pernambuco" }, { sigla: "PI", nome: "Piauí" },
  { sigla: "RJ", nome: "Rio de Janeiro" }, { sigla: "RN", nome: "Rio Grande do Norte" },
  { sigla: "RS", nome: "Rio Grande do Sul" }, { sigla: "RO", nome: "Rondônia" }, { sigla: "RR", nome: "Roraima" },
  { sigla: "SC", nome: "Santa Catarina" }, { sigla: "SP", nome: "São Paulo" }, { sigla: "SE", nome: "Sergipe" },
  { sigla: "TO", nome: "Tocantins" },
];

async function fetchPopulacaoIBGE(municipioId: number): Promise<string> {
  try {
    const res = await fetch(
      `https://servicodados.ibge.gov.br/api/v3/agregados/6579/periodos/-6/variaveis/9324?localidades=N6[${municipioId}]`
    );
    const data = await res.json();
    const series = data?.[0]?.resultados?.[0]?.series?.[0]?.serie;
    if (series) {
      const years = Object.keys(series).sort().reverse();
      for (const y of years) {
        if (series[y] && series[y] !== "-" && series[y] !== "...") {
          return Number(series[y]).toLocaleString("pt-BR");
        }
      }
    }
  } catch {}
  return "0";
}

async function fetchPopulacoesBulk(ids: number[]): Promise<Map<number, string>> {
  const result = new Map<number, string>();
  if (ids.length === 0) return result;
  
  // IBGE bulk endpoint with pipe separator returns 500, so we fetch in parallel individually
  const promises = ids.map(async (id) => {
    const pop = await fetchPopulacaoIBGE(id);
    if (pop !== "0") result.set(id, pop);
  });

  // Process in batches of 5 to avoid overwhelming the API
  for (let i = 0; i < promises.length; i += 5) {
    await Promise.all(promises.slice(i, i + 5));
  }
  
  return result;
}

async function fetchMunicipiosByUF(uf: string) {
  try {
    const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`);
    return await res.json();
  } catch { return []; }
}

function CidadeFormDialog({ open, onOpenChange, onSave, onBatchSave, initial }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  onSave: (c: CidadeBase) => void;
  onBatchSave: (cities: CidadeBase[]) => Promise<void>;
  initial?: CidadeBase;
}) {
  const [tab, setTab] = useState<"single" | "batch">("single");

  // Single city
  const [name, setName] = useState("");
  const [population, setPopulation] = useState("0");
  const [peso, setPeso] = useState("1");
  const [estado, setEstado] = useState("");
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingPop, setLoadingPop] = useState(false);
  const [municipios, setMunicipios] = useState<any[]>([]);

  // Batch
  const [batchEstado, setBatchEstado] = useState("");
  const [batchText, setBatchText] = useState("");
  const [batchSaving, setBatchSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTab(initial ? "single" : "single");
      setName(initial?.name || "");
      setPopulation(initial?.population || "0");
      setPeso(initial?.peso?.toString() || "1");
      setEstado(initial?.regiao || "");
      setQuery(initial?.name?.split("/")[0] || "");
      setBatchEstado("");
      setBatchText("");
    }
  }, [open, initial]);

  // Load municipios when estado changes (single)
  useEffect(() => {
    if (estado) {
      fetchMunicipiosByUF(estado).then(setMunicipios);
    } else {
      setMunicipios([]);
    }
  }, [estado]);

  // Filter suggestions
  useEffect(() => {
    if (query.length < 2 || !municipios.length) {
      setSuggestions([]);
      return;
    }
    const q = query.toLowerCase();
    setSuggestions(municipios.filter((m: any) => m.nome.toLowerCase().includes(q)).slice(0, 8));
  }, [query, municipios]);

  const selectMunicipio = async (m: any) => {
    setName(`${m.nome}/${estado}`);
    setQuery(m.nome);
    setShowSuggestions(false);
    setLoadingPop(true);
    const pop = await fetchPopulacaoIBGE(m.id);
    setPopulation(pop);
    setLoadingPop(false);
  };

  const handleSaveSingle = () => {
    if (!name.trim()) { toast.error("Selecione uma cidade"); return; }
    onSave({
      name: name.trim(), population, peso: Number(peso) || 1,
      regiao: estado || "Não definido",
      demandas: initial?.demandas || 0, demandasResolvidas: initial?.demandasResolvidas || 0,
      comunicacaoRecente: initial?.comunicacaoRecente || false, presencaDeputado: initial?.presencaDeputado || false,
      engajamento: initial?.engajamento || 0, liderancas: initial?.liderancas || 0, emendas: initial?.emendas || 0,
    });
    onOpenChange(false);
  };

  const handleBatchSave = async () => {
    if (!batchEstado) { toast.error("Selecione o estado"); return; }
    const lines = batchText.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) { toast.error("Adicione pelo menos uma cidade"); return; }

    setBatchSaving(true);
    try {
      const munis = await fetchMunicipiosByUF(batchEstado);
      const matched = lines.map(line => {
        const found = munis.find((m: any) => m.nome.toLowerCase() === line.toLowerCase());
        return { line, found };
      });

      // Fetch populations in bulk
      const idsToFetch = matched.filter(m => m.found).map(m => m.found.id as number);
      const popMap = await fetchPopulacoesBulk(idsToFetch);

      const cities: CidadeBase[] = matched.map(({ line, found }) => ({
        name: `${found?.nome || line}/${batchEstado}`,
        population: found ? (popMap.get(found.id) || "0") : "0",
        peso: 5, regiao: batchEstado,
        demandas: 0, demandasResolvidas: 0, comunicacaoRecente: false,
        presencaDeputado: false, engajamento: 0, liderancas: 0, emendas: 0,
      }));

      let imported = 0;
      let skipped = 0;
      for (const c of cities) {
        try {
          await onBatchSave([c]);
          imported++;
        } catch {
          skipped++;
        }
      }
      if (imported > 0) toast.success(`${imported} cidades importadas!`);
      if (skipped > 0) toast.info(`${skipped} cidades já existiam e foram ignoradas`);
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Erro na importação: " + e.message);
    }
    setBatchSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {initial ? "Editar Cidade" : "Adicionar Cidade"}
          </DialogTitle>
          {!initial && (
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Expansão de Base</p>
          )}
        </DialogHeader>

        {/* Tabs */}
        {!initial && (
          <div className="flex rounded-full border p-1 gap-1">
            <button
              onClick={() => setTab("single")}
              className={`flex-1 text-sm font-medium py-2 rounded-full transition-colors ${
                tab === "single" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Cidade Única
            </button>
            <button
              onClick={() => setTab("batch")}
              className={`flex-1 text-sm font-medium py-2 rounded-full transition-colors ${
                tab === "batch" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Importação em Lote
            </button>
          </div>
        )}

        {tab === "single" ? (
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider">Estado (UF)</Label>
              <Select value={estado} onValueChange={setEstado}>
                <SelectTrigger><SelectValue placeholder="Selecione o estado" /></SelectTrigger>
                <SelectContent>
                  {ESTADOS_BR.map(e => (
                    <SelectItem key={e.sigla} value={e.sigla}>{e.sigla} — {e.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="relative">
              <Label className="text-xs font-semibold uppercase tracking-wider">Nome da Cidade</Label>
              <Input
                value={query}
                onChange={(e) => { setQuery(e.target.value); setShowSuggestions(true); }}
                onFocus={() => query.length >= 2 && setShowSuggestions(true)}
                placeholder={estado ? "Digite o nome da cidade" : "Selecione o estado primeiro"}
                disabled={!estado}
              />
              {!estado && (
                <p className="text-xs text-muted-foreground mt-1">* Selecione o estado para buscar cidades</p>
              )}
              {estado && (
                <p className="text-xs text-muted-foreground mt-1">* População e peso estratégico serão preenchidos automaticamente via IBGE</p>
              )}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {suggestions.map((m: any) => (
                    <button
                      key={m.id}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectMunicipio(m)}
                    >
                      {m.nome}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider">População</Label>
                <Input value={loadingPop ? "Buscando..." : population} onChange={(e) => setPopulation(e.target.value)} disabled={loadingPop} />
              </div>
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider">Peso Estratégico</Label>
                <Input type="number" min={1} max={10} value={peso} onChange={(e) => setPeso(e.target.value)} />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button className="flex-1" onClick={handleSaveSingle} disabled={!name.trim() || loadingPop}>
                {loadingPop ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Buscando...</> : "Salvar Cidade"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider">Estado (UF)</Label>
              <Select value={batchEstado} onValueChange={setBatchEstado}>
                <SelectTrigger><SelectValue placeholder="Selecione o estado" /></SelectTrigger>
                <SelectContent>
                  {ESTADOS_BR.map(e => (
                    <SelectItem key={e.sigla} value={e.sigla}>{e.sigla} — {e.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider">Lista de Cidades (uma por linha)</Label>
              <Textarea
                value={batchText}
                onChange={(e) => setBatchText(e.target.value)}
                placeholder={"São Paulo\nCampinas\nSantos"}
                rows={8}
                className="resize-none"
              />
              {batchText.trim() && (
                <p className="text-xs text-muted-foreground mt-1">
                  {batchText.split("\n").filter(l => l.trim()).length} cidades na lista
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button className="flex-1" onClick={handleBatchSave} disabled={batchSaving || !batchEstado || !batchText.trim()}>
                {batchSaving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Importando...</> : "Salvar Cidade"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
export default function Cidades() {
  const { cidades: cidadesRaw, insert, update, remove } = useCidades();
  const [formOpen, setFormOpen] = useState(false);
  const [editingCity, setEditingCity] = useState<(CidadeBase & { id: string }) | undefined>();
  const [deleteCity, setDeleteCity] = useState<(CidadeBase & { id: string }) | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterEstado, setFilterEstado] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");

  const [sortField, setSortField] = useState<"none" | "pop" | "liderancas">("none");
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
    }
    return [...filtered].sort((a, b) => b.score - a.score);
  }, [allCidades, searchQuery, filterEstado, filterStatus, sortField, sortDir]);

  const activeFilterCount = [filterEstado !== "all", filterStatus !== "all"].filter(Boolean).length;
  const estados = useMemo(() => [...new Set(allCidades.map(c => c.regiao))].sort(), [allCidades]);
  const showScore = canViewScore(CURRENT_ROLE);

  const handleSave = async (c: CidadeBase) => {
    try {
      if (editingCity) {
        await update({ id: editingCity.id, data: c });
        toast.success("Cidade atualizada");
      } else {
        await insert(c);
        toast.success("Cidade cadastrada");
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
        <Button className="gap-2" onClick={() => { setEditingCity(undefined); setFormOpen(true); }}>
          <Plus className="h-4 w-4" /> Nova Cidade
        </Button>
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
                  className="hover:shadow-md transition-shadow"
                  style={{ backgroundColor: popClass.bg, borderColor: popClass.border }}
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
                    {showScore && (
                      <div className="flex items-center gap-2">
                        <Progress value={c.score} className="h-2 flex-1" />
                        <span className="text-sm font-bold w-8 text-right" style={{ color: popClass.text }}>{c.score}</span>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2 text-xs" style={{ color: popClass.text }}>
                      <span className="font-semibold">Pop: {c.population}</span>
                      <span>Peso: {c.peso}/10</span>
                      <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> {c.demandas} demandas</span>
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {c.liderancas} lideranças</span>
                      <span className="flex items-center gap-1"><Landmark className="h-3 w-3" /> {c.emendas} emendas</span>
                      <span>{c.regiao}</span>
                    </div>
                    <div className="flex gap-1 pt-1">
                      <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => { setEditingCity(c); setFormOpen(true); }}>
                        <Pencil className="h-3 w-3" /> Editar
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-destructive hover:text-destructive" onClick={() => setDeleteCity(c)}>
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
                <TableHead>Peso</TableHead>
                <TableHead>Status</TableHead>
                {showScore && <TableHead>Score</TableHead>}
                <TableHead>Demandas</TableHead>
                <TableHead>Lideranças</TableHead>
                <TableHead>Emendas</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cidades.map((c) => {
                const cfg = statusConfig[c.status];
                const popClass = getPopulationClass(c.population);
                return (
                  <TableRow key={c.id} style={{ backgroundColor: `${popClass.bg}80` }}>
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
                    <TableCell>{c.peso}/10</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] ${cfg.className}`}>
                        <cfg.icon className="h-3 w-3 mr-1" /> {cfg.label}
                      </Badge>
                    </TableCell>
                    {showScore && (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={c.score} className="h-2 w-16" />
                          <span className="text-sm font-bold">{c.score}</span>
                        </div>
                      </TableCell>
                    )}
                    <TableCell>{c.demandas}</TableCell>
                    <TableCell>{c.liderancas}</TableCell>
                    <TableCell>{c.emendas}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => { setEditingCity(c); setFormOpen(true); }}>
                          <Pencil className="h-3 w-3" /> Editar
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-destructive hover:text-destructive" onClick={() => setDeleteCity(c)}>
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
    </div>
  );
}
