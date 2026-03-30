import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, Sparkles, Send, RefreshCw, Smartphone } from "lucide-react";
import { useLiderancas } from "@/hooks/use-liderancas";
import { useCidades } from "@/hooks/use-cidades";
import { useTenant } from "@/hooks/use-tenant";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { EventoRow } from "@/hooks/use-eventos";

const TIPOS = ["Reunião", "Evento público", "Visita", "Entrega de emenda", "Audiência"];
const PRIORIDADES = ["Alta", "Média", "Baixa"];
const IMPACTOS = ["Alto", "Médio", "Baixo"];
const STATUS_OPTIONS = ["Confirmado", "Pendente", "Cancelado"];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (data: any) => Promise<void>;
  initialDate?: string;
  evento?: EventoRow | null;
}

export default function NovoEventoDialog({ open, onOpenChange, onSave, initialDate, evento }: Props) {
  const { liderancas } = useLiderancas();
  const { cidades } = useCidades();
  const { toast } = useToast();

  const [titulo, setTitulo] = useState("");
  const [description, setDescription] = useState("");
  const [tipo, setTipo] = useState("Reunião");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [cep, setCep] = useState("");
  const [endereco, setEndereco] = useState("");
  const [localNome, setLocalNome] = useState("");
  const [data, setData] = useState("");
  const [hora, setHora] = useState("09:00");
  const [horaFim, setHoraFim] = useState("");
  const [diaInteiro, setDiaInteiro] = useState(false);
  const [prioridade, setPrioridade] = useState("Média");
  const [impacto, setImpacto] = useState("Médio");
  const [status, setStatus] = useState("Confirmado");
  const [selectedLiderancas, setSelectedLiderancas] = useState<string[]>([]);
  const [secretario, setSecretario] = useState("");
  const [convidados, setConvidados] = useState("");
  const [notas, setNotas] = useState("");
  const [saving, setSaving] = useState(false);
  const [telegramText, setTelegramText] = useState("");
  const [telegramEstilo, setTelegramEstilo] = useState<"curto" | "detalhado" | "longo">("detalhado");
  const [generatingTelegram, setGeneratingTelegram] = useState(false);
  const [telegramApproved, setTelegramApproved] = useState(false);
  const [sendingTelegram, setSendingTelegram] = useState(false);

  useEffect(() => {
    if (open) {
      if (evento) {
        setTitulo(evento.titulo);
        setDescription(evento.description || "");
        setTipo(evento.tipo);
        setCidade(evento.cidade);
        setEstado(evento.estado || "");
        setCep(evento.cep || "");
        setEndereco(evento.endereco || "");
        setLocalNome(evento.local_nome || "");
        setData(evento.data);
        setHora(evento.hora);
        setHoraFim(evento.hora_fim || "");
        setDiaInteiro(evento.dia_inteiro);
        setPrioridade(evento.prioridade);
        setImpacto(evento.impacto_politico);
        setStatus(evento.status);
        setSelectedLiderancas(evento.participantes_liderancas || []);
        setSecretario(evento.secretario_responsavel || "");
        setConvidados(evento.convidados || "");
        setNotas(evento.notas || "");
      } else {
        setTitulo("");
        setDescription("");
        setTipo("Reunião");
        setCidade("");
        setEstado("");
        setCep("");
        setEndereco("");
        setLocalNome("");
        setData(initialDate || "");
        setHora("09:00");
        setHoraFim("");
        setDiaInteiro(false);
        setPrioridade("Média");
        setImpacto("Médio");
        setStatus("Confirmado");
        setSelectedLiderancas([]);
        setSecretario("");
        setConvidados("");
        setNotas("");
      }
    }
  }, [open, evento, initialDate]);

  // Auto-fill estado when cidade is selected
  useEffect(() => {
    if (cidade) {
      const c = cidades.find(c => c.name === cidade);
      if (c && c.regiao) setEstado(c.regiao);
    }
  }, [cidade, cidades]);

  // CEP lookup
  useEffect(() => {
    if (cep && cep.replace(/\D/g, "").length === 8) {
      fetch(`https://viacep.com.br/ws/${cep.replace(/\D/g, "")}/json/`)
        .then(r => r.json())
        .then(d => {
          if (!d.erro) {
            setEndereco(`${d.logradouro || ""}, ${d.bairro || ""}`);
            if (d.uf) setEstado(d.uf);
          }
        })
        .catch(() => {});
    }
  }, [cep]);

  const toggleLideranca = (name: string) => {
    setSelectedLiderancas(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  // Filter liderancas by selected city
  const filteredLiderancas = cidade
    ? liderancas.filter(l => l.cidade_principal === cidade)
    : liderancas;

  const handleSave = async () => {
    if (!titulo.trim() || !data || !cidade) {
      toast({ title: "Preencha título, data e cidade", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await onSave({
        ...(evento ? { id: evento.id } : {}),
        titulo: titulo.trim(),
        description: description.trim() || null,
        tipo,
        cidade,
        estado: estado || null,
        cep: cep || null,
        endereco: endereco || null,
        local_nome: localNome || null,
        data,
        hora: diaInteiro ? "00:00" : hora,
        hora_fim: diaInteiro ? null : (horaFim || null),
        dia_inteiro: diaInteiro,
        prioridade,
        impacto_politico: impacto,
        status,
        participantes_liderancas: selectedLiderancas,
        secretario_responsavel: secretario || null,
        convidados: convidados || null,
        notas: notas || null,
      });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Erro ao salvar evento", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>{evento ? "Editar Evento" : "Novo Evento"}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] px-6">
          <Tabs defaultValue="basico" className="w-full">
            <TabsList className="w-full grid grid-cols-4 mb-4">
              <TabsTrigger value="basico">Básico</TabsTrigger>
              <TabsTrigger value="local">Local</TabsTrigger>
              <TabsTrigger value="participantes">Participantes</TabsTrigger>
              <TabsTrigger value="telegram">Telegram</TabsTrigger>
            </TabsList>

            {/* TAB: Básico */}
            <TabsContent value="basico" className="space-y-4">
              <div>
                <Label>Título *</Label>
                <Input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ex: Visita à Santa Casa" />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Tipo</Label>
                  <Select value={tipo} onValueChange={setTipo}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Data *</Label>
                <Input type="date" value={data} onChange={e => setData(e.target.value)} />
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={diaInteiro} onCheckedChange={setDiaInteiro} />
                <Label>Dia inteiro</Label>
              </div>
              {!diaInteiro && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Hora início</Label>
                    <Input type="time" value={hora} onChange={e => setHora(e.target.value)} />
                  </div>
                  <div>
                    <Label>Hora fim</Label>
                    <Input type="time" value={horaFim} onChange={e => setHoraFim(e.target.value)} />
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Prioridade</Label>
                  <Select value={prioridade} onValueChange={setPrioridade}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRIORIDADES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Impacto Político</Label>
                  <Select value={impacto} onValueChange={setImpacto}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {IMPACTOS.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            {/* TAB: Local */}
            <TabsContent value="local" className="space-y-4">
              <div>
                <Label>Cidade *</Label>
                <Select value={cidade} onValueChange={setCidade}>
                  <SelectTrigger><SelectValue placeholder="Selecione a cidade" /></SelectTrigger>
                  <SelectContent>
                    {cidades.map(c => (
                      <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Estado</Label>
                  <Input value={estado} onChange={e => setEstado(e.target.value)} />
                </div>
                <div>
                  <Label>CEP</Label>
                  <Input value={cep} onChange={e => setCep(e.target.value)} placeholder="00000-000" />
                </div>
              </div>
              <div>
                <Label>Endereço</Label>
                <Input value={endereco} onChange={e => setEndereco(e.target.value)} />
              </div>
              <div>
                <Label>Local (ex: Hospital, Prefeitura)</Label>
                <Input value={localNome} onChange={e => setLocalNome(e.target.value)} />
              </div>
            </TabsContent>

            {/* TAB: Participantes */}
            <TabsContent value="participantes" className="space-y-4">
              <div>
                <Label>Lideranças participantes {cidade && `(${cidade})`}</Label>
                <div className="flex flex-wrap gap-1 mb-2">
                  {selectedLiderancas.map(name => (
                    <Badge key={name} variant="secondary" className="cursor-pointer" onClick={() => toggleLideranca(name)}>
                      {name} <X className="h-3 w-3 ml-1" />
                    </Badge>
                  ))}
                </div>
                <ScrollArea className="h-40 border rounded-md p-2">
                  {filteredLiderancas.map(l => (
                    <div
                      key={l.id}
                      className={`p-2 rounded cursor-pointer text-sm hover:bg-accent ${
                        selectedLiderancas.includes(l.name) ? "bg-primary/10 font-medium" : ""
                      }`}
                      onClick={() => toggleLideranca(l.name)}
                    >
                      {l.name} — {l.cidade_principal}
                    </div>
                  ))}
                  {filteredLiderancas.length === 0 && (
                    <p className="text-xs text-muted-foreground p-2">
                      {cidade ? "Nenhuma liderança nesta cidade" : "Selecione uma cidade primeiro"}
                    </p>
                  )}
                </ScrollArea>
              </div>
              <div>
                <Label>Secretário responsável</Label>
                <Input value={secretario} onChange={e => setSecretario(e.target.value)} />
              </div>
              <div>
                <Label>Convidados</Label>
                <Textarea value={convidados} onChange={e => setConvidados(e.target.value)} rows={2} placeholder="Nomes separados por vírgula" />
              </div>
            </TabsContent>

            {/* TAB: Telegram */}
            <TabsContent value="telegram" className="space-y-4">
              <div>
                <Label>Notas internas</Label>
                <Textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2} placeholder="Notas internas (não enviadas)" />
              </div>

              <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-primary" />
                    <Label className="text-sm font-semibold">Mensagem Telegram</Label>
                  </div>
                  <div className="flex gap-1">
                    {(["curto", "detalhado", "longo"] as const).map(est => (
                      <Button
                        key={est}
                        type="button"
                        variant={telegramEstilo === est ? "default" : "outline"}
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => setTelegramEstilo(est)}
                      >
                        {est === "curto" ? "Curto" : est === "detalhado" ? "Detalhado" : "Longo"}
                      </Button>
                    ))}
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={generatingTelegram || !titulo.trim()}
                  onClick={async () => {
                    setGeneratingTelegram(true);
                    setTelegramApproved(false);
                    try {
                      const [y, m, d] = (data || "").split("-");
                      const dataFormatada = data ? `${d}/${m}/${y}` : "A definir";
                      const { data: fnData, error } = await supabase.functions.invoke("generate-telegram-text", {
                        body: {
                          titulo, descricao: description, data: dataFormatada,
                          hora: diaInteiro ? "Dia inteiro" : hora,
                          hora_fim: horaFim || null, cidade, endereco, local_nome: localNome, tipo, estilo: telegramEstilo,
                        },
                      });
                      if (error) throw error;
                      if (fnData?.error) throw new Error(fnData.error);
                      setTelegramText(fnData.text || "");
                    } catch (e: any) {
                      toast({ title: "Erro ao gerar texto", description: e.message, variant: "destructive" });
                    } finally {
                      setGeneratingTelegram(false);
                    }
                  }}
                >
                  {generatingTelegram ? (
                    <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Gerando...</>
                  ) : (
                    <><Sparkles className="h-4 w-4 mr-2" /> Gerar texto com IA</>
                  )}
                </Button>

                {telegramText && (
                  <>
                    {/* Phone-style preview */}
                    <div className="flex justify-center">
                      <div className="w-[320px] rounded-2xl border-2 border-border bg-background shadow-lg overflow-hidden">
                        {/* Phone header */}
                        <div className="bg-[#0088cc] text-white px-4 py-2 flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">MG</div>
                          <div>
                            <div className="text-sm font-semibold">MandatoGov Bot</div>
                            <div className="text-[10px] opacity-80">online</div>
                          </div>
                        </div>
                        {/* Chat area */}
                        <div className="bg-[#e5ddd5] dark:bg-[#0b141a] p-3 min-h-[200px]">
                          <div className="bg-white dark:bg-[#1f2c34] rounded-lg p-3 shadow-sm max-w-[280px]">
                            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{telegramText}</p>
                            <div className="text-[10px] text-muted-foreground text-right mt-1">
                              {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Editable text */}
                    <div>
                      <Label className="text-xs text-muted-foreground">Edite o texto se necessário:</Label>
                      <Textarea
                        value={telegramText}
                        onChange={e => { setTelegramText(e.target.value); setTelegramApproved(false); }}
                        rows={5}
                        className="text-sm"
                      />
                    </div>

                    {/* Approve + Send */}
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant={telegramApproved ? "default" : "outline"}
                        className="flex-1"
                        onClick={() => setTelegramApproved(!telegramApproved)}
                      >
                        {telegramApproved ? "✅ Aprovado" : "Aprovar texto"}
                      </Button>
                      <Button
                        type="button"
                        disabled={!telegramApproved || sendingTelegram}
                        className="flex-1 bg-[#0088cc] hover:bg-[#0077b5] text-white"
                        onClick={async () => {
                          setSendingTelegram(true);
                          try {
                            const { data: fnData, error } = await supabase.functions.invoke("telegram-broadcast", {
                              body: {
                                text: telegramText,
                                cidade,
                                participantes_liderancas: selectedLiderancas,
                              },
                            });
                            if (error) throw error;
                            if (fnData?.error) throw new Error(fnData.error);
                            const sent = fnData?.sent || 0;
                            const total = fnData?.total || 0;
                            if (sent === 0) {
                              toast({ title: "Nenhum contato encontrado", description: fnData?.reason || `Nenhuma liderança com Telegram em ${cidade}`, variant: "destructive" });
                            } else {
                              toast({ title: `✅ Mensagem enviada!`, description: `Enviado para ${sent} de ${total} contatos` });
                            }
                          } catch (e: any) {
                            toast({ title: "Erro ao enviar", description: e.message, variant: "destructive" });
                          } finally {
                            setSendingTelegram(false);
                          }
                        }}
                      >
                        {sendingTelegram ? (
                          <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Enviando...</>
                        ) : (
                          <><Send className="h-4 w-4 mr-2" /> Enviar via Telegram</>
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </ScrollArea>

        <DialogFooter className="p-6 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : evento ? "Salvar" : "Criar Evento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
