import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useCidades } from "@/hooks/use-cidades";
import { useLiderancas } from "@/hooks/use-liderancas";
import { useEleitores, type EleitorInput, type EleitorRow } from "@/hooks/use-eleitores";
import { usePermissions } from "@/hooks/use-permissions";
import { useFormConfig } from "@/hooks/use-form-config";
import CustomFieldsBlock from "@/components/form-builder/CustomFieldsBlock";
import { colorDotForKey, badgeClassesForKey } from "@/lib/eleitor-colors";
import { toast } from "sonner";
import { Loader2, Search, Check, ChevronsUpDown, Lock, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { NATIVE_FIELDS_CATALOG } from "@/lib/form-config-defaults";

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

const QUICK_KEYS = new Set(["nome", "cidade", "whatsapp", "bairro"]);

const SELECT_OPTIONS: Record<string, string[]> = {
  intencao_voto: ["Apoia", "Não apoia", "Indeciso"],
  grau_apoio: ["Forte", "Médio", "Fraco"],
  prioridade: ["Alta", "Média", "Baixa"],
  canal_preferido: ["WhatsApp", "Telegram", "SMS"],
  faixa_etaria: ["16-24", "25-34", "35-44", "45-59", "60+"],
  genero: ["Feminino", "Masculino", "Outro", "Prefere não dizer"],
};

export default function NovoEleitorDialog({ open, onOpenChange, editing }: Props) {
  const { cidades } = useCidades();
  const { liderancas } = useLiderancas();
  const { insert, update } = useEleitores();
  const { isLideranca, linkedLiderancaId } = usePermissions();
  const { config: formCfg } = useFormConfig("eleitores");

  // Campos nativos
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
  // Campos extras armazenados em custom_field_values (JSONB)
  const [extras, setExtras] = useState<Record<string, any>>({});
  const [customValues, setCustomValues] = useState<Record<string, any>>({});

  const [loadingCep, setLoadingCep] = useState(false);
  const [saving, setSaving] = useState(false);
  const [liderancaOpen, setLiderancaOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const liderancasDisponiveis =
    isLideranca && linkedLiderancaId
      ? (liderancas as any[]).filter((l) => l.id === linkedLiderancaId)
      : (liderancas as any[]);

  const liderancasOrdenadas = [...liderancasDisponiveis].sort((a, b) =>
    (a.name || "").localeCompare(b.name || "", "pt-BR", { sensitivity: "base" }),
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
      const cfv = (editing as any).custom_field_values || {};
      // Separa extras nativos (chaves do catálogo) dos custom fields configurados
      const customKeys = new Set(formCfg.customFields.map((f) => f.key));
      const nextExtras: Record<string, any> = {};
      const nextCustom: Record<string, any> = {};
      for (const [k, v] of Object.entries(cfv)) {
        if (customKeys.has(k)) nextCustom[k] = v;
        else nextExtras[k] = v;
      }
      setExtras(nextExtras);
      setCustomValues(nextCustom);
      setShowAll(true);
    } else if (open && !editing) {
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing, liderancaLocked, linkedLiderancaId]);

  const reset = () => {
    setNome("");
    setWhatsapp("");
    setCidade("");
    setTelegram("");
    setEmail("");
    setCep("");
    setLogradouro("");
    setNumero("");
    setBairro("");
    setEstado("");
    setLiderancaId(liderancaLocked && linkedLiderancaId ? linkedLiderancaId : "__none__");
    setObservacoes("");
    setExtras({});
    setCustomValues({});
    setShowAll(false);
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

  // ========= Catálogo + helpers de configuração =========
  const catalog = NATIVE_FIELDS_CATALOG.eleitores;
  const fcfg = (key: string) => formCfg.nativeFields[key];
  const isVisible = (key: string) => !!fcfg(key)?.visible;
  const isRequired = (key: string) => !!fcfg(key)?.required;
  const labelOf = (key: string, fallback: string) => fcfg(key)?.label?.trim() || fallback;

  // Agrupa campos visíveis por grupo, respeitando ordem da config
  const groupedVisible = useMemo(() => {
    const groups = new Map<string, typeof catalog>();
    for (const def of catalog) {
      if (!isVisible(def.key)) continue;
      // Filtro modo cadastro rápido
      if (!showAll && !QUICK_KEYS.has(def.key) && !isRequired(def.key)) continue;
      const arr = groups.get(def.group) || [];
      arr.push(def);
      groups.set(def.group, arr);
    }
    // Ordena dentro de cada grupo
    const out: Array<{ group: string; items: typeof catalog }> = [];
    for (const [group, items] of groups.entries()) {
      const sorted = [...items].sort(
        (a, b) => (fcfg(a.key)?.order ?? 0) - (fcfg(b.key)?.order ?? 0),
      );
      out.push({ group, items: sorted });
    }
    // Mantém ordem de aparição dos grupos no catálogo
    const groupOrder = catalog.reduce<Record<string, number>>((acc, def, idx) => {
      if (acc[def.group] === undefined) acc[def.group] = idx;
      return acc;
    }, {});
    out.sort((a, b) => (groupOrder[a.group] ?? 0) - (groupOrder[b.group] ?? 0));
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formCfg, showAll]);

  // ========= Renderers por chave =========
  const setExtra = (k: string, v: any) => setExtras((p) => ({ ...p, [k]: v }));

  const renderField = (key: string) => {
    const def = catalog.find((d) => d.key === key);
    if (!def) return null;
    const required = isRequired(key);
    const label = labelOf(key, def.defaultLabel);
    const labelEl = (
      <Label className="text-xs">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
    );

    switch (key) {
      case "nome":
        return (
          <div key={key} className="col-span-2">
            {labelEl}
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Maria Silva" />
          </div>
        );
      case "whatsapp":
        return (
          <div key={key}>
            {labelEl}
            <Input
              value={whatsapp}
              onChange={(e) => setWhatsapp(maskPhoneBR(e.target.value))}
              placeholder="(11) 99999-9999"
            />
          </div>
        );
      case "telefone":
        return (
          <div key={key}>
            {labelEl}
            <Input
              value={extras.telefone || ""}
              onChange={(e) => setExtra("telefone", maskPhoneBR(e.target.value))}
              placeholder="(11) 9999-9999"
            />
          </div>
        );
      case "cidade":
        return (
          <div key={key}>
            {labelEl}
            <Select value={cidade} onValueChange={setCidade}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {cidades.map((c) => (
                  <SelectItem key={c.id} value={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      case "bairro":
        return (
          <div key={key}>
            {labelEl}
            <Input value={bairro} onChange={(e) => setBairro(e.target.value)} />
          </div>
        );
      case "estado":
        return (
          <div key={key}>
            {labelEl}
            <Input
              value={estado}
              onChange={(e) => setEstado(e.target.value.toUpperCase().slice(0, 2))}
              maxLength={2}
              placeholder="UF"
            />
          </div>
        );
      case "email":
        return (
          <div key={key}>
            {labelEl}
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
            />
          </div>
        );
      case "telegram":
        return (
          <div key={key}>
            {labelEl}
            <Input value={telegram} onChange={(e) => setTelegram(e.target.value)} placeholder="@usuario" />
          </div>
        );
      case "cep":
        return (
          <div key={key} className="col-span-2">
            {labelEl}
            <div className="flex items-end gap-2">
              <Input value={cep} onChange={(e) => setCep(maskCep(e.target.value))} placeholder="00000-000" />
              <Button variant="outline" size="sm" onClick={buscarCep} disabled={loadingCep}>
                {loadingCep ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                <span className="ml-1">Buscar</span>
              </Button>
            </div>
          </div>
        );
      case "logradouro":
        return (
          <div key={key} className="col-span-2">
            {labelEl}
            <Input value={logradouro} onChange={(e) => setLogradouro(e.target.value)} />
          </div>
        );
      case "numero":
        return (
          <div key={key}>
            {labelEl}
            <Input value={numero} onChange={(e) => setNumero(e.target.value)} />
          </div>
        );
      case "observacoes":
        return (
          <div key={key} className="col-span-2">
            {labelEl}
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Notas internas..."
              rows={3}
            />
          </div>
        );
      default: {
        // Campos extras (JSONB)
        const opts = SELECT_OPTIONS[key];
        if (opts) {
          const currentValue = extras[key] || "";
          const badgeCls = currentValue ? badgeClassesForKey(key, currentValue) : null;
          return (
            <div key={key}>
              {labelEl}
              <Select
                value={currentValue}
                onValueChange={(v) => setExtra(key, v)}
              >
                <SelectTrigger className={cn(badgeCls && "border-2", badgeCls || "")}>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {opts.map((o) => {
                    const dot = colorDotForKey(key, o);
                    return (
                      <SelectItem key={o} value={o}>
                        <span className="flex items-center gap-2">
                          {dot && <span className={cn("inline-block h-2.5 w-2.5 rounded-full", dot)} />}
                          {o}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          );
        }
        return (
          <div key={key}>
            {labelEl}
            <Input value={extras[key] || ""} onChange={(e) => setExtra(key, e.target.value)} />
          </div>
        );
      }
    }
  };

  const handleSubmit = async () => {
    if (!nome.trim()) return toast.error("Nome é obrigatório");
    if (isRequired("whatsapp") && (!whatsapp.trim() || whatsapp.replace(/\D/g, "").length < 10)) {
      return toast.error("WhatsApp inválido");
    }
    if (!cidade.trim()) return toast.error("Cidade é obrigatória");

    const mergedCustom: Record<string, any> = { ...extras, ...customValues };

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
      custom_field_values: mergedCustom,
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

  const totalHidden = useMemo(() => {
    return catalog.filter(
      (d) => isVisible(d.key) && !QUICK_KEYS.has(d.key) && !isRequired(d.key),
    ).length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formCfg]);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar Eleitor" : "Novo Eleitor"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {groupedVisible.map(({ group, items }) => (
            <div key={group} className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {group}
              </p>
              <div className="grid grid-cols-2 gap-3">
                {items.map((d) => renderField(d.key))}
              </div>
            </div>
          ))}

          {!showAll && totalHidden > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setShowAll(true)}
            >
              <ChevronDown className="h-3.5 w-3.5 mr-1" />
              Adicionar mais informações ({totalHidden} campos)
            </Button>
          )}
          {showAll && totalHidden > 0 && !editing && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
              onClick={() => setShowAll(false)}
            >
              <ChevronUp className="h-3.5 w-3.5 mr-1" />
              Recolher campos extras
            </Button>
          )}

          {/* Campos personalizados pelo deputado (sempre visíveis quando há) */}
          {showAll && formCfg.customFields.length > 0 && (
            <CustomFieldsBlock
              fields={formCfg.customFields}
              values={customValues}
              onChange={setCustomValues}
              title="Campos personalizados"
            />
          )}

          {/* Vínculo político — fica fora da config porque é estrutural */}
          <div className="pt-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Vínculo político
            </p>
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
                      <span
                        className={cn(
                          "truncate",
                          liderancaId === "__none__" && "text-muted-foreground",
                        )}
                      >
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
                            onSelect={() => {
                              setLiderancaId("__none__");
                              setLiderancaOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-3.5 w-3.5",
                                liderancaId === "__none__" ? "opacity-100" : "opacity-0",
                              )}
                            />
                            — Sem vínculo —
                          </CommandItem>
                          {liderancasOrdenadas.map((l: any) => {
                            const lbl = `${l.name} · ${l.cargo} · ${l.cidadePrincipal}`;
                            return (
                              <CommandItem
                                key={l.id}
                                value={lbl}
                                onSelect={() => {
                                  setLiderancaId(l.id);
                                  setLiderancaOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-3.5 w-3.5",
                                    liderancaId === l.id ? "opacity-100" : "opacity-0",
                                  )}
                                />
                                {lbl}
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

          <div className="flex items-center gap-2 pt-2 border-t">
            <Button onClick={handleSubmit} disabled={saving}>
              {saving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              {editing ? "Salvar" : "Cadastrar"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                reset();
                onOpenChange(false);
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
