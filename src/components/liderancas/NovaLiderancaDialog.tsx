import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cidadesData } from "@/lib/mock-data";
import type { LiderancaBase, AtuacaoCidade } from "@/lib/scoring";
import { Badge } from "@/components/ui/badge";
import { Plus, X } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (l: LiderancaBase) => void;
}

export default function NovaLiderancaDialog({ open, onOpenChange, onAdd }: Props) {
  const [name, setName] = useState("");
  const [cargo, setCargo] = useState("");
  const [cidadePrincipal, setCidadePrincipal] = useState("");
  const [influencia, setInfluencia] = useState<"Alta" | "Média" | "Baixa">("Média");
  const [tipo, setTipo] = useState<"Eleitoral" | "Comunitária" | "Política">("Comunitária");
  const [atuacao, setAtuacao] = useState<AtuacaoCidade[]>([]);
  const [novaCidade, setNovaCidade] = useState("");
  const [novaIntensidade, setNovaIntensidade] = useState<"Alta" | "Média" | "Baixa">("Média");

  const cidadeOptions = cidadesData.map((c) => c.name);

  const reset = () => {
    setName(""); setCargo(""); setCidadePrincipal(""); setInfluencia("Média");
    setTipo("Comunitária"); setAtuacao([]); setNovaCidade(""); setNovaIntensidade("Média");
  };

  const addCidade = () => {
    if (!novaCidade || atuacao.some((a) => a.cidadeNome === novaCidade)) return;
    setAtuacao([...atuacao, { cidadeNome: novaCidade, intensidade: novaIntensidade }]);
    setNovaCidade("");
  };

  const removeCidade = (nome: string) => {
    setAtuacao(atuacao.filter((a) => a.cidadeNome !== nome));
  };

  const handleSubmit = () => {
    if (!name.trim() || !cargo.trim() || !cidadePrincipal.trim()) return;
    const img = name.trim().split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
    onAdd({
      name: name.trim(),
      img,
      cargo: cargo.trim(),
      cidadePrincipal: cidadePrincipal.trim(),
      influencia,
      tipo,
      engajamento: 50,
      atuacao: atuacao.length > 0 ? atuacao : [{ cidadeNome: cidadePrincipal.trim(), intensidade: "Alta" }],
    });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Liderança</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs">Nome completo *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: João da Silva" />
          </div>
          <div>
            <Label className="text-xs">Cargo *</Label>
            <Input value={cargo} onChange={(e) => setCargo(e.target.value)} placeholder="Ex: Presidente da Associação" />
          </div>
          <div>
            <Label className="text-xs">Cidade principal *</Label>
            <Select value={cidadePrincipal} onValueChange={setCidadePrincipal}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {cidadeOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
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

          {/* Cidades de atuação */}
          <div>
            <Label className="text-xs">Cidades de atuação</Label>
            <div className="flex items-center gap-2 mt-1">
              <Select value={novaCidade} onValueChange={setNovaCidade}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Cidade" /></SelectTrigger>
                <SelectContent>
                  {cidadeOptions.filter((c) => !atuacao.some((a) => a.cidadeNome === c)).map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={novaIntensidade} onValueChange={(v) => setNovaIntensidade(v as any)}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Alta">Alta</SelectItem>
                  <SelectItem value="Média">Média</SelectItem>
                  <SelectItem value="Baixa">Baixa</SelectItem>
                </SelectContent>
              </Select>
              <Button size="icon" variant="outline" className="shrink-0" onClick={addCidade} disabled={!novaCidade}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {atuacao.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {atuacao.map((a) => (
                  <Badge key={a.cidadeNome} variant="secondary" className="text-xs gap-1">
                    {a.cidadeNome} ({a.intensidade})
                    <button onClick={() => removeCidade(a.cidadeNome)} className="ml-1 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 pt-2 border-t">
            <Button onClick={handleSubmit} disabled={!name.trim() || !cargo.trim() || !cidadePrincipal}>
              Cadastrar
            </Button>
            <Button variant="ghost" onClick={() => { reset(); onOpenChange(false); }}>Cancelar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
