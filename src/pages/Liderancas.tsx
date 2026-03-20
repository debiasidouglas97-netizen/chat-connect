import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Plus, MapPin, Star, StickyNote } from "lucide-react";
import { cidadesData, liderancasData as initialData } from "@/lib/mock-data";
import { calcularScoreLideranca, canViewScore, type UserRole, type CidadeBase, type LiderancaComScore, type LiderancaBase } from "@/lib/scoring";
import { useMemo, useState } from "react";
import LiderancaNotesDialog from "@/components/liderancas/LiderancaNotesDialog";
import LiderancaDetailDialog from "@/components/liderancas/LiderancaDetailDialog";
import NovaLiderancaDialog from "@/components/liderancas/NovaLiderancaDialog";
import { toast } from "sonner";

const CURRENT_ROLE: UserRole = "deputado";

const influenciaColors: Record<string, string> = {
  Alta: "bg-success/10 text-success border-success/20",
  Média: "bg-warning/10 text-warning border-warning/20",
  Baixa: "bg-muted text-muted-foreground",
};

export default function Liderancas() {
  const [notesOpen, setNotesOpen] = useState(false);
  const [selectedLider, setSelectedLider] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLider, setDetailLider] = useState<LiderancaComScore | null>(null);
  const [localData, setLocalData] = useState(initialData);
  const [novaOpen, setNovaOpen] = useState(false);

  const cidadesMap = useMemo(() => {
    const map = new Map<string, CidadeBase>();
    cidadesData.forEach((c) => map.set(c.name, c));
    return map;
  }, []);

  const liderancas = useMemo(
    () => localData
      .map((l) => calcularScoreLideranca(l, cidadesMap))
      .sort((a, b) => b.score - a.score),
    [cidadesMap, localData]
  );

  const showScore = canViewScore(CURRENT_ROLE);

  const openNotes = (e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    setSelectedLider(name);
    setNotesOpen(true);
  };

  const openDetail = (l: LiderancaComScore) => {
    setDetailLider(l);
    setDetailOpen(true);
  };

  const handleSave = (original: LiderancaComScore, updated: Partial<LiderancaComScore>) => {
    setLocalData((prev) =>
      prev.map((l) =>
        l.name === original.name
          ? { ...l, ...updated, img: updated.name ? updated.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() : l.img }
          : l
      )
    );
    // Update detail reference
    setDetailLider((prev) => prev ? { ...prev, ...updated } : prev);
    toast.success("Liderança atualizada");
  };

  const handleDelete = (name: string) => {
    setLocalData((prev) => prev.filter((l) => l.name !== name));
    toast.success("Liderança excluída");
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

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {liderancas.map((l) => (
          <Card
            key={l.name}
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => openDetail(l)}
          >
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <Avatar className="h-12 w-12 border border-primary/20 shrink-0">
                  {l.avatar_url && <AvatarImage src={l.avatar_url} className="object-cover" />}
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">{l.img}</AvatarFallback>
                </Avatar>
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

      <LiderancaNotesDialog
        open={notesOpen}
        onOpenChange={setNotesOpen}
        liderancaName={selectedLider}
      />

      <LiderancaDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        lideranca={detailLider}
        onSave={handleSave}
        onDelete={handleDelete}
        showScore={showScore}
      />

      <NovaLiderancaDialog
        open={novaOpen}
        onOpenChange={setNovaOpen}
        onAdd={(l) => {
          setLocalData((prev) => [...prev, l]);
          toast.success("Liderança cadastrada");
        }}
      />
    </div>
  );
}
