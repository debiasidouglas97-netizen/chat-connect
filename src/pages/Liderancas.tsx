import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Plus, MapPin, Star, StickyNote, X, Search, ArrowUpAZ, ArrowDownAZ, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { calcularScoreLideranca, canViewScore, type UserRole, type CidadeBase, type LiderancaComScore } from "@/lib/scoring";
import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import LiderancaNotesDialog from "@/components/liderancas/LiderancaNotesDialog";
import LiderancaDetailDialog from "@/components/liderancas/LiderancaDetailDialog";
import NovaLiderancaDialog from "@/components/liderancas/NovaLiderancaDialog";
import { toast } from "sonner";
import { useLiderancas } from "@/hooks/use-liderancas";
import { useCidades } from "@/hooks/use-cidades";
import { useAllLeaderEngagementScores } from "@/hooks/use-engagement";

const CURRENT_ROLE: UserRole = "deputado";

const influenciaColors: Record<string, string> = {
  Alta: "bg-success/10 text-success border-success/20",
  Média: "bg-warning/10 text-warning border-warning/20",
  Baixa: "bg-muted text-muted-foreground",
};

type SortOption = "score" | "az" | "za" | "engajamento";

export default function Liderancas() {
  const [notesOpen, setNotesOpen] = useState(false);
  const [selectedLider, setSelectedLider] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLider, setDetailLider] = useState<LiderancaComScore | null>(null);
  const [novaOpen, setNovaOpen] = useState(false);
  const [photoLightbox, setPhotoLightbox] = useState<{ url: string; name: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchField, setSearchField] = useState<"nome" | "cidade">("nome");
  const [sortBy, setSortBy] = useState<SortOption>("score");
  const [filterCidade, setFilterCidade] = useState<string>("all");
  const [filterTipo, setFilterTipo] = useState<string>("all");
  const [filterEngajamento, setFilterEngajamento] = useState<string>("all");
  const [searchParams] = useSearchParams();
  const { liderancas: rawData, insert, update, remove } = useLiderancas();
  const { data: engagementScores } = useAllLeaderEngagementScores();

  useEffect(() => {
    const busca = searchParams.get("busca");
    if (busca) {
      setSearchQuery(busca);
      setSearchField("nome");
    }
  }, [searchParams]);
  const { cidades: cidadesRaw } = useCidades();

  const cidadesMap = useMemo(() => {
    const map = new Map<string, CidadeBase>();
    cidadesRaw.forEach((c) => map.set(c.name, c));
    return map;
  }, [cidadesRaw]);

  const liderancas = useMemo(
    () => rawData.map((l) => ({ ...calcularScoreLideranca(l, cidadesMap), id: (l as any).id })),
    [cidadesMap, rawData]
  );

  // Unique cities for filter
  const cidadesDisponiveis = useMemo(() => {
    const set = new Set<string>();
    liderancas.forEach((l) => set.add(l.cidadePrincipal));
    return Array.from(set).sort();
  }, [liderancas]);

  const filteredLiderancas = useMemo(() => {
    let result = [...liderancas];

    // Text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((l) =>
        searchField === "nome"
          ? l.name.toLowerCase().includes(q)
          : l.cidadePrincipal.toLowerCase().includes(q)
      );
    }

    // Filter by city
    if (filterCidade !== "all") {
      result = result.filter((l) => l.cidadePrincipal === filterCidade);
    }

    // Filter by type
    if (filterTipo !== "all") {
      result = result.filter((l) => l.tipo === filterTipo);
    }

    // Filter by engagement level
    if (filterEngajamento !== "all" && engagementScores) {
      result = result.filter((l) => {
        const score = engagementScores.get((l as any).id) || 0;
        if (filterEngajamento === "alto") return score >= 30;
        if (filterEngajamento === "medio") return score >= 15 && score < 30;
        if (filterEngajamento === "baixo") return score > 0 && score < 15;
        if (filterEngajamento === "sem") return score === 0;
        return true;
      });
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === "az") return a.name.localeCompare(b.name, "pt-BR");
      if (sortBy === "za") return b.name.localeCompare(a.name, "pt-BR");
      if (sortBy === "engajamento") {
        const sa = engagementScores?.get((a as any).id) || 0;
        const sb = engagementScores?.get((b as any).id) || 0;
        return sb - sa;
      }
      return b.score - a.score;
    });

    return result;
  }, [liderancas, searchQuery, searchField, filterCidade, filterTipo, filterEngajamento, sortBy, engagementScores]);

  const showScore = canViewScore(CURRENT_ROLE);

  const hasActiveFilters = filterCidade !== "all" || filterTipo !== "all" || filterEngajamento !== "all";

  const clearFilters = () => {
    setFilterCidade("all");
    setFilterTipo("all");
    setFilterEngajamento("all");
    setSearchQuery("");
    setSortBy("score");
  };

  const openNotes = (e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    setSelectedLider(name);
    setNotesOpen(true);
  };

  const openDetail = (l: LiderancaComScore) => {
    setDetailLider(l);
    setDetailOpen(true);
  };

  const handleSave = async (original: LiderancaComScore, updated: Record<string, any>) => {
    try {
      const id = (original as any).id;
      if (updated.name && updated.name !== original.name) {
        updated.img = updated.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
      }
      await update({ id, data: updated });
      setDetailLider((prev) => prev ? { ...prev, ...updated } : prev);
      toast.success("Liderança atualizada");
    } catch {
      toast.error("Erro ao atualizar");
    }
  };

  const handleDelete = async (name: string) => {
    try {
      const l = liderancas.find((x) => x.name === name);
      if (l) await remove((l as any).id);
      toast.success("Liderança excluída");
    } catch {
      toast.error("Erro ao excluir");
    }
  };

  const handleAdd = async (l: any) => {
    try {
      await insert(l);
      toast.success("Liderança cadastrada");
    } catch {
      toast.error("Erro ao cadastrar");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Lideranças</h1>
          <p className="text-sm text-muted-foreground">CRM político — gestão de lideranças territoriais</p>
        </div>
        <Button className="gap-2" onClick={() => setNovaOpen(true)}>
          <Plus className="h-4 w-4" /> Nova Liderança
        </Button>
      </div>

      {/* Search + Filters */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 max-w-md">
          <Select value={searchField} onValueChange={(v) => setSearchField(v as "nome" | "cidade")}>
            <SelectTrigger className="w-[140px] shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nome">Nome</SelectItem>
              <SelectItem value="cidade">Cidade</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchField === "nome" ? "Buscar por nome..." : "Buscar por cidade..."}
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground" />
          
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="score">🏆 Maior Score</SelectItem>
              <SelectItem value="az">
                <span className="flex items-center gap-1"><ArrowUpAZ className="h-3 w-3" /> A → Z</span>
              </SelectItem>
              <SelectItem value="za">
                <span className="flex items-center gap-1"><ArrowDownAZ className="h-3 w-3" /> Z → A</span>
              </SelectItem>
              <SelectItem value="engajamento">📊 Maior Engajamento</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterCidade} onValueChange={setFilterCidade}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue placeholder="Cidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as cidades</SelectItem>
              {cidadesDisponiveis.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterTipo} onValueChange={setFilterTipo}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="Eleitoral">Eleitoral</SelectItem>
              <SelectItem value="Comunitária">Comunitária</SelectItem>
              <SelectItem value="Política">Política</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterEngajamento} onValueChange={setFilterEngajamento}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue placeholder="Engajamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo engajamento</SelectItem>
              <SelectItem value="alto">📊 Alto (30+)</SelectItem>
              <SelectItem value="medio">📊 Médio (15-29)</SelectItem>
              <SelectItem value="baixo">📊 Baixo (1-14)</SelectItem>
              <SelectItem value="sem">Sem engajamento</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 text-muted-foreground" onClick={clearFilters}>
              <X className="h-3 w-3" /> Limpar filtros
            </Button>
          )}

          <span className="text-xs text-muted-foreground ml-auto">
            {filteredLiderancas.length} de {liderancas.length} lideranças
          </span>
        </div>
      </div>

      {filteredLiderancas.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg">{searchQuery || hasActiveFilters ? "Nenhuma liderança encontrada" : "Nenhuma liderança cadastrada"}</p>
          <p className="text-sm">{searchQuery || hasActiveFilters ? "Tente outro termo ou limpe os filtros" : 'Clique em "Nova Liderança" para começar'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredLiderancas.map((l) => (
            <Card
              key={(l as any).id || l.name}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => openDetail(l)}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <button
                    className="shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (l.avatar_url) setPhotoLightbox({ url: l.avatar_url, name: l.name });
                    }}
                    title={l.avatar_url ? "Ver foto em tela cheia" : undefined}
                  >
                    <Avatar className={`h-12 w-12 border border-primary/20 ${l.avatar_url ? "cursor-zoom-in" : ""}`}>
                      {l.avatar_url && <AvatarImage src={l.avatar_url} className="object-cover" />}
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">{l.img}</AvatarFallback>
                    </Avatar>
                  </button>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground">{l.name}</h3>
                    <p className="text-xs text-muted-foreground">{l.cargo}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{l.cidadePrincipal}</span>
                    </div>
                  </div>
                  {showScore && (
                    <div className="text-right">
                      <div className="text-lg font-bold text-foreground">{l.score}</div>
                      <p className="text-[10px] text-muted-foreground">Score</p>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-4 flex-wrap">
                  <Badge variant="outline" className={`text-[10px] ${influenciaColors[l.influencia]}`}>
                    <Star className="h-3 w-3 mr-1" /> {l.influencia}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">{l.tipo}</Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {l.classificacao.icon} {l.classificacao.label}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px]">
                    <MapPin className="h-3 w-3 mr-1" /> {l.atuacao.length} cidades
                  </Badge>
                  {(() => {
                    const engScore = engagementScores?.get((l as any).id) || 0;
                    if (engScore > 0) {
                      const nivel = engScore >= 30 ? "Alto" : engScore >= 15 ? "Médio" : "Baixo";
                      const nivelColor = nivel === "Alto" ? "bg-[#E6F4EA] text-[#2E7D32] border-[#C8E6C9]" : nivel === "Médio" ? "bg-[#FFF4E5] text-[#B26A00] border-[#FFE0B2]" : "bg-muted text-muted-foreground";
                      return (
                        <Badge variant="outline" className={`text-[10px] ${nivelColor}`}>
                          📊 Eng. {nivel} ({engScore}pts)
                        </Badge>
                      );
                    }
                    return null;
                  })()}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-auto h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
                    onClick={(e) => openNotes(e, l.name)}
                  >
                    <StickyNote className="h-3.5 w-3.5" /> Notas
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <LiderancaNotesDialog open={notesOpen} onOpenChange={setNotesOpen} liderancaName={selectedLider} />
      <LiderancaDetailDialog open={detailOpen} onOpenChange={setDetailOpen} lideranca={detailLider} onSave={handleSave} onDelete={handleDelete} showScore={showScore} />
      <NovaLiderancaDialog open={novaOpen} onOpenChange={setNovaOpen} onAdd={handleAdd} />

      {photoLightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm cursor-zoom-out" onClick={() => setPhotoLightbox(null)}>
          <button className="absolute top-4 right-4 text-white/80 hover:text-white" onClick={() => setPhotoLightbox(null)}>
            <X className="h-6 w-6" />
          </button>
          <div className="text-center" onClick={(e) => e.stopPropagation()}>
            <img src={photoLightbox.url} alt={photoLightbox.name} className="max-h-[80vh] max-w-[90vw] rounded-lg shadow-2xl object-contain cursor-default" />
            <p className="text-white text-lg font-semibold mt-4">{photoLightbox.name}</p>
          </div>
        </div>
      )}
    </div>
  );
}
