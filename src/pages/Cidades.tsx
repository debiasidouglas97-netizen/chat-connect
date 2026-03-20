import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MapPin, Users, FileText, Landmark, Flame, AlertTriangle, Snowflake, Plus, Pencil, Trash2 } from "lucide-react";
import { cidadesData as initialCidades } from "@/lib/mock-data";
import { calcularScoreCidade, canViewScore, type UserRole, type CidadeBase } from "@/lib/scoring";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const CURRENT_ROLE: UserRole = "deputado";

const statusConfig = {
  alta: { icon: Flame, label: "Alta", className: "bg-success/10 text-success border-success/20" },
  atencao: { icon: AlertTriangle, label: "Atenção", className: "bg-warning/10 text-warning border-warning/20" },
  baixa: { icon: Snowflake, label: "Baixa", className: "bg-info/10 text-info border-info/20" },
};

const REGIOES = ["Baixada Santista", "Região de Bauru", "Interior de SP", "Grande São Paulo", "Litoral Norte"];

function CidadeFormDialog({ open, onOpenChange, onSave, initial }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  onSave: (c: CidadeBase) => void; initial?: CidadeBase;
}) {
  const [name, setName] = useState(initial?.name || "");
  const [population, setPopulation] = useState(initial?.population || "");
  const [peso, setPeso] = useState(initial?.peso?.toString() || "5");
  const [regiao, setRegiao] = useState(initial?.regiao || REGIOES[0]);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      name: name.trim(), population: population.trim(), peso: Number(peso) || 5, regiao,
      demandas: initial?.demandas || 0, demandasResolvidas: initial?.demandasResolvidas || 0,
      comunicacaoRecente: initial?.comunicacaoRecente || false, presencaDeputado: initial?.presencaDeputado || false,
      engajamento: initial?.engajamento || 0, liderancas: initial?.liderancas || 0, emendas: initial?.emendas || 0,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{initial ? "Editar Cidade" : "Nova Cidade"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label className="text-xs">Nome *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da cidade" /></div>
          <div><Label className="text-xs">População</Label><Input value={population} onChange={(e) => setPopulation(e.target.value)} placeholder="Ex: 433.311" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Peso estratégico (1-10)</Label><Input type="number" min={1} max={10} value={peso} onChange={(e) => setPeso(e.target.value)} /></div>
            <div>
              <Label className="text-xs">Região</Label>
              <select value={regiao} onChange={(e) => setRegiao(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {REGIOES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2 pt-2 border-t">
            <Button onClick={handleSave} disabled={!name.trim()}>Salvar</Button>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Cidades() {
  const [localCidades, setLocalCidades] = useState(initialCidades);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCity, setEditingCity] = useState<CidadeBase | undefined>();
  const [deleteCity, setDeleteCity] = useState<string | null>(null);

  const cidades = useMemo(
    () => localCidades.map(calcularScoreCidade).sort((a, b) => b.score - a.score),
    [localCidades]
  );
  const showScore = canViewScore(CURRENT_ROLE);

  const handleSave = (c: CidadeBase) => {
    if (editingCity) {
      setLocalCidades((prev) => prev.map((p) => p.name === editingCity.name ? c : p));
      toast.success("Cidade atualizada");
    } else {
      setLocalCidades((prev) => [...prev, c]);
      toast.success("Cidade cadastrada");
    }
    setEditingCity(undefined);
  };

  const handleDelete = () => {
    if (!deleteCity) return;
    setLocalCidades((prev) => prev.filter((c) => c.name !== deleteCity));
    setDeleteCity(null);
    toast.success("Cidade excluída");
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestão de Cidades</h1>
          <p className="text-sm text-muted-foreground">Monitoramento territorial — Baixada Santista e Região de Bauru</p>
        </div>
        <Button className="gap-2" onClick={() => { setEditingCity(undefined); setFormOpen(true); }}>
          <Plus className="h-4 w-4" /> Nova Cidade
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {cidades.map((c) => {
          const cfg = statusConfig[c.status];
          return (
            <Card key={c.name} className="hover:shadow-md transition-shadow">
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
                  <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-destructive hover:text-destructive" onClick={() => setDeleteCity(c.name)}>
                    <Trash2 className="h-3 w-3" /> Excluir
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <CidadeFormDialog open={formOpen} onOpenChange={setFormOpen} onSave={handleSave} initial={editingCity} />

      <AlertDialog open={!!deleteCity} onOpenChange={() => setDeleteCity(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cidade</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir <strong>{deleteCity}</strong>?</AlertDialogDescription>
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
