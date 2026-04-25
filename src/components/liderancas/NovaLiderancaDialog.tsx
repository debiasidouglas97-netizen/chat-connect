import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCidades } from "@/hooks/use-cidades";
import type { LiderancaBase, AtuacaoCidade } from "@/lib/scoring";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Upload, Phone, Mail, AtSign, MessageCircle, Instagram, Facebook, Youtube, KeyRound, User as UserIcon, Eye, EyeOff, ShieldCheck, Info } from "lucide-react";
import { toast } from "sonner";
import MetaVotosInput, { type MetaVotosTipo } from "./MetaVotosInput";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { useLiderancas } from "@/hooks/use-liderancas";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Chamado após criar com sucesso. Pode disparar refresh local. */
  onCreated?: () => void;
}

function maskCPF(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function passwordStrength(p: string): { label: string; color: string; pct: number } {
  let score = 0;
  if (p.length >= 8) score++;
  if (p.length >= 12) score++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++;
  if (/\d/.test(p)) score++;
  if (/[^a-zA-Z0-9]/.test(p)) score++;
  if (score <= 1) return { label: "Fraca", color: "bg-destructive", pct: 25 };
  if (score === 2) return { label: "Razoável", color: "bg-warning", pct: 50 };
  if (score === 3) return { label: "Boa", color: "bg-primary", pct: 75 };
  return { label: "Forte", color: "bg-success", pct: 100 };
}

export default function NovaLiderancaDialog({ open, onOpenChange, onCreated }: Props) {
  const { cidades: cidadesData } = useCidades();
  const { insert: insertLideranca } = useLiderancas();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [cargo, setCargo] = useState("");
  const [cidadePrincipal, setCidadePrincipal] = useState("");
  const [influencia, setInfluencia] = useState<"Alta" | "Média" | "Baixa">("Média");
  const [tipo, setTipo] = useState<"Eleitoral" | "Comunitária" | "Política" | "Prefeito(a)" | "Vice-Prefeito(a)" | "Vereador(a)">("Comunitária");
  const [atuacao, setAtuacao] = useState<AtuacaoCidade[]>([]);
  const [novaCidade, setNovaCidade] = useState("");
  const [novaIntensidade, setNovaIntensidade] = useState<"Alta" | "Média" | "Baixa">("Média");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [telegram, setTelegram] = useState("");
  const [instagramVal, setInstagramVal] = useState("");
  const [facebookVal, setFacebookVal] = useState("");
  const [youtubeVal, setYoutubeVal] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [addressCep, setAddressCep] = useState("");
  const [addressStreet, setAddressStreet] = useState("");
  const [addressNumber, setAddressNumber] = useState("");
  const [addressNeighborhood, setAddressNeighborhood] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressState, setAddressState] = useState("");
  const [metaTipo, setMetaTipo] = useState<MetaVotosTipo>("percentual");
  const [metaValor, setMetaValor] = useState<number | null>(null);

  // Acesso ao sistema (opcional via checkbox)
  const [criarAcesso, setCriarAcesso] = useState(true);
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const cidadeOptions = cidadesData.map((c) => c.name);

  const reset = () => {
    setName(""); setCargo(""); setCidadePrincipal(""); setInfluencia("Média");
    setTipo("Comunitária"); setAtuacao([]); setNovaCidade(""); setNovaIntensidade("Média");
    setPhone(""); setWhatsapp(""); setTelegram("");
    setInstagramVal(""); setFacebookVal(""); setYoutubeVal(""); setAvatarPreview(null);
    setAddressCep(""); setAddressStreet(""); setAddressNumber(""); setAddressNeighborhood("");
    setAddressCity(""); setAddressState("");
    setMetaTipo("percentual"); setMetaValor(null);
    setCriarAcesso(true);
    setEmail(""); setCpf(""); setUsername(""); setPassword(""); setPasswordConfirm("");
    setShowPassword(false);
  };

  const addCidade = () => {
    if (!novaCidade || atuacao.some((a) => a.cidadeNome === novaCidade)) return;
    setAtuacao([...atuacao, { cidadeNome: novaCidade, intensidade: novaIntensidade }]);
    setNovaCidade("");
  };

  const removeCidade = (nome: string) => setAtuacao(atuacao.filter((a) => a.cidadeNome !== nome));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleCepLookup = async () => {
    const cep = addressCep.replace(/\D/g, "");
    if (cep.length !== 8) { toast.error("CEP inválido"); return; }
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (data.erro) { toast.error("CEP não encontrado"); return; }
      setAddressStreet(data.logradouro || "");
      setAddressNeighborhood(data.bairro || "");
      setAddressCity(data.localidade || "");
      setAddressState(data.uf || "");
      toast.success("Endereço preenchido!");
    } catch { toast.error("Erro ao buscar CEP"); }
  };

  const handleSubmit = async () => {
    // Validações de liderança (sempre obrigatórias)
    if (!name.trim() || !cargo.trim() || !cidadePrincipal.trim()) {
      toast.error("Nome, cargo e cidade principal são obrigatórios");
      return;
    }

    const img = name.trim().split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
    const atuacaoFinal = atuacao.length > 0
      ? atuacao
      : [{ cidadeNome: cidadePrincipal.trim(), intensidade: "Alta" as const }];

    setSubmitting(true);
    try {
      if (criarAcesso) {
        // Validações de acesso
        if (!email.trim() || !email.includes("@")) {
          toast.error("Informe um e-mail válido para o acesso ao sistema");
          return;
        }
        const cpfDigits = cpf.replace(/\D/g, "");
        if (cpfDigits.length !== 11) {
          toast.error("CPF deve ter 11 dígitos");
          return;
        }
        if (!/^[a-zA-Z0-9_.]{3,}$/.test(username.trim())) {
          toast.error("Username inválido (mínimo 3 caracteres, apenas letras, números, _ ou .)");
          return;
        }
        if (password.length < 8) {
          toast.error("Senha deve ter no mínimo 8 caracteres");
          return;
        }
        if (password !== passwordConfirm) {
          toast.error("Senhas não conferem");
          return;
        }

        // Cria liderança + acesso atômico via edge function
        const { data, error } = await supabase.functions.invoke("create-lideranca-user", {
          body: {
            mode: "create",
            email: email.trim().toLowerCase(),
            cpf: cpfDigits,
            username: username.trim(),
            password,
            name: name.trim(),
            img,
            cargo: cargo.trim(),
            cidadePrincipal: cidadePrincipal.trim(),
            influencia,
            tipo,
            engajamento: 50,
            atuacao: atuacaoFinal,
            phone: phone || null,
            whatsapp: whatsapp || null,
            telegram_username: telegram || null,
            instagram: instagramVal || null,
            facebook: facebookVal || null,
            youtube: youtubeVal || null,
            avatar_url: avatarPreview,
            address_cep: addressCep || null,
            address_street: addressStreet || null,
            address_number: addressNumber || null,
            address_neighborhood: addressNeighborhood || null,
            address_city: addressCity || null,
            address_state: addressState || null,
            meta_votos_tipo: metaTipo,
            meta_votos_valor: metaValor,
          },
        });
        if (error || (data as any)?.error) {
          toast.error((data as any)?.error || error?.message || "Erro ao cadastrar");
          return;
        }
        toast.success("Liderança cadastrada e acesso ao sistema criado!");
      } else {
        // Cadastra apenas no CRM (sem acesso ao sistema)
        await insertLideranca({
          name: name.trim(),
          img,
          cargo: cargo.trim(),
          cidadePrincipal: cidadePrincipal.trim(),
          influencia,
          tipo,
          engajamento: 50,
          atuacao: atuacaoFinal,
          phone, whatsapp,
          email: email.trim() || "",
          telegram_username: telegram,
          instagram: instagramVal, facebook: facebookVal, youtube: youtubeVal,
          avatar_url: avatarPreview,
          address_cep: addressCep, address_street: addressStreet, address_number: addressNumber,
          address_neighborhood: addressNeighborhood, address_city: addressCity, address_state: addressState,
          meta_votos_tipo: metaTipo, meta_votos_valor: metaValor,
        } as any);
        toast.success("Liderança cadastrada! Você pode criar o acesso ao sistema depois pelo detalhe da liderança.");
      }

      reset();
      onOpenChange(false);
      onCreated?.();
    } catch (e: any) {
      toast.error("Erro ao cadastrar: " + (e?.message ?? "desconhecido"));
    } finally {
      setSubmitting(false);
    }
  };

  const strength = passwordStrength(password);

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Liderança</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Photo */}
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border border-primary/20">
              {avatarPreview ? <AvatarImage src={avatarPreview} className="object-cover" /> : null}
              <AvatarFallback className="bg-primary/10 text-primary font-bold">{name ? name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() : "?"}</AvatarFallback>
            </Avatar>
            <div>
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}><Upload className="h-3.5 w-3.5 mr-1" /> Foto</Button>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleFileChange} />
              <p className="text-[10px] text-muted-foreground mt-1">JPG ou PNG</p>
            </div>
          </div>

          {/* Basic */}
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Nome completo *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: João da Silva" /></div>
            <div><Label className="text-xs">Cargo *</Label><Input value={cargo} onChange={(e) => setCargo(e.target.value)} placeholder="Ex: Presidente da Associação" /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Cidade principal *</Label>
              <Select value={cidadePrincipal} onValueChange={setCidadePrincipal}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{cidadeOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
            </div>
            <div>
              <Label className="text-xs">Influência</Label>
              <Select value={influencia} onValueChange={(v) => setInfluencia(v as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Alta">Alta</SelectItem><SelectItem value="Média">Média</SelectItem><SelectItem value="Baixa">Baixa</SelectItem></SelectContent></Select>
            </div>
            <div>
              <Label className="text-xs">Tipo</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Eleitoral">Eleitoral</SelectItem><SelectItem value="Comunitária">Comunitária</SelectItem><SelectItem value="Política">Política</SelectItem><SelectItem value="Prefeito(a)">Prefeito(a)</SelectItem><SelectItem value="Vice-Prefeito(a)">Vice-Prefeito(a)</SelectItem><SelectItem value="Vereador(a)">Vereador(a)</SelectItem></SelectContent></Select>
            </div>
          </div>

          {/* Acesso ao Sistema (opcional) */}
          <div className={`rounded-lg border p-3 space-y-3 transition-colors ${criarAcesso ? "border-primary/30 bg-primary/5" : "border-border bg-muted/30"}`}>
            <div className="flex items-start gap-3">
              <Checkbox
                id="criar-acesso"
                checked={criarAcesso}
                onCheckedChange={(v) => setCriarAcesso(v === true)}
                className="mt-0.5"
              />
              <div className="flex-1">
                <label htmlFor="criar-acesso" className="flex items-center gap-2 text-sm font-semibold text-primary cursor-pointer">
                  <ShieldCheck className="h-4 w-4" />
                  Criar acesso ao sistema agora
                </label>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {criarAcesso
                    ? "A liderança poderá entrar no sistema com estas credenciais. O e-mail é confirmado automaticamente."
                    : "A liderança será cadastrada apenas no CRM. Você pode criar o acesso a qualquer momento pelo detalhe da liderança."}
                </p>
              </div>
            </div>

            {criarAcesso && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <Label className="text-xs flex items-center gap-1"><Mail className="h-3 w-3" /> E-mail *</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="lideranca@exemplo.com" />
                </div>
                <div>
                  <Label className="text-xs">CPF *</Label>
                  <Input value={cpf} onChange={(e) => setCpf(maskCPF(e.target.value))} placeholder="000.000.000-00" />
                </div>
                <div>
                  <Label className="text-xs flex items-center gap-1"><UserIcon className="h-3 w-3" /> Username *</Label>
                  <Input value={username} onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))} placeholder="ex: joao.silva" />
                </div>
                <div className="row-span-2">
                  <Label className="text-xs flex items-center gap-1"><KeyRound className="h-3 w-3" /> Senha *</Label>
                  <div className="relative">
                    <Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {password && (
                    <div className="mt-1.5 space-y-1">
                      <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                        <div className={`h-full transition-all ${strength.color}`} style={{ width: `${strength.pct}%` }} />
                      </div>
                      <p className="text-[10px] text-muted-foreground">Força: {strength.label}</p>
                    </div>
                  )}
                  <Label className="text-xs flex items-center gap-1 mt-2">Confirmar senha *</Label>
                  <Input type={showPassword ? "text" : "password"} value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} />
                </div>
              </div>
            )}
          </div>

          {/* E-mail de contato (visível apenas quando NÃO criar acesso) */}
          {!criarAcesso && (
            <div>
              <Label className="text-xs flex items-center gap-1"><Mail className="h-3 w-3" /> E-mail de contato (opcional)</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" />
              <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                <Info className="h-3 w-3" /> Útil para criar o acesso ao sistema mais tarde sem precisar redigitar.
              </p>
            </div>
          )}

          {/* Meta de votos */}
          <MetaVotosInput
            cargo={cargo}
            cidadePrincipal={cidadePrincipal}
            tipo={metaTipo}
            valor={metaValor}
            onChange={(t, v) => { setMetaTipo(t); setMetaValor(v); }}
          />

          {/* Contacts */}
          <p className="text-xs font-medium text-muted-foreground pt-2">Contatos adicionais</p>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs flex items-center gap-1"><Phone className="h-3 w-3" /> Telefone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" /></div>
            <div><Label className="text-xs flex items-center gap-1"><MessageCircle className="h-3 w-3" /> WhatsApp</Label><Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="(11) 99999-9999" /></div>
            <div><Label className="text-xs flex items-center gap-1"><AtSign className="h-3 w-3" /> Telegram</Label><Input value={telegram} onChange={(e) => setTelegram(e.target.value)} placeholder="@username" /></div>
          </div>

          {/* Social */}
          <p className="text-xs font-medium text-muted-foreground pt-2">Redes sociais</p>
          <div className="grid grid-cols-3 gap-3">
            <div><Label className="text-xs flex items-center gap-1"><Instagram className="h-3 w-3" /> Instagram</Label><Input value={instagramVal} onChange={(e) => setInstagramVal(e.target.value)} placeholder="@perfil" /></div>
            <div><Label className="text-xs flex items-center gap-1"><Facebook className="h-3 w-3" /> Facebook</Label><Input value={facebookVal} onChange={(e) => setFacebookVal(e.target.value)} /></div>
            <div><Label className="text-xs flex items-center gap-1"><Youtube className="h-3 w-3" /> YouTube</Label><Input value={youtubeVal} onChange={(e) => setYoutubeVal(e.target.value)} /></div>
          </div>

          {/* Address */}
          <p className="text-xs font-medium text-muted-foreground pt-2">Endereço</p>
          <div className="flex items-end gap-2">
            <div className="flex-1"><Label className="text-xs">CEP</Label><Input value={addressCep} onChange={(e) => setAddressCep(e.target.value)} placeholder="01001-000" /></div>
            <Button variant="outline" size="sm" onClick={handleCepLookup}>Buscar</Button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2"><Label className="text-xs">Rua</Label><Input value={addressStreet} onChange={(e) => setAddressStreet(e.target.value)} /></div>
            <div><Label className="text-xs">Número</Label><Input value={addressNumber} onChange={(e) => setAddressNumber(e.target.value)} /></div>
            <div><Label className="text-xs">Bairro</Label><Input value={addressNeighborhood} onChange={(e) => setAddressNeighborhood(e.target.value)} /></div>
            <div><Label className="text-xs">Cidade</Label><Input value={addressCity} onChange={(e) => setAddressCity(e.target.value)} /></div>
            <div><Label className="text-xs">Estado</Label><Input value={addressState} onChange={(e) => setAddressState(e.target.value)} /></div>
          </div>

          {/* Cidades de atuação */}
          <p className="text-xs font-medium text-muted-foreground pt-2">Cidades de atuação</p>
          <div className="flex items-center gap-2">
            <Select value={novaCidade} onValueChange={setNovaCidade}><SelectTrigger className="flex-1"><SelectValue placeholder="Cidade" /></SelectTrigger><SelectContent>{cidadeOptions.filter((c) => !atuacao.some((a) => a.cidadeNome === c)).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
            <Select value={novaIntensidade} onValueChange={(v) => setNovaIntensidade(v as any)}><SelectTrigger className="w-28"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Alta">Alta</SelectItem><SelectItem value="Média">Média</SelectItem><SelectItem value="Baixa">Baixa</SelectItem></SelectContent></Select>
            <Button size="icon" variant="outline" className="shrink-0" onClick={addCidade} disabled={!novaCidade}><Plus className="h-4 w-4" /></Button>
          </div>
          {atuacao.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {atuacao.map((a) => (
                <Badge key={a.cidadeNome} variant="secondary" className="text-xs gap-1">
                  {a.cidadeNome} ({a.intensidade})
                  <button onClick={() => removeCidade(a.cidadeNome)} className="ml-1 hover:text-destructive"><X className="h-3 w-3" /></button>
                </Badge>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 pt-2 border-t">
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Cadastrando..." : criarAcesso ? "Cadastrar Liderança + Acesso" : "Cadastrar Liderança"}
            </Button>
            <Button variant="ghost" onClick={() => { reset(); onOpenChange(false); }} disabled={submitting}>Cancelar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
