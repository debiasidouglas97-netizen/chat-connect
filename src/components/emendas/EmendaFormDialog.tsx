import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Upload, X, FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { EmendaRow, EmendaAttachment } from "@/hooks/use-emendas";
import { useEmendaAttachments } from "@/hooks/use-emendas";

const TIPOS = ["Saúde", "Educação", "Infraestrutura", "Assistência Social", "Segurança", "Cultura", "Esporte", "Outros"];
const STATUSES = ["Proposta", "Aprovada", "Liberada", "Em execução", "Paga"];
const PRIORIDADES = ["Alta", "Média", "Baixa"];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (e: Omit<EmendaRow, "id" | "created_at" | "updated_at">) => Promise<any>;
  initial?: EmendaRow;
  cidadeOptions: string[];
  liderancaOptions: string[];
}

function formatCurrency(value: string): string {
  const nums = value.replace(/\D/g, "");
  if (!nums) return "";
  const n = parseInt(nums, 10) / 100;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function EmendaFormDialog({ open, onOpenChange, onSave, initial, cidadeOptions, liderancaOptions }: Props) {
  const [cidade, setCidade] = useState("");
  const [valor, setValor] = useState("");
  const [status, setStatus] = useState("Proposta");
  const [tipo, setTipo] = useState("Saúde");
  const [ano, setAno] = useState(new Date().getFullYear().toString());
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [objetivoPolitico, setObjetivoPolitico] = useState("");
  const [prioridade, setPrioridade] = useState("Média");
  const [regiao, setRegiao] = useState("");
  const [liderancas, setLiderancas] = useState<string[]>([]);
  const [notas, setNotas] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  const { attachments, upload, removeAttachment } = useEmendaAttachments(initial?.id || null);

  useEffect(() => {
    if (open) {
      setCidade(initial?.cidade || "");
      setValor(initial?.valor || "");
      setStatus(initial?.status || "Proposta");
      setTipo(initial?.tipo || "Saúde");
      setAno(initial?.ano?.toString() || new Date().getFullYear().toString());
      setTitulo(initial?.titulo || "");
      setDescricao(initial?.descricao || "");
      setObjetivoPolitico(initial?.objetivo_politico || "");
      setPrioridade(initial?.prioridade || "Média");
      setRegiao(initial?.regiao || "");
      setLiderancas(initial?.liderancas_relacionadas || []);
      setNotas(initial?.notas || "");
      setPendingFiles([]);
    }
  }, [open, initial]);

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files).filter(f => f.size <= 20 * 1024 * 1024);
    if (arr.length + pendingFiles.length + attachments.length > 20) {
      toast.error("Máximo de 20 arquivos");
      return;
    }
    setPendingFiles(prev => [...prev, ...arr]);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleFileSelect(e.dataTransfer.files);
  }, [pendingFiles, attachments]);

  const handleSave = async () => {
    if (!cidade || !valor.trim()) return;
    setSaving(true);
    try {
      const result = await onSave({
        cidade, valor: valor.trim(), status, tipo, ano: Number(ano) as any,
        titulo: titulo || null, descricao: descricao || null,
        objetivo_politico: objetivoPolitico || null,
        prioridade, regiao: regiao || null,
        liderancas_relacionadas: liderancas, notas: notas || null,
      });

      // Upload pending files
      const emendaId = initial?.id || (result as any)?.id;
      if (emendaId && pendingFiles.length > 0) {
        for (const file of pendingFiles) {
          try {
            await upload({ file, emendaId });
          } catch {
            toast.error(`Erro ao enviar: ${file.name}`);
          }
        }
      }

      onOpenChange(false);
    } catch {
      toast.error("Erro ao salvar emenda");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAttachment = async (att: EmendaAttachment) => {
    try {
      await removeAttachment(att);
      toast.success("Arquivo removido");
    } catch {
      toast.error("Erro ao remover arquivo");
    }
  };

  const getFileUrl = (path: string) => {
    const { data } = supabase.storage.from("emenda-attachments").getPublicUrl(path);
    return data.publicUrl;
  };

  const toggleLideranca = (name: string) => {
    setLiderancas(prev => prev.includes(name) ? prev.filter(l => l !== name) : [...prev, name]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar Emenda" : "Nova Emenda Parlamentar"}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="dados" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dados">Dados</TabsTrigger>
            <TabsTrigger value="estrategia">Estratégia</TabsTrigger>
            <TabsTrigger value="vinculos">Vínculos</TabsTrigger>
            <TabsTrigger value="anexos">Anexos</TabsTrigger>
          </TabsList>

          <TabsContent value="dados" className="space-y-3 mt-3">
            <div>
              <Label className="text-xs">Título da emenda</Label>
              <Input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ex: Investimento em saúde pública – Guarujá" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Cidade *</Label>
                <Select value={cidade} onValueChange={setCidade}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {cidadeOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Tipo *</Label>
                <Select value={tipo} onValueChange={setTipo}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Valor *</Label>
                <Input value={valor} onChange={e => setValor(formatCurrency(e.target.value))} placeholder="R$ 0,00" />
              </div>
              <div>
                <Label className="text-xs">Ano *</Label>
                <Input type="number" value={ano} onChange={e => setAno(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Descrição detalhada</Label>
              <Textarea value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Objetivo, impacto e benefícios da emenda..." rows={3} />
            </div>
          </TabsContent>

          <TabsContent value="estrategia" className="space-y-3 mt-3">
            <div>
              <Label className="text-xs">Prioridade política</Label>
              <Select value={prioridade} onValueChange={setPrioridade}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORIDADES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Objetivo político (interno)</Label>
              <Textarea value={objetivoPolitico} onChange={e => setObjetivoPolitico(e.target.value)} placeholder="Ex: Fortalecer base, reforço eleitoral..." rows={2} />
            </div>
            <div>
              <Label className="text-xs">Região de atuação</Label>
              <Input value={regiao} onChange={e => setRegiao(e.target.value)} placeholder="Ex: Baixada Santista" />
            </div>
            <div>
              <Label className="text-xs">Observações internas</Label>
              <Textarea value={notas} onChange={e => setNotas(e.target.value)} placeholder="Anotações, pendências, alinhamentos..." rows={3} />
            </div>
          </TabsContent>

          <TabsContent value="vinculos" className="space-y-3 mt-3">
            <div>
              <Label className="text-xs mb-2 block">Lideranças relacionadas</Label>
              <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto border rounded-md p-2">
                {liderancaOptions.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma liderança cadastrada</p>}
                {liderancaOptions.map(name => (
                  <Badge
                    key={name}
                    variant={liderancas.includes(name) ? "default" : "outline"}
                    className="cursor-pointer text-xs"
                    onClick={() => toggleLideranca(name)}
                  >
                    {name}
                  </Badge>
                ))}
              </div>
              {liderancas.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">{liderancas.length} selecionada(s)</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="anexos" className="space-y-3 mt-3">
            <div
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => document.getElementById("emenda-file-input")?.click()}
            >
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Arraste arquivos ou clique para selecionar</p>
              <p className="text-xs text-muted-foreground mt-1">PDF, DOC, JPG, PNG • Máx. 20MB por arquivo</p>
              <input
                id="emenda-file-input"
                type="file"
                multiple
                className="hidden"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={e => handleFileSelect(e.target.files)}
              />
            </div>

            {pendingFiles.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Novos arquivos:</p>
                {pendingFiles.map((f, i) => (
                  <div key={i} className="flex items-center justify-between bg-muted/50 rounded px-2 py-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 shrink-0 text-primary" />
                      <span className="text-xs truncate">{f.name}</span>
                      <span className="text-xs text-muted-foreground">({(f.size / 1024).toFixed(0)} KB)</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setPendingFiles(prev => prev.filter((_, j) => j !== i))}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {attachments.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Arquivos salvos:</p>
                {attachments.map(att => (
                  <div key={att.id} className="flex items-center justify-between bg-muted/50 rounded px-2 py-1">
                    <a href={getFileUrl(att.storage_path)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 min-w-0 hover:underline">
                      <FileText className="h-4 w-4 shrink-0 text-primary" />
                      <span className="text-xs truncate">{att.file_name}</span>
                    </a>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDeleteAttachment(att)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex gap-2 pt-3 border-t">
          <Button onClick={handleSave} disabled={!cidade || !valor.trim() || saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
