import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Users, Plus, Search, Link2, Eye, EyeOff, ChevronsUpDown, Check, X, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { AppRole, Profile } from "@/hooks/use-auth";
import { getInitials } from "@/hooks/use-auth";
import { useTenant } from "@/hooks/use-tenant";
import { usePermissions } from "@/hooks/use-permissions";
import { cn } from "@/lib/utils";
import RolePermissionsDialog from "@/components/configuracoes/RolePermissionsDialog";

interface Lideranca {
  id: string;
  name: string;
  avatar_url: string | null;
  img: string;
  cidade_principal: string;
  cargo: string;
  email: string | null;
  whatsapp: string | null;
  telegram_username: string | null;
}

const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: "Super Admin",
  deputado: "Deputado",
  chefe_gabinete: "Chefe de Gabinete",
  secretario: "Secretário",
  lideranca: "Liderança",
};

const ROLE_COLORS: Record<AppRole, string> = {
  super_admin: "bg-red-600 text-white",
  deputado: "bg-primary text-primary-foreground",
  chefe_gabinete: "bg-blue-600 text-white",
  secretario: "bg-amber-600 text-white",
  lideranca: "bg-muted text-muted-foreground",
};

function maskCPF(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}
function onlyDigits(v: string) { return (v || "").replace(/\D/g, ""); }
function maskWhatsApp(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export default function UserManagement() {
  const { tenantId } = useTenant();
  const { isAdmin } = usePermissions();
  const [users, setUsers] = useState<Profile[]>([]);
  const [liderancas, setLiderancas] = useState<Lideranca[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const [editUser, setEditUser] = useState<(Profile & { cpf?: string | null; username?: string | null; whatsapp?: string | null; telegram_username?: string | null }) | null>(null);
  const [deactivateUser, setDeactivateUser] = useState<Profile | null>(null);

  // Form state
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    password_confirm: "",
    cpf: "",
    username: "",
    whatsapp: "",
    telegram_username: "",
    role: "secretario" as AppRole,
    lideranca_id: null as string | null,
    cities: [] as string[],
    citiesInput: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [linkedLideranca, setLinkedLideranca] = useState<Lideranca | null>(null);
  const [comboOpen, setComboOpen] = useState(false);

  useEffect(() => {
    if (tenantId) {
      fetchUsers();
      fetchLiderancas();
    }
  }, [tenantId]);

  const fetchUsers = async () => {
    if (!tenantId) return;
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("tenant_id", tenantId)
      .neq("role", "super_admin")
      .neq("role", "lideranca")
      .order("created_at", { ascending: false });
    if (data) setUsers(data as unknown as Profile[]);
    setLoading(false);
  };

  const fetchLiderancas = async () => {
    if (!tenantId) return;
    const { data } = await supabase
      .from("liderancas")
      .select("id, name, avatar_url, img, cidade_principal, cargo, email, whatsapp, telegram_username")
      .eq("tenant_id", tenantId);
    if (data) {
      const sorted = [...data].sort((a, b) =>
        (a.name || "").localeCompare(b.name || "", "pt-BR", { sensitivity: "base" })
      );
      setLiderancas(sorted as any);
    }
  };

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const s = search.toLowerCase();
    return users.filter(u =>
      u.full_name.toLowerCase().includes(s) ||
      u.email.toLowerCase().includes(s) ||
      (u.cities || []).some(c => c.toLowerCase().includes(s))
    );
  }, [users, search]);

  const resetForm = () => {
    setForm({
      full_name: "", email: "", password: "", password_confirm: "",
      cpf: "", username: "", whatsapp: "", telegram_username: "",
      role: "secretario", lideranca_id: null, cities: [], citiesInput: "",
    });
    setLinkedLideranca(null);
  };

  const openCreate = () => {
    setEditUser(null);
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (user: any) => {
    setEditUser(user);
    const linked = liderancas.find(l => l.id === user.lideranca_id) || null;
    setLinkedLideranca(linked);
    setForm({
      full_name: user.full_name,
      email: user.email,
      password: "", password_confirm: "",
      cpf: user.cpf ? maskCPF(user.cpf) : "",
      username: user.username || "",
      whatsapp: user.whatsapp ? maskWhatsApp(user.whatsapp) : "",
      telegram_username: user.telegram_username || "",
      role: user.role,
      lideranca_id: user.lideranca_id,
      cities: user.cities || [],
      citiesInput: (user.cities || []).join(", "),
    });
    setDialogOpen(true);
  };

  const linkLideranca = (l: Lideranca) => {
    setLinkedLideranca(l);
    setForm(f => ({
      ...f,
      lideranca_id: l.id,
      // Autofill (only fill if empty so user-entered data is respected)
      full_name: f.full_name || l.name,
      email: f.email || l.email || "",
      whatsapp: f.whatsapp || (l.whatsapp ? maskWhatsApp(l.whatsapp) : ""),
      telegram_username: f.telegram_username || (l.telegram_username || ""),
      cities: [l.cidade_principal],
      citiesInput: l.cidade_principal,
      role: "lideranca",
    }));
    setComboOpen(false);
    toast.success(`Vinculado a ${l.name} — campos preenchidos automaticamente`);
  };

  const unlinkLideranca = () => {
    setLinkedLideranca(null);
    setForm(f => ({ ...f, lideranca_id: null }));
  };

  const handleSave = async () => {
    if (!form.full_name.trim()) return toast.error("Nome é obrigatório");
    if (!form.email.trim()) return toast.error("Email é obrigatório");
    const cpfDigits = onlyDigits(form.cpf);
    if (!cpfDigits || cpfDigits.length !== 11) return toast.error("CPF é obrigatório (11 dígitos)");
    if (!form.username.trim()) return toast.error("Username é obrigatório");
    if (!/^[a-zA-Z0-9_.]+$/.test(form.username)) return toast.error("Username deve conter apenas letras, números, '_' ou '.'");
    if (!onlyDigits(form.whatsapp)) return toast.error("WhatsApp é obrigatório");
    if (!editUser) {
      if (!form.password || form.password.length < 6) return toast.error("Senha deve ter no mínimo 6 caracteres");
      if (form.password !== form.password_confirm) return toast.error("Senhas não conferem");
    }

    setSaving(true);
    const cities = form.citiesInput.split(",").map(c => c.trim()).filter(Boolean);
    const profilePayload: any = {
      full_name: form.full_name.trim(),
      role: form.role,
      lideranca_id: form.lideranca_id,
      cities,
      tenant_id: tenantId,
      cpf: cpfDigits,
      username: form.username.trim(),
      whatsapp: onlyDigits(form.whatsapp),
      telegram_username: form.telegram_username.trim() || null,
      updated_at: new Date().toISOString(),
    };

    if (editUser) {
      const { error } = await supabase.from("profiles").update(profilePayload).eq("id", editUser.id);
      if (error) {
        toast.error("Erro ao atualizar: " + error.message);
      } else {
        await supabase.from("user_roles").delete().eq("user_id", editUser.id);
        await supabase.from("user_roles").insert({ user_id: editUser.id, role: form.role } as any);
        toast.success("Usuário atualizado!");
        fetchUsers();
        setDialogOpen(false);
      }
    } else {
      // Pre-check uniqueness of CPF and username (UI feedback; DB index also enforces it)
      const { data: dup } = await supabase.from("profiles")
        .select("id, cpf, username")
        .or(`cpf.eq.${cpfDigits},username.ilike.${form.username.trim()}`);
      if (dup && dup.length > 0) {
        setSaving(false);
        return toast.error("CPF ou username já está em uso");
      }

      const { data, error } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: {
          data: { full_name: form.full_name.trim() },
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) {
        toast.error("Erro ao criar: " + error.message);
      } else if (data.user) {
        await supabase.from("profiles").update({
          ...profilePayload,
          avatar_url: linkedLideranca?.avatar_url || linkedLideranca?.img || null,
        }).eq("id", data.user.id);
        await supabase.from("user_roles").insert({ user_id: data.user.id, role: form.role } as any);
        toast.success("Usuário criado! Email de confirmação enviado.");
        fetchUsers();
        setDialogOpen(false);
      }
    }
    setSaving(false);
  };

  const handleDeactivate = async () => {
    if (!deactivateUser) return;
    await supabase.from("profiles").update({
      is_active: !deactivateUser.is_active,
      updated_at: new Date().toISOString(),
    } as any).eq("id", deactivateUser.id);
    toast.success(deactivateUser.is_active ? "Usuário desativado" : "Usuário reativado");
    setDeactivateUser(null);
    fetchUsers();
  };

  const getLiderancaForUser = (user: Profile) => liderancas.find(l => l.id === user.lideranca_id);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." className="pl-9" />
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button variant="outline" onClick={() => setPermissionsOpen(true)} className="gap-2">
              <ShieldCheck className="h-4 w-4" /> Permissões por Tipo
            </Button>
          )}
          <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Novo Usuário</Button>
        </div>
      </div>

      <RolePermissionsDialog open={permissionsOpen} onOpenChange={setPermissionsOpen} />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Vínculo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum usuário</TableCell></TableRow>
              ) : filteredUsers.map(user => {
                const linked = getLiderancaForUser(user);
                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          {(user.avatar_url || linked?.avatar_url || linked?.img) ? (
                            <AvatarImage src={user.avatar_url || linked?.avatar_url || linked?.img || ""} />
                          ) : null}
                          <AvatarFallback className="text-xs">{getInitials(user.full_name)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-sm">{user.full_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                    <TableCell><Badge className={`text-xs ${ROLE_COLORS[user.role]}`}>{ROLE_LABELS[user.role]}</Badge></TableCell>
                    <TableCell>
                      {linked ? (
                        <div className="flex items-center gap-1 text-xs text-primary"><Link2 className="h-3 w-3" />{linked.name}</div>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell><Badge variant={user.is_active ? "default" : "secondary"} className="text-xs">{user.is_active ? "Ativo" : "Inativo"}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(user)}>Editar</Button>
                        <Button variant="ghost" size="sm" className={user.is_active ? "text-destructive" : "text-primary"} onClick={() => setDeactivateUser(user)}>
                          {user.is_active ? "Desativar" : "Reativar"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              {editUser ? "Editar Usuário" : "Novo Usuário"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Vincular a uma liderança existente */}
            <div>
              <Label>Vincular a uma Liderança existente</Label>
              <Popover open={comboOpen} onOpenChange={setComboOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between font-normal"
                    disabled={!!editUser}
                  >
                    {linkedLideranca ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={linkedLideranca.avatar_url || linkedLideranca.img} />
                          <AvatarFallback className="text-[10px]">{getInitials(linkedLideranca.name)}</AvatarFallback>
                        </Avatar>
                        <span className="truncate">{linkedLideranca.name}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Buscar liderança... (ex: Dougl...)</span>
                    )}
                    <ChevronsUpDown className="h-4 w-4 opacity-50 ml-2 shrink-0" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command filter={(value, search) => {
                    const s = search.toLowerCase();
                    return value.toLowerCase().includes(s) ? 1 : 0;
                  }}>
                    <CommandInput placeholder="Digite o nome..." />
                    <CommandList>
                      <CommandEmpty>Nenhuma liderança encontrada</CommandEmpty>
                      <CommandGroup>
                        {liderancas.map(l => (
                          <CommandItem
                            key={l.id}
                            value={`${l.name} ${l.cargo} ${l.cidade_principal}`}
                            onSelect={() => linkLideranca(l)}
                          >
                            <Avatar className="h-6 w-6 mr-2">
                              <AvatarImage src={l.avatar_url || l.img} />
                              <AvatarFallback className="text-[10px]">{getInitials(l.name)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{l.name}</p>
                              <p className="text-[11px] text-muted-foreground truncate">{l.cargo} • {l.cidade_principal}</p>
                            </div>
                            <Check className={cn("h-4 w-4 ml-2", linkedLideranca?.id === l.id ? "opacity-100" : "opacity-0")} />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {linkedLideranca && (
                <div className="flex items-center gap-2 p-2 mt-2 bg-primary/5 rounded-md border border-primary/20">
                  <Link2 className="h-4 w-4 text-primary shrink-0" />
                  <p className="text-xs text-primary flex-1">
                    Dados de <strong>{linkedLideranca.name}</strong> preenchidos automaticamente. Você pode editar.
                  </p>
                  <Button variant="ghost" size="sm" onClick={unlinkLideranca} className="h-6 px-2 text-xs">
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Nome completo *</Label>
                <Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
              </div>
              <div>
                <Label>CPF *</Label>
                <Input value={form.cpf} onChange={e => setForm(f => ({ ...f, cpf: maskCPF(e.target.value) }))} placeholder="000.000.000-00" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Email *</Label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} disabled={!!editUser} />
              </div>
              <div>
                <Label>Username (login) *</Label>
                <Input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value.replace(/\s/g, "") }))} placeholder="ex: douglas.biasi" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>WhatsApp *</Label>
                <Input value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: maskWhatsApp(e.target.value) }))} placeholder="(00) 00000-0000" />
              </div>
              <div>
                <Label>Telegram (@usuario)</Label>
                <Input value={form.telegram_username} onChange={e => setForm(f => ({ ...f, telegram_username: e.target.value.replace(/^@/, "") }))} placeholder="usuario" />
              </div>
            </div>

            {!editUser && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Senha *</Label>
                  <div className="relative">
                    <Input type={showPassword ? "text" : "password"} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Mínimo 6" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label>Confirmar senha *</Label>
                  <Input type={showPassword ? "text" : "password"} value={form.password_confirm} onChange={e => setForm(f => ({ ...f, password_confirm: e.target.value }))} />
                </div>
              </div>
            )}

            <div>
              <Label>Tipo de usuário *</Label>
              <select
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value as AppRole }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="deputado">Deputado (Admin)</option>
                <option value="chefe_gabinete">Chefe de Gabinete (Admin)</option>
                <option value="secretario">Secretário (Operador)</option>
                <option value="lideranca">Liderança (acesso restrito)</option>
              </select>
            </div>

            <div>
              <Label>Cidades vinculadas</Label>
              <Input value={form.citiesInput} onChange={e => setForm(f => ({ ...f, citiesInput: e.target.value }))} placeholder="Santos, Guarujá" />
              <p className="text-xs text-muted-foreground mt-1">Separe por vírgula</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : editUser ? "Salvar" : "Criar Usuário"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deactivateUser} onOpenChange={() => setDeactivateUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{deactivateUser?.is_active ? "Desativar usuário?" : "Reativar usuário?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {deactivateUser?.is_active
                ? `"${deactivateUser?.full_name}" não poderá mais acessar o sistema.`
                : `"${deactivateUser?.full_name}" voltará a ter acesso.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeactivate}>{deactivateUser?.is_active ? "Desativar" : "Reativar"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
