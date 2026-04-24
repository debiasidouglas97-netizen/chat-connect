import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useCidades } from "@/hooks/use-cidades";
import { useLiderancas } from "@/hooks/use-liderancas";
import { useEleitores, type EleitorInput, type EleitorRow } from "@/hooks/use-eleitores";
import { usePermissions } from "@/hooks/use-permissions";
import { toast } from "sonner";
import { Loader2, Search, Check, ChevronsUpDown, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing?: EleitorRow | null;
}

function maskPhoneBR(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function maskCep(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export default function NovoEleitorDialog({ open, onOpenChange, editing }: Props) {
  const { cidades } = useCidades();
  const { liderancas } = useLiderancas();
  const { insert, update } = useEleitores();
  const { isLideranca, linkedLiderancaId } = usePermissions();

  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [cidade, setCidade] = useState("");
  const [telegram, setTelegram] = useState("");
  const [email, setEmail] = useState("");
  const [cep, setCep] = useState("");
  const [logradouro, setLogradouro] = useState("");
  const [numero, setNumero] = useState("");
  const [bairro, setBairro] = useState("");
  const [estado, setEstado] = useState("");
  const [liderancaId, setLiderancaId] = useState<string>("__none__");
  const [observacoes, setObservacoes] = useState("");
  const [loadingCep, setLoadingCep] = useState(false);
  const [saving, setSaving] = useState(false);
  const [liderancaOpen, setLiderancaOpen] = useState(false);

  // Se o usuário logado é uma liderança, restringe a lista apenas a ele mesmo
  const liderancasDisponiveis = isLideranca && linkedLiderancaId
    ? (liderancas as any[]).filter((l) => l.id === linkedLiderancaId)
    : (liderancas as any[]);

  const liderancasOrdenadas = [...liderancasDisponiveis].sort((a, b) =>
    (a.name || "").localeCompare(b.name || "", "pt-BR", { sensitivity: "base" })
  );
  const liderancaSelecionada = liderancasOrdenadas.find((l) => l.id === liderancaId);
  const liderancaLocked = isLideranca && !!linkedLiderancaId;

  useEffect(() => {
    if (open && editing) {
      setNome(editing.nome);
      setWhatsapp(editing.whatsapp);
      setCidade(editing.cidade);
      setTelegram(editing.telegram || "");
      setEmail(editing.email || "");
      setCep(editing.cep || "");
      setLogradouro(editing.logradouro || "");
      setNumero(editing.numero || "");
      setBairro(editing.bairro || "");
      setEstado(editing.estado || "");
      setLiderancaId(editing.lideranca_id || (liderancaLocked ? linkedLiderancaId! : "__none__"));
      setObservacoes(editing.observacoes || "");
    } else if (open && !editing) {
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing, liderancaLocked, linkedLiderancaId]);

  const reset = () => {
    setNome(""); setWhatsapp(""); setCidade(""); setTelegram(""); setEmail("");
    setCep(""); setLogradouro(""); setNumero(""); setBairro(""); setEstado("");
    setLiderancaId(liderancaLocked && linkedLiderancaId ? linkedLiderancaId : "__none__");
    setObservacoes("");
  };

  const buscarCep = async () => {
    const onlyDigits = cep.replace(/\D/g, "");
    if (onlyDigits.length !== 8) {
      toast.error("CEP inválido");
      return;
    }
    setLoadingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${onlyDigits}/json/`);
      const data = await res.json();
      if (data.erro) {
        toast.error("CEP não encontrado");
        return;
      }
      setLogradouro(data.logradouro || "");
      setBairro(data.bairro || "");
      setEstado(data.uf || "");
      if (!cidade && data.localidade) setCidade(data.localidade);
      toast.success("Endereço preenchido");
    } catch {
      toast.error("Erro ao buscar CEP");
    } finally {
      setLoadingCep(false);
    }
  };

  const handleSubmit = async () => {
    if (!nome.trim()) return toast.error("Nome é obrigatório");
    if (!whatsapp.trim() || whatsapp.replace(/\D/g, "").length < 10) return toast.error("WhatsApp inválido");
    if (!cidade.trim()) return toast.error("Cidade é obrigatória");

    const payload: EleitorInput = {
      nome: nome.trim(),
      whatsapp: whatsapp.trim(),
      cidade: cidade.trim(),
      telegram: telegram.trim() || null,
      email: email.trim() || null,
      cep: cep.trim() || null,
      logradouro: logradouro.trim() || null,
      numero: numero.trim() || null,
      bairro: bairro.trim() || null,
      estado: estado.trim() || null,
      lideranca_id: liderancaId === "__none__" ? null : liderancaId,
      observacoes: observacoes.trim() || null,
    };

    setSaving(true);
    try {
      if (editing) {
        await update({ id: editing.id, data: payload });
        toast.success("Eleitor atualizado");
      } else {
        await insert(payload);
        toast.success("Eleitor cadastrado");
      }
      onOpenChange(false);
      reset();
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar Eleitor" : "Novo Eleitor"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs">Nome completo *</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Maria Silva" />
            </div>
            <div>
              <Label className="text-xs">WhatsApp *</Label>
              <Input value={whatsapp} onChange={(e) => setWhatsapp(maskPhoneBR(e.target.value))} placeholder="(11) 99999-9999" />
            </div>
            <div>
              <Label className="text-xs">Cidade *</Label>
              <Select value={cidade} onValueChange={setCidade}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {cidades.map((c) => (
                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Telegram</Label>
              <Input value={telegram} onChange={(e) => setTelegram(e.target.value)} placeholder="@usuario" />
            </div>
            <div>
              <Label className="text-xs">E-mail</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" />
            </div>
          </div>

          <p className="text-xs font-medium text-muted-foreground pt-2">Vínculo político</p>
          <div>
            <Label className="text-xs">Vinculado à Liderança</Label>
            {liderancaLocked ? (
              <>
                <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-muted/40">
                  <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-sm truncate">
                    {liderancaSelecionada
                      ? `${liderancaSelecionada.name} · ${liderancaSelecionada.cargo} · ${liderancaSelecionada.cidadePrincipal}`
                      : "Sua liderança"}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Este eleitor será automaticamente vinculado à sua conta de liderança.
                </p>
              </>
            ) : (
              <>
                <Popover open={liderancaOpen} onOpenChange={setLiderancaOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={liderancaOpen}
                      className="w-full justify-between font-normal"
                    >
                      <span className={cn("truncate", liderancaId === "__none__" && "text-muted-foreground")}>
                        {liderancaId === "__none__"
                          ? "Selecione uma liderança (opcional)"
                          : liderancaSelecionada
                            ? `${liderancaSelecionada.name} · ${liderancaSelecionada.cargo} · ${liderancaSelecionada.cidadePrincipal}`
                            : "Selecione uma liderança (opcional)"}
                      </span>
                      <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command
                      filter={(value, search) => {
                        if (value.toLowerCase().includes(search.toLowerCase())) return 1;
                        return 0;
                      }}
                    >
                      <CommandInput placeholder="Buscar liderança..." className="h-9" />
                      <CommandList>
                        <CommandEmpty>Nenhuma liderança encontrada.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="— Sem vínculo —"
                            onSelect={() => { setLiderancaId("__none__"); setLiderancaOpen(false); }}
                          >
                            <Check className={cn("mr-2 h-3.5 w-3.5", liderancaId === "__none__" ? "opacity-100" : "opacity-0")} />
                            — Sem vínculo —
                          </CommandItem>
                          {liderancasOrdenadas.map((l: any) => {
                            const label = `${l.name} · ${l.cargo} · ${l.cidadePrincipal}`;
                            return (
                              <CommandItem
                                key={l.id}
                                value={label}
                                onSelect={() => { setLiderancaId(l.id); setLiderancaOpen(false); }}
                              >
                                <Check className={cn("mr-2 h-3.5 w-3.5", liderancaId === l.id ? "opacity-100" : "opacity-0")} />
                                {label}
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Eleitor cadastrado contará para a meta operacional desta liderança.
                </p>
              </>
            )}
          </div>

          <p className="text-xs font-medium text-muted-foreground pt-2">Endereço</p>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Label className="text-xs">CEP</Label>
              <Input value={cep} onChange={(e) => setCep(maskCep(e.target.value))} placeholder="00000-000" />
            </div>
            <Button variant="outline" size="sm" onClick={buscarCep} disabled={loadingCep}>
              {loadingCep ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
              <span className="ml-1">Buscar</span>
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Label className="text-xs">Logradouro</Label>
              <Input value={logradouro} onChange={(e) => setLogradouro(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Número</Label>
              <Input value={numero} onChange={(e) => setNumero(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Bairro</Label>
              <Input value={bairro} onChange={(e) => setBairro(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Estado (UF)</Label>
              <Input value={estado} onChange={(e) => setEstado(e.target.value.toUpperCase().slice(0, 2))} maxLength={2} />
            </div>
          </div>

          <div>
            <Label className="text-xs">Observações</Label>
            <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Notas internas..." rows={3} />
          </div>

          <div className="flex items-center gap-2 pt-2 border-t">
            <Button onClick={handleSubmit} disabled={saving}>
              {saving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              {editing ? "Salvar" : "Cadastrar"}
            </Button>
            <Button variant="ghost" onClick={() => { reset(); onOpenChange(false); }}>Cancelar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
