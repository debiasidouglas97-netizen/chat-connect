import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Settings, Upload, X, Save, User, MapPin, Briefcase, Palette, Phone, Globe, Instagram, Facebook, Youtube, MessageCircle, Mail, AtSign } from "lucide-react";
import { useDeputyProfile } from "@/hooks/use-deputy-profile";
import { toast } from "sonner";

const REGIONS_OPTIONS = [
  "Baixada Santista", "Região de Bauru", "Interior de SP", "Grande São Paulo",
  "Litoral Norte", "Vale do Ribeira", "Alta Paulista", "Região de Campinas",
];

const FOCUS_AREAS_OPTIONS = [
  "Saúde", "Educação", "Infraestrutura", "Segurança", "Meio Ambiente",
  "Cultura", "Esporte", "Assistência Social", "Tecnologia", "Agricultura",
];

const STATES = [
  "Acre", "Alagoas", "Amapá", "Amazonas", "Bahia", "Ceará", "Distrito Federal",
  "Espírito Santo", "Goiás", "Maranhão", "Mato Grosso", "Mato Grosso do Sul",
  "Minas Gerais", "Pará", "Paraíba", "Paraná", "Pernambuco", "Piauí",
  "Rio de Janeiro", "Rio Grande do Norte", "Rio Grande do Sul", "Rondônia",
  "Roraima", "Santa Catarina", "São Paulo", "Sergipe", "Tocantins",
];

function getInitials(name: string) {
  return name
    .split(" ")
    .filter((w) => w.length > 2)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export default function Configuracoes() {
  const { profile, isLoading, upsert, uploadAvatar } = useDeputyProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    full_name: "",
    public_name: "",
    party: "",
    state: "São Paulo",
    regions: [] as string[],
    priority_cities: "" as string,
    focus_areas: [] as string[],
    bio: "",
    institutional_message: "",
    avatar_url: "",
    primary_color: "#2d5a3d",
    phone: "",
    whatsapp: "",
    email: "",
    telegram_username: "",
    instagram: "",
    facebook: "",
    youtube: "",
    address_cep: "",
    address_street: "",
    address_number: "",
    address_neighborhood: "",
    address_city: "",
    address_state: "",
  });

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || "",
        public_name: profile.public_name || "",
        party: profile.party || "",
        state: profile.state || "São Paulo",
        regions: profile.regions || [],
        priority_cities: (profile.priority_cities || []).join(", "),
        focus_areas: profile.focus_areas || [],
        bio: profile.bio || "",
        institutional_message: profile.institutional_message || "",
        avatar_url: profile.avatar_url || "",
        primary_color: profile.primary_color || "#2d5a3d",
        phone: (profile as any).phone || "",
        whatsapp: (profile as any).whatsapp || "",
        email: (profile as any).email || "",
        telegram_username: (profile as any).telegram_username || "",
        instagram: (profile as any).instagram || "",
        facebook: (profile as any).facebook || "",
        youtube: (profile as any).youtube || "",
        address_cep: (profile as any).address_cep || "",
        address_street: (profile as any).address_street || "",
        address_number: (profile as any).address_number || "",
        address_neighborhood: (profile as any).address_neighborhood || "",
        address_city: (profile as any).address_city || "",
        address_state: (profile as any).address_state || "",
      });
      if (profile.avatar_url) setAvatarPreview(profile.avatar_url);
    }
  }, [profile]);

  const toggleArrayItem = (arr: string[], item: string) =>
    arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      toast.error("Formato inválido. Use JPG ou PNG.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    try {
      setUploading(true);
      const url = await uploadAvatar(file);
      setForm((f) => ({ ...f, avatar_url: url }));
      toast.success("Foto enviada!");
    } catch {
      toast.error("Erro ao enviar foto.");
    } finally {
      setUploading(false);
    }
  };

  const handleCepLookup = async () => {
    const cep = form.address_cep.replace(/\D/g, "");
    if (cep.length !== 8) { toast.error("CEP inválido"); return; }
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (data.erro) { toast.error("CEP não encontrado"); return; }
      setForm((f) => ({
        ...f,
        address_street: data.logradouro || f.address_street,
        address_neighborhood: data.bairro || f.address_neighborhood,
        address_city: data.localidade || f.address_city,
        address_state: data.uf || f.address_state,
      }));
      toast.success("Endereço preenchido!");
    } catch {
      toast.error("Erro ao buscar CEP");
    }
  };

  const handleSave = () => {
    if (!form.full_name.trim()) { toast.error("Nome completo é obrigatório."); return; }
    if (!form.party.trim()) { toast.error("Partido é obrigatório."); return; }
    if (!form.state.trim()) { toast.error("Estado é obrigatório."); return; }

    upsert.mutate({
      full_name: form.full_name.trim(),
      public_name: form.public_name.trim() || null,
      party: form.party.trim(),
      state: form.state,
      regions: form.regions,
      priority_cities: form.priority_cities.split(",").map((c) => c.trim()).filter(Boolean),
      focus_areas: form.focus_areas,
      bio: form.bio.trim() || null,
      institutional_message: form.institutional_message.trim() || null,
      avatar_url: form.avatar_url || null,
      primary_color: form.primary_color,
      phone: form.phone.trim() || null,
      whatsapp: form.whatsapp.trim() || null,
      email: form.email.trim() || null,
      telegram_username: form.telegram_username.trim() || null,
      instagram: form.instagram.trim() || null,
      facebook: form.facebook.trim() || null,
      youtube: form.youtube.trim() || null,
      address_cep: form.address_cep.trim() || null,
      address_street: form.address_street.trim() || null,
      address_number: form.address_number.trim() || null,
      address_neighborhood: form.address_neighborhood.trim() || null,
      address_city: form.address_city.trim() || null,
      address_state: form.address_state.trim() || null,
    } as any);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Carregando configurações...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" />
            Configurações
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie os dados do deputado e identidade do mandato
          </p>
        </div>
        <Button onClick={handleSave} disabled={upsert.isPending} className="gap-2">
          <Save className="h-4 w-4" />
          {upsert.isPending ? "Salvando..." : "Salvar"}
        </Button>
      </div>

      {/* Avatar & Identity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Foto e Identidade
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="relative group">
              <Avatar className="h-24 w-24 border-2 border-primary/20">
                {avatarPreview ? (
                  <AvatarImage src={avatarPreview} alt="Avatar" className="object-cover" />
                ) : null}
                <AvatarFallback className="text-xl font-bold bg-primary/10 text-primary">
                  {form.full_name ? getInitials(form.full_name) : "?"}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 rounded-full bg-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                <Upload className="h-6 w-6 text-primary-foreground" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
            <div className="flex-1 space-y-2">
              <p className="text-sm font-medium text-foreground">Foto do Deputado</p>
              <p className="text-xs text-muted-foreground">
                JPG ou PNG, recomendado 512×512 px. A imagem será exibida como avatar circular.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  {uploading ? "Enviando..." : "Escolher foto"}
                </Button>
                {avatarPreview && (
                  <Button variant="ghost" size="sm" onClick={() => { setAvatarPreview(null); setForm((f) => ({ ...f, avatar_url: "" })); }}>
                    <X className="h-4 w-4 mr-1" /> Remover
                  </Button>
                )}
              </div>
            </div>
          </div>
          <Separator className="my-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Cor principal do mandato</Label>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" value={form.primary_color} onChange={(e) => setForm((f) => ({ ...f, primary_color: e.target.value }))} className="h-9 w-12 rounded border border-input cursor-pointer" />
                <Input value={form.primary_color} onChange={(e) => setForm((f) => ({ ...f, primary_color: e.target.value }))} className="w-28 font-mono text-xs" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Basic Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            Informações Básicas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="full_name">Nome completo *</Label>
              <Input id="full_name" value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} placeholder="Antonio Carlos Rodrigues" />
            </div>
            <div>
              <Label htmlFor="public_name">Nome público</Label>
              <Input id="public_name" value={form.public_name} onChange={(e) => setForm((f) => ({ ...f, public_name: e.target.value }))} placeholder='Dep. Antonio Carlos Rodrigues' />
            </div>
            <div>
              <Label htmlFor="party">Partido *</Label>
              <Input id="party" value={form.party} onChange={(e) => setForm((f) => ({ ...f, party: e.target.value }))} placeholder="PL" />
            </div>
            <div>
              <Label htmlFor="state">Estado *</Label>
              <select id="state" value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contacts */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            Contatos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="flex items-center gap-1"><Phone className="h-3 w-3" /> Telefone</Label>
              <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="(11) 99999-9999" />
            </div>
            <div>
              <Label className="flex items-center gap-1"><MessageCircle className="h-3 w-3" /> WhatsApp</Label>
              <Input value={form.whatsapp} onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))} placeholder="(11) 99999-9999" />
            </div>
            <div>
              <Label className="flex items-center gap-1"><Mail className="h-3 w-3" /> Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="deputado@email.com" />
            </div>
            <div>
              <Label className="flex items-center gap-1"><AtSign className="h-3 w-3" /> Telegram</Label>
              <Input value={form.telegram_username} onChange={(e) => setForm((f) => ({ ...f, telegram_username: e.target.value }))} placeholder="@username" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Social Media */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Redes Sociais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="flex items-center gap-1"><Instagram className="h-3 w-3" /> Instagram</Label>
              <Input value={form.instagram} onChange={(e) => setForm((f) => ({ ...f, instagram: e.target.value }))} placeholder="@perfil" />
            </div>
            <div>
              <Label className="flex items-center gap-1"><Facebook className="h-3 w-3" /> Facebook</Label>
              <Input value={form.facebook} onChange={(e) => setForm((f) => ({ ...f, facebook: e.target.value }))} placeholder="facebook.com/perfil" />
            </div>
            <div>
              <Label className="flex items-center gap-1"><Youtube className="h-3 w-3" /> YouTube</Label>
              <Input value={form.youtube} onChange={(e) => setForm((f) => ({ ...f, youtube: e.target.value }))} placeholder="youtube.com/@canal" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Address */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Endereço
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Label>CEP</Label>
              <Input value={form.address_cep} onChange={(e) => setForm((f) => ({ ...f, address_cep: e.target.value }))} placeholder="01001-000" />
            </div>
            <Button variant="outline" onClick={handleCepLookup}>Buscar</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Label>Rua</Label>
              <Input value={form.address_street} onChange={(e) => setForm((f) => ({ ...f, address_street: e.target.value }))} />
            </div>
            <div>
              <Label>Número</Label>
              <Input value={form.address_number} onChange={(e) => setForm((f) => ({ ...f, address_number: e.target.value }))} />
            </div>
            <div>
              <Label>Bairro</Label>
              <Input value={form.address_neighborhood} onChange={(e) => setForm((f) => ({ ...f, address_neighborhood: e.target.value }))} />
            </div>
            <div>
              <Label>Cidade</Label>
              <Input value={form.address_city} onChange={(e) => setForm((f) => ({ ...f, address_city: e.target.value }))} />
            </div>
            <div>
              <Label>Estado</Label>
              <Input value={form.address_state} onChange={(e) => setForm((f) => ({ ...f, address_state: e.target.value }))} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Political scope */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Atuação Política
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Regiões de atuação</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {REGIONS_OPTIONS.map((r) => (
                <Badge key={r} variant={form.regions.includes(r) ? "default" : "outline"} className="cursor-pointer transition-colors" onClick={() => setForm((f) => ({ ...f, regions: toggleArrayItem(f.regions, r) }))}>
                  {r}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="priority_cities">Cidades prioritárias</Label>
            <Input id="priority_cities" value={form.priority_cities} onChange={(e) => setForm((f) => ({ ...f, priority_cities: e.target.value }))} placeholder="Santos, Guarujá, Bauru (separadas por vírgula)" />
            <p className="text-xs text-muted-foreground mt-1">Separe por vírgula</p>
          </div>
          <div>
            <Label>Áreas de foco</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {FOCUS_AREAS_OPTIONS.map((a) => (
                <Badge key={a} variant={form.focus_areas.includes(a) ? "default" : "outline"} className="cursor-pointer transition-colors" onClick={() => setForm((f) => ({ ...f, focus_areas: toggleArrayItem(f.focus_areas, a) }))}>
                  {a}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bio & Message */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            Biografia e Mensagem
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="bio">Biografia curta (máx. 300 caracteres)</Label>
            <Textarea id="bio" value={form.bio} onChange={(e) => { if (e.target.value.length <= 300) setForm((f) => ({ ...f, bio: e.target.value })); }} placeholder="Atuante na Baixada Santista e Região de Bauru, com foco em saúde, educação e infraestrutura." rows={3} />
            <p className="text-xs text-muted-foreground mt-1">{form.bio.length}/300</p>
          </div>
          <div>
            <Label htmlFor="institutional_message">Frase institucional (opcional)</Label>
            <Input id="institutional_message" value={form.institutional_message} onChange={(e) => setForm((f) => ({ ...f, institutional_message: e.target.value }))} placeholder="Trabalhando por um estado mais justo e eficiente" />
          </div>
        </CardContent>
      </Card>

      {/* Save footer */}
      <div className="flex justify-end pb-8">
        <Button onClick={handleSave} disabled={upsert.isPending} size="lg" className="gap-2">
          <Save className="h-4 w-4" />
          {upsert.isPending ? "Salvando..." : "Salvar alterações"}
        </Button>
      </div>
    </div>
  );
}
