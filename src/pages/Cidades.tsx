import { useState, useMemo, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Users, FileText, Landmark, Flame, AlertTriangle, Snowflake, Plus, Pencil, Trash2, Search, Filter, Loader2 } from "lucide-react";
import { calcularScoreCidade, canViewScore, type UserRole, type CidadeBase } from "@/lib/scoring";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCidades } from "@/hooks/use-cidades";

const CURRENT_ROLE: UserRole = "deputado";

const statusConfig = {
  alta: { icon: Flame, label: "Alta", className: "bg-success/10 text-success border-success/20" },
  atencao: { icon: AlertTriangle, label: "Atenção", className: "bg-warning/10 text-warning border-warning/20" },
  baixa: { icon: Snowflake, label: "Baixa", className: "bg-info/10 text-info border-info/20" },
};

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
      const cities: CidadeBase[] = [];

      for (const line of lines) {
        const found = munis.find((m: any) => m.nome.toLowerCase() === line.toLowerCase());
        let pop = "0";
        if (found) {
          pop = await fetchPopulacaoIBGE(found.id);
        }
        cities.push({
          name: `${found?.nome || line}/${batchEstado}`,
          population: pop, peso: 5, regiao: batchEstado,
          demandas: 0, demandasResolvidas: 0, comunicacaoRecente: false,
          presencaDeputado: false, engajamento: 0, liderancas: 0, emendas: 0,
        });
      }

      await onBatchSave(cities);
      toast.success(`${cities.length} cidades importadas!`);
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

  const cidades = useMemo(
    () => cidadesRaw.map((c) => ({ ...calcularScoreCidade(c), id: (c as any).id })).sort((a, b) => b.score - a.score),
    [cidadesRaw]
  );
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

      {cidades.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg">Nenhuma cidade cadastrada</p>
          <p className="text-sm">Clique em "Nova Cidade" para começar</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {cidades.map((c) => {
            const cfg = statusConfig[c.status];
            return (
              <Card key={c.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base">{c.name}</CardTitle>
                    </div>
                    <Badge variant="outline" className={`text-[10px] ${cfg.className}`}>
                      <cfg.icon className="h-3 w-3 mr-1" /> {cfg.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {showScore && (
                    <div className="flex items-center gap-2">
                      <Progress value={c.score} className="h-2 flex-1" />
                      <span className="text-sm font-bold text-foreground w-8 text-right">{c.score}</span>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <span>Pop: {c.population}</span>
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
      )}

      <CidadeFormDialog open={formOpen} onOpenChange={setFormOpen} onSave={handleSave} initial={editingCity} />

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
