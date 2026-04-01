import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Pencil, MapPin, Star, Upload, Phone, Mail, AtSign, MessageCircle, Instagram, Facebook, Youtube, Plus, X } from "lucide-react";
import type { LiderancaComScore, AtuacaoCidade } from "@/lib/scoring";
import { useCidades } from "@/hooks/use-cidades";
import { toast } from "sonner";
import EngagementSection from "./EngagementSection";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
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
  onSave: (original: LiderancaComScore, updated: Record<string, any>) => void;
  onDelete: (name: string) => void;
  showScore: boolean;
}

export default function LiderancaDetailDialog({ open, onOpenChange, lideranca, onSave, onDelete, showScore }: Props) {
  const { cidades: cidadesData } = useCidades();
  const cidadeOptions = cidadesData.map((c) => c.name);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [cargo, setCargo] = useState("");
  const [cidadePrincipal, setCidadePrincipal] = useState("");
  const [influencia, setInfluencia] = useState<"Alta" | "Média" | "Baixa">("Média");
  const [tipo, setTipo] = useState<"Eleitoral" | "Comunitária" | "Política">("Comunitária");
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
  const [atuacao, setAtuacao] = useState<AtuacaoCidade[]>([]);
  const [novaCidade, setNovaCidade] = useState("");
  const [novaIntensidade, setNovaIntensidade] = useState<"Alta" | "Média" | "Baixa">("Média");
  const [classificacaoManual, setClassificacaoManual] = useState("");

  const startEdit = () => {
    if (!lideranca) return;
    const l = lideranca as any;
    setName(l.name);
    setCargo(l.cargo);
    setCidadePrincipal(l.cidadePrincipal);
    setInfluencia(l.influencia);
    setTipo(l.tipo);
    setPhone(l.phone || "");
    setWhatsapp(l.whatsapp || "");
    setEmail(l.email || "");
    setTelegram(l.telegram_username || "");
    setInstagramVal(l.instagram || "");
    setFacebookVal(l.facebook || "");
    setYoutubeVal(l.youtube || "");
    setAvatarPreview(l.avatar_url || null);
    setAddressCep(l.address_cep || "");
    setAddressStreet(l.address_street || "");
    setAddressNumber(l.address_number || "");
    setAddressNeighborhood(l.address_neighborhood || "");
    setAddressCity(l.address_city || "");
    setAddressState(l.address_state || "");
    setClassificacaoManual(l.classificacao_manual || "");
    setAtuacao(l.atuacao ? [...l.atuacao] : []);
    setNovaCidade("");
    setNovaIntensidade("Média");
    setEditing(true);
  };

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

  const addCidade = () => {
    if (!novaCidade || atuacao.some((a) => a.cidadeNome === novaCidade)) return;
    setAtuacao([...atuacao, { cidadeNome: novaCidade, intensidade: novaIntensidade }]);
    setNovaCidade("");
  };

  const removeCidade = (nome: string) => setAtuacao(atuacao.filter((a) => a.cidadeNome !== nome));

  const handleSave = () => {
    if (!lideranca) return;
    onSave(lideranca, {
      name, cargo, cidadePrincipal, influencia, tipo,
      phone, whatsapp, email, telegram_username: telegram,
      instagram: instagramVal, facebook: facebookVal, youtube: youtubeVal,
      avatar_url: avatarPreview,
      address_cep: addressCep, address_street: addressStreet, address_number: addressNumber,
      address_neighborhood: addressNeighborhood, address_city: addressCity, address_state: addressState,
      classificacao_manual: classificacaoManual && classificacaoManual !== "auto" ? classificacaoManual : null,
      atuacao,
    });
    setEditing(false);
  };

  const handleDelete = () => {
    if (!lideranca) return;
    onDelete(lideranca.name);
    setConfirmDelete(false);
    onOpenChange(false);
  };

  if (!lideranca) return null;
  const l = lideranca as any;

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setEditing(false); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg flex items-center gap-3">
              <Avatar className="h-10 w-10 border border-primary/20">
                {(editing ? avatarPreview : l.avatar_url) ? (
                  <AvatarImage src={editing ? avatarPreview! : l.avatar_url} className="object-cover" />
                ) : null}
                <AvatarFallback className="text-sm font-bold bg-primary/10 text-primary">{lideranca.img}</AvatarFallback>
              </Avatar>
              {editing ? (
                <Input value={name} onChange={(e) => setName(e.target.value)} className="text-lg font-semibold" />
              ) : (
                <span>{lideranca.name}</span>
              )}
            </DialogTitle>
          </DialogHeader>

          {!editing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-muted-foreground text-xs">Cargo</p><p className="font-medium">{lideranca.cargo}</p></div>
                <div><p className="text-muted-foreground text-xs">Cidade principal</p><p className="font-medium flex items-center gap-1"><MapPin className="h-3 w-3" />{lideranca.cidadePrincipal}</p></div>
                <div><p className="text-muted-foreground text-xs">Tipo</p><p className="font-medium">{lideranca.tipo}</p></div>
                <div><p className="text-muted-foreground text-xs">Influência</p><Badge variant="outline" className={`text-xs ${influenciaColors[lideranca.influencia]}`}><Star className="h-3 w-3 mr-1" /> {lideranca.influencia}</Badge></div>
                {showScore && (
                  <>
                    <div><p className="text-muted-foreground text-xs">Score</p><p className="text-xl font-bold">{lideranca.score}</p></div>
                    <div><p className="text-muted-foreground text-xs">Classificação</p><p className="font-medium">{lideranca.classificacao.icon} {lideranca.classificacao.label}</p></div>
                  </>
                )}
              </div>

              {/* Contacts */}
              {(l.phone || l.whatsapp || l.email || l.telegram_username) && (
                <div>
                  <p className="text-muted-foreground text-xs mb-2">Contatos</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {l.phone && <p className="flex items-center gap-1"><Phone className="h-3 w-3 text-muted-foreground" /> {l.phone}</p>}
                    {l.whatsapp && <p className="flex items-center gap-1"><MessageCircle className="h-3 w-3 text-muted-foreground" /> {l.whatsapp}</p>}
                    {l.email && <p className="flex items-center gap-1"><Mail className="h-3 w-3 text-muted-foreground" /> {l.email}</p>}
                    {l.telegram_username && <p className="flex items-center gap-1"><AtSign className="h-3 w-3 text-muted-foreground" /> {l.telegram_username}</p>}
                  </div>
                </div>
              )}

              {/* Social */}
              {(l.instagram || l.facebook || l.youtube) && (
                <div>
                  <p className="text-muted-foreground text-xs mb-2">Redes sociais</p>
                  <div className="flex flex-wrap gap-2 text-sm">
                    {l.instagram && <Badge variant="secondary" className="text-xs"><Instagram className="h-3 w-3 mr-1" />{l.instagram}</Badge>}
                    {l.facebook && <Badge variant="secondary" className="text-xs"><Facebook className="h-3 w-3 mr-1" />{l.facebook}</Badge>}
                    {l.youtube && <Badge variant="secondary" className="text-xs"><Youtube className="h-3 w-3 mr-1" />{l.youtube}</Badge>}
                  </div>
                </div>
              )}

              {/* Address */}
              {l.address_street && (
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Endereço</p>
                  <p className="text-sm">{l.address_street}{l.address_number ? `, ${l.address_number}` : ""} — {l.address_neighborhood}, {l.address_city}/{l.address_state}</p>
                </div>
              )}

              <div>
                <p className="text-muted-foreground text-xs mb-2">Cidades de atuação</p>
                <div className="flex flex-wrap gap-1.5">
                  {lideranca.atuacao.map((a) => (
                    <Badge key={a.cidadeNome} variant="secondary" className="text-xs"><MapPin className="h-3 w-3 mr-1" /> {a.cidadeNome} ({a.intensidade})</Badge>
                  ))}
                </div>
              </div>

              {/* Engagement Section */}
              <div className="border-t pt-3">
                <EngagementSection leaderId={(l as any).id} />
              </div>

              <div className="flex items-center gap-2 pt-2 border-t">
                <Button size="sm" variant="outline" className="gap-1" onClick={startEdit}><Pencil className="h-3.5 w-3.5" /> Editar</Button>
                <Button size="sm" variant="destructive" className="gap-1" onClick={() => setConfirmDelete(true)}><Trash2 className="h-3.5 w-3.5" /> Excluir</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Photo */}
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border border-primary/20">
                  {avatarPreview ? <AvatarImage src={avatarPreview} className="object-cover" /> : null}
                  <AvatarFallback className="bg-primary/10 text-primary font-bold">{lideranca.img}</AvatarFallback>
                </Avatar>
                <div>
                  <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}><Upload className="h-3.5 w-3.5 mr-1" /> Foto</Button>
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleFileChange} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Cargo</Label><Input value={cargo} onChange={(e) => setCargo(e.target.value)} /></div>
                <div><Label className="text-xs">Cidade principal</Label><Input value={cidadePrincipal} onChange={(e) => setCidadePrincipal(e.target.value)} /></div>
                <div>
                  <Label className="text-xs">Influência</Label>
                  <Select value={influencia} onValueChange={(v) => setInfluencia(v as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Alta">Alta</SelectItem><SelectItem value="Média">Média</SelectItem><SelectItem value="Baixa">Baixa</SelectItem></SelectContent></Select>
                </div>
                <div>
                  <Label className="text-xs">Tipo</Label>
                  <Select value={tipo} onValueChange={(v) => setTipo(v as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Eleitoral">Eleitoral</SelectItem><SelectItem value="Comunitária">Comunitária</SelectItem><SelectItem value="Política">Política</SelectItem></SelectContent></Select>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Classificação</Label>
                  <Select value={classificacaoManual} onValueChange={setClassificacaoManual}>
                    <SelectTrigger><SelectValue placeholder="Automática (baseada no score)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">🤖 Automática</SelectItem>
                      <SelectItem value="Força Local">🏙️ Força Local</SelectItem>
                      <SelectItem value="Força Regional">🌎 Força Regional</SelectItem>
                      <SelectItem value="Força Estratégica">🏛️ Força Estratégica</SelectItem>
                    </SelectContent>
                  </Select>
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
            <AlertDialogDescription>Tem certeza que deseja excluir <strong>{lideranca.name}</strong>? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
