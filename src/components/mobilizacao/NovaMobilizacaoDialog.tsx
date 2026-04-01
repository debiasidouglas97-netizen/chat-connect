import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Send, Clock, X, Search } from "lucide-react";
import { useMobilizacoes } from "@/hooks/use-mobilizacoes";
import { useLiderancas } from "@/hooks/use-liderancas";
import { useCidades } from "@/hooks/use-cidades";
import { useAuth } from "@/hooks/use-auth";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const TIPOS = [
  { value: "post", label: "Post Instagram" },
  { value: "video", label: "Vídeo" },
  { value: "evento", label: "Evento" },
  { value: "campanha", label: "Campanha" },
  { value: "outro", label: "Outro" },
];

const SEGMENTACAO = [
  { value: "todas", label: "Todas lideranças" },
  { value: "cidade", label: "Por cidade" },
  { value: "tipo", label: "Por tipo de liderança" },
  { value: "manual", label: "Seleção manual" },
];

const TIPOS_LIDERANCA = ["Comunitária", "Política", "Religiosa", "Sindical", "Empresarial", "Acadêmica"];

export function NovaMobilizacaoDialog({ open, onOpenChange }: Props) {
  const { createMobilizacao, tenantId } = useMobilizacoes();
  const { liderancas } = useLiderancas();
  const { cidades } = useCidades();
  const { profile } = useAuth();

  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState("post");
  const [link, setLink] = useState("");
  const [mensagem, setMensagem] = useState(
    "🚀 Olá!\n\nO deputado publicou um novo conteúdo importante.\n\n👉 Assista, curta e compartilhe:\n{link}\n\nSua participação é fundamental 💪"
  );
  const [segTipo, setSegTipo] = useState("todas");
  const [segValor, setSegValor] = useState<string[]>([]);
  const [envioTipo, setEnvioTipo] = useState<"agora" | "agendar">("agora");
  const [agendado, setAgendado] = useState("");
  const [searchCity, setSearchCity] = useState("");
  const [searchLider, setSearchLider] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const filteredCidades = useMemo(() =>
    (cidades || []).filter(c => c.name.toLowerCase().includes(searchCity.toLowerCase())),
    [cidades, searchCity]
  );

  const filteredLiderancas = useMemo(() =>
    (liderancas || []).filter(l => l.name.toLowerCase().includes(searchLider.toLowerCase())),
    [liderancas, searchLider]
  );

  const toggleSegValor = (val: string) => {
    setSegValor(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);
  };

  const handleSubmit = async () => {
    if (!titulo || !link || !tenantId) return;
    setSubmitting(true);
    try {
      await createMobilizacao.mutateAsync({
        tenant_id: tenantId,
        titulo,
        tipo,
        link,
        mensagem,
        segmentacao_tipo: segTipo,
        segmentacao_valor: segValor,
        status: envioTipo === "agora" ? "enviado" : "agendado",
        agendado_para: envioTipo === "agendar" ? agendado : null,
        criado_por: profile?.full_name || "Sistema",
        enviado_por: envioTipo === "agora" ? (profile?.full_name || "Sistema") : null,
      });

      if (envioTipo === "agora") {
        // Trigger edge function
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        await fetch(`https://${projectId}.supabase.co/functions/v1/mobilizacao-send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tenant_id: tenantId,
            titulo,
            tipo,
            link,
            mensagem,
            segmentacao_tipo: segTipo,
            segmentacao_valor: segValor,
            enviado_por: profile?.full_name || "Sistema",
          }),
        });
      }

      onOpenChange(false);
      resetForm();
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitulo(""); setLink(""); setTipo("post"); setSegTipo("todas"); setSegValor([]);
    setEnvioTipo("agora"); setAgendado("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Nova Mobilização</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Basic info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Título da Mobilização *</Label>
              <Input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ex: Compartilhar post sobre saúde" />
            </div>
            <div>
              <Label>Tipo de Conteúdo</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Link do Conteúdo *</Label>
              <Input value={link} onChange={e => setLink(e.target.value)} placeholder="https://instagram.com/p/..." />
            </div>
          </div>

          {/* Segmentation */}
          <div>
            <Label className="text-base font-semibold">Segmentação</Label>
            <RadioGroup value={segTipo} onValueChange={v => { setSegTipo(v); setSegValor([]); }} className="mt-2 space-y-2">
              {SEGMENTACAO.map(s => (
                <div key={s.value} className="flex items-center gap-2">
                  <RadioGroupItem value={s.value} id={`seg-${s.value}`} />
                  <Label htmlFor={`seg-${s.value}`} className="font-normal cursor-pointer">{s.label}</Label>
                </div>
              ))}
            </RadioGroup>

            {segTipo === "cidade" && (
              <div className="mt-3 space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Buscar cidade..." value={searchCity} onChange={e => setSearchCity(e.target.value)} />
                </div>
                <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                  {filteredCidades.slice(0, 20).map(c => (
                    <Badge
                      key={c.id}
                      variant={segValor.includes(c.name) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleSegValor(c.name)}
                    >
                      {c.name} {segValor.includes(c.name) && <X className="h-3 w-3 ml-1" />}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {segTipo === "tipo" && (
              <div className="mt-3 flex flex-wrap gap-1">
                {TIPOS_LIDERANCA.map(t => (
                  <Badge
                    key={t}
                    variant={segValor.includes(t) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleSegValor(t)}
                  >
                    {t} {segValor.includes(t) && <X className="h-3 w-3 ml-1" />}
                  </Badge>
                ))}
              </div>
            )}

            {segTipo === "manual" && (
              <div className="mt-3 space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Buscar liderança..." value={searchLider} onChange={e => setSearchLider(e.target.value)} />
                </div>
                <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                  {filteredLiderancas.slice(0, 30).map(l => (
                    <Badge
                      key={l.id}
                      variant={segValor.includes(l.name) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleSegValor(l.name)}
                    >
                      {l.name} {segValor.includes(l.name) && <X className="h-3 w-3 ml-1" />}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Message */}
          <div>
            <Label className="text-base font-semibold">Mensagem</Label>
            <p className="text-xs text-muted-foreground mb-1">
              Variáveis: {"{nome_lider}"}, {"{cidade}"}, {"{link}"}
            </p>
            <Textarea
              value={mensagem}
              onChange={e => setMensagem(e.target.value)}
              rows={6}
              className="font-mono text-sm"
            />
          </div>

          {/* Scheduling */}
          <div>
            <Label className="text-base font-semibold">Envio</Label>
            <RadioGroup value={envioTipo} onValueChange={v => setEnvioTipo(v as "agora" | "agendar")} className="mt-2 space-y-2">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="agora" id="envio-agora" />
                <Label htmlFor="envio-agora" className="font-normal cursor-pointer">Enviar agora</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="agendar" id="envio-agendar" />
                <Label htmlFor="envio-agendar" className="font-normal cursor-pointer">Agendar</Label>
              </div>
            </RadioGroup>
            {envioTipo === "agendar" && (
              <Input type="datetime-local" className="mt-2 w-64" value={agendado} onChange={e => setAgendado(e.target.value)} />
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button
              onClick={handleSubmit}
              disabled={!titulo || !link || submitting}
              className="gap-2"
            >
              {envioTipo === "agora" ? <Send className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
              {envioTipo === "agora" ? "Enviar Agora" : "Agendar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
