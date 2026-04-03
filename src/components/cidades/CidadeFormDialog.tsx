import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { CidadeBase } from "@/lib/scoring";

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
  const promises = ids.map(async (id) => {
    const pop = await fetchPopulacaoIBGE(id);
    if (pop !== "0") result.set(id, pop);
  });
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

export { ESTADOS_BR, fetchPopulacaoIBGE, fetchPopulacoesBulk, fetchMunicipiosByUF };

interface CidadeFormDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (c: CidadeBase) => void;
  onBatchSave: (cities: CidadeBase[]) => Promise<void>;
  initial?: CidadeBase;
}

export default function CidadeFormDialog({ open, onOpenChange, onSave, onBatchSave, initial }: CidadeFormDialogProps) {
  const [tab, setTab] = useState<"single" | "batch">("single");
  const [name, setName] = useState("");
  const [population, setPopulation] = useState("0");
  const [peso, setPeso] = useState("1");
  const [estado, setEstado] = useState("");
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingPop, setLoadingPop] = useState(false);
  const [municipios, setMunicipios] = useState<any[]>([]);
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

  useEffect(() => {
    if (estado) {
      fetchMunicipiosByUF(estado).then(setMunicipios);
    } else {
      setMunicipios([]);
    }
  }, [estado]);

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
        try { await onBatchSave([c]); imported++; } catch { skipped++; }
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
