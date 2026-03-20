import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Pencil, MapPin, Star, X, Plus } from "lucide-react";
import type { LiderancaComScore } from "@/lib/scoring";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const influenciaColors: Record<string, string> = {
  Alta: "bg-success/10 text-success border-success/20",
  Média: "bg-warning/10 text-warning border-warning/20",
  Baixa: "bg-muted text-muted-foreground",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lideranca: LiderancaComScore | null;
  onSave: (original: LiderancaComScore, updated: Partial<LiderancaComScore>) => void;
  onDelete: (name: string) => void;
  showScore: boolean;
}

export default function LiderancaDetailDialog({ open, onOpenChange, lideranca, onSave, onDelete, showScore }: Props) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Edit state
  const [name, setName] = useState("");
  const [cargo, setCargo] = useState("");
  const [cidadePrincipal, setCidadePrincipal] = useState("");
  const [influencia, setInfluencia] = useState<"Alta" | "Média" | "Baixa">("Média");
  const [tipo, setTipo] = useState<"Eleitoral" | "Comunitária" | "Política">("Comunitária");

  const startEdit = () => {
    if (!lideranca) return;
    setName(lideranca.name);
    setCargo(lideranca.cargo);
    setCidadePrincipal(lideranca.cidadePrincipal);
    setInfluencia(lideranca.influencia);
    setTipo(lideranca.tipo);
    setEditing(true);
  };

  const handleSave = () => {
    if (!lideranca) return;
    onSave(lideranca, { name, cargo, cidadePrincipal, influencia, tipo });
    setEditing(false);
  };

  const handleDelete = () => {
    if (!lideranca) return;
    onDelete(lideranca.name);
    setConfirmDelete(false);
    onOpenChange(false);
  };

  if (!lideranca) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setEditing(false); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-primary">{lideranca.img}</span>
              </div>
              {editing ? (
                <Input value={name} onChange={(e) => setName(e.target.value)} className="text-lg font-semibold" />
              ) : (
                <span>{lideranca.name}</span>
              )}
            </DialogTitle>
          </DialogHeader>

          {!editing ? (
            /* ── View mode ── */
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Cargo</p>
                  <p className="font-medium">{lideranca.cargo}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Cidade principal</p>
                  <p className="font-medium flex items-center gap-1"><MapPin className="h-3 w-3" />{lideranca.cidadePrincipal}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Tipo</p>
                  <p className="font-medium">{lideranca.tipo}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Influência</p>
                  <Badge variant="outline" className={`text-xs ${influenciaColors[lideranca.influencia]}`}>
                    <Star className="h-3 w-3 mr-1" /> {lideranca.influencia}
                  </Badge>
                </div>
                {showScore && (
                  <>
                    <div>
                      <p className="text-muted-foreground text-xs">Score</p>
                      <p className="text-xl font-bold">{lideranca.score}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Classificação</p>
                      <p className="font-medium">{lideranca.classificacao.icon} {lideranca.classificacao.label}</p>
                    </div>
                  </>
                )}
              </div>

              {/* Cidades de atuação */}
              <div>
                <p className="text-muted-foreground text-xs mb-2">Cidades de atuação</p>
                <div className="flex flex-wrap gap-1.5">
                  {lideranca.atuacao.map((a) => (
                    <Badge key={a.cidadeNome} variant="secondary" className="text-xs">
                      <MapPin className="h-3 w-3 mr-1" /> {a.cidadeNome} ({a.intensidade})
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t">
                <Button size="sm" variant="outline" className="gap-1" onClick={startEdit}>
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </Button>
                <Button size="sm" variant="destructive" className="gap-1" onClick={() => setConfirmDelete(true)}>
                  <Trash2 className="h-3.5 w-3.5" /> Excluir
                </Button>
              </div>
            </div>
          ) : (
            /* ── Edit mode ── */
            <div className="space-y-4">
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Cargo</Label>
                  <Input value={cargo} onChange={(e) => setCargo(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Cidade principal</Label>
                  <Input value={cidadePrincipal} onChange={(e) => setCidadePrincipal(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Influência</Label>
                    <Select value={influencia} onValueChange={(v) => setInfluencia(v as any)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Alta">Alta</SelectItem>
                        <SelectItem value="Média">Média</SelectItem>
                        <SelectItem value="Baixa">Baixa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Tipo</Label>
                    <Select value={tipo} onValueChange={(v) => setTipo(v as any)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Eleitoral">Eleitoral</SelectItem>
                        <SelectItem value="Comunitária">Comunitária</SelectItem>
                        <SelectItem value="Política">Política</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2 border-t">
                <Button size="sm" onClick={handleSave}>Salvar</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir liderança</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{lideranca.name}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
