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
import { Plus, X, Upload, Phone, Mail, AtSign, MessageCircle, Instagram, Facebook, Youtube } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (l: LiderancaBase & Record<string, any>) => void;
}

export default function NovaLiderancaDialog({ open, onOpenChange, onAdd }: Props) {
  const { cidades: cidadesData } = useCidades();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [cargo, setCargo] = useState("");
  const [cidadePrincipal, setCidadePrincipal] = useState("");
  const [influencia, setInfluencia] = useState<"Alta" | "Média" | "Baixa">("Média");
  const [tipo, setTipo] = useState<"Eleitoral" | "Comunitária" | "Política">("Comunitária");
  const [atuacao, setAtuacao] = useState<AtuacaoCidade[]>([]);
  const [novaCidade, setNovaCidade] = useState("");
  const [novaIntensidade, setNovaIntensidade] = useState<"Alta" | "Média" | "Baixa">("Média");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
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

  const cidadeOptions = cidadesData.map((c) => c.name);

  const reset = () => {
    setName(""); setCargo(""); setCidadePrincipal(""); setInfluencia("Média");
    setTipo("Comunitária"); setAtuacao([]); setNovaCidade(""); setNovaIntensidade("Média");
    setPhone(""); setWhatsapp(""); setEmail(""); setTelegram("");
    setInstagramVal(""); setFacebookVal(""); setYoutubeVal(""); setAvatarPreview(null);
    setAddressCep(""); setAddressStreet(""); setAddressNumber(""); setAddressNeighborhood("");
    setAddressCity(""); setAddressState("");
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

  const handleSubmit = () => {
    if (!name.trim() || !cargo.trim() || !cidadePrincipal.trim()) return;
    const img = name.trim().split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
    onAdd({
      name: name.trim(), img, cargo: cargo.trim(), cidadePrincipal: cidadePrincipal.trim(),
      influencia, tipo, engajamento: 50,
      atuacao: atuacao.length > 0 ? atuacao : [{ cidadeNome: cidadePrincipal.trim(), intensidade: "Alta" }],
      phone, whatsapp, email, telegram_username: telegram,
      instagram: instagramVal, facebook: facebookVal, youtube: youtubeVal,
      avatar_url: avatarPreview,
      address_cep: addressCep, address_street: addressStreet, address_number: addressNumber,
      address_neighborhood: addressNeighborhood, address_city: addressCity, address_state: addressState,
    });
    reset();
    onOpenChange(false);
  };

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
              <Select value={tipo} onValueChange={(v) => setTipo(v as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Eleitoral">Eleitoral</SelectItem><SelectItem value="Comunitária">Comunitária</SelectItem><SelectItem value="Política">Política</SelectItem></SelectContent></Select>
            </div>
          </div>

          {/* Contacts */}
          <p className="text-xs font-medium text-muted-foreground pt-2">Contatos</p>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs flex items-center gap-1"><Phone className="h-3 w-3" /> Telefone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" /></div>
            <div><Label className="text-xs flex items-center gap-1"><MessageCircle className="h-3 w-3" /> WhatsApp</Label><Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="(11) 99999-9999" /></div>
            <div><Label className="text-xs flex items-center gap-1"><Mail className="h-3 w-3" /> Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" /></div>
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
            <Button onClick={handleSubmit} disabled={!name.trim() || !cargo.trim() || !cidadePrincipal}>Cadastrar</Button>
            <Button variant="ghost" onClick={() => { reset(); onOpenChange(false); }}>Cancelar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
