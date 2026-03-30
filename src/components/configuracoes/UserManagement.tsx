import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Plus, Search, UserCheck, AlertTriangle, Link2, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { AppRole, Profile } from "@/hooks/use-auth";
import { getInitials } from "@/hooks/use-auth";
import { useTenant } from "@/hooks/use-tenant";

interface Lideranca {
  id: string;
  name: string;
  avatar_url: string | null;
  img: string;
  cidade_principal: string;
  cargo: string;
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


export default function UserManagement() {
  const { tenantId } = useTenant();
  const [users, setUsers] = useState<Profile[]>([]);
  const [liderancas, setLiderancas] = useState<Lideranca[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState<Profile | null>(null);
  const [deactivateUser, setDeactivateUser] = useState<Profile | null>(null);

  // Form state
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "lideranca" as AppRole,
    lideranca_id: null as string | null,
    cities: [] as string[],
    citiesInput: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [liderancaSearch, setLiderancaSearch] = useState("");
  const [showLiderancaSuggestions, setShowLiderancaSuggestions] = useState(false);
  const [linkedLideranca, setLinkedLideranca] = useState<Lideranca | null>(null);
  const [showLinkAlert, setShowLinkAlert] = useState(false);
  const [suggestedLideranca, setSuggestedLideranca] = useState<Lideranca | null>(null);

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
      .order("created_at", { ascending: false });
    if (data) setUsers(data as unknown as Profile[]);
    setLoading(false);
  };

  const fetchLiderancas = async () => {
    if (!tenantId) return;
    const { data } = await supabase
      .from("liderancas")
      .select("id, name, avatar_url, img, cidade_principal, cargo")
      .eq("tenant_id", tenantId);
    if (data) setLiderancas(data);
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

  const filteredLiderancas = useMemo(() => {
    if (!liderancaSearch.trim()) return [];
    const s = liderancaSearch.toLowerCase();
    return liderancas.filter(l => l.name.toLowerCase().includes(s)).slice(0, 5);
  }, [liderancas, liderancaSearch]);

  const openCreate = () => {
    setEditUser(null);
    setForm({ full_name: "", email: "", password: "", role: "lideranca", lideranca_id: null, cities: [], citiesInput: "" });
    setLinkedLideranca(null);
    setLiderancaSearch("");
    setDialogOpen(true);
  };

  const openEdit = (user: Profile) => {
    setEditUser(user);
    const linked = liderancas.find(l => l.id === user.lideranca_id) || null;
    setLinkedLideranca(linked);
    setLiderancaSearch(linked?.name || "");
    setForm({
      full_name: user.full_name,
      email: user.email,
      password: "",
      role: user.role,
      lideranca_id: user.lideranca_id,
      cities: user.cities || [],
      citiesInput: (user.cities || []).join(", "),
    });
    setDialogOpen(true);
  };

  const handleNameChange = (name: string) => {
    setForm(f => ({ ...f, full_name: name }));
    setLiderancaSearch(name);
    setShowLiderancaSuggestions(true);

    // Check for similar names
    if (!editUser && name.length >= 3) {
      const similar = liderancas.find(l =>
        l.name.toLowerCase().includes(name.toLowerCase()) ||
        name.toLowerCase().includes(l.name.toLowerCase())
      );
      if (similar && !form.lideranca_id) {
        setSuggestedLideranca(similar);
        setShowLinkAlert(true);
      }
    }
  };

  const linkLideranca = (l: Lideranca) => {
    setLinkedLideranca(l);
    setForm(f => ({
      ...f,
      full_name: l.name,
      lideranca_id: l.id,
      cities: [l.cidade_principal],
      citiesInput: l.cidade_principal,
    }));
    setLiderancaSearch(l.name);
    setShowLiderancaSuggestions(false);
    toast.success(`Vinculado à liderança ${l.name}`);
  };

  const unlinkLideranca = () => {
    setLinkedLideranca(null);
    setForm(f => ({ ...f, lideranca_id: null }));
  };

  const handleSave = async () => {
    if (!form.full_name.trim()) { toast.error("Nome é obrigatório"); return; }
    if (!form.email.trim()) { toast.error("Email é obrigatório"); return; }
    if (!editUser && !form.password) { toast.error("Senha é obrigatória"); return; }
    if (!editUser && form.password.length < 6) { toast.error("Senha deve ter no mínimo 6 caracteres"); return; }

    setSaving(true);
    const cities = form.citiesInput.split(",").map(c => c.trim()).filter(Boolean);

    if (editUser) {
      // Update profile
      const { error } = await supabase.from("profiles").update({
        full_name: form.full_name.trim(),
        role: form.role,
        lideranca_id: form.lideranca_id,
        cities,
        updated_at: new Date().toISOString(),
      } as any).eq("id", editUser.id);

      if (error) {
        toast.error("Erro ao atualizar: " + error.message);
      } else {
        // Update role in user_roles
        await supabase.from("user_roles").delete().eq("user_id", editUser.id);
        await supabase.from("user_roles").insert({ user_id: editUser.id, role: form.role } as any);
        toast.success("Usuário atualizado!");
        fetchUsers();
      }
    } else {
      // Create user via Supabase Auth
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
        // Update profile with role and link
        await supabase.from("profiles").update({
          role: form.role,
          lideranca_id: form.lideranca_id,
          cities,
          avatar_url: linkedLideranca?.avatar_url || linkedLideranca?.img || null,
        } as any).eq("id", data.user.id);

        // Insert role
        await supabase.from("user_roles").insert({ user_id: data.user.id, role: form.role } as any);

        toast.success("Usuário criado! Um email de confirmação foi enviado.");
        fetchUsers();
      }
    }

    setSaving(false);
    setDialogOpen(false);
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

  const getLiderancaForUser = (user: Profile) => {
    return liderancas.find(l => l.id === user.lideranca_id);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, email ou cidade..."
            className="pl-9"
          />
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Novo Usuário
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Vínculo</TableHead>
                <TableHead>Cidades</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum usuário encontrado</TableCell>
                </TableRow>
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
                    <TableCell>
                      <Badge className={`text-xs ${ROLE_COLORS[user.role]}`}>
                        {ROLE_LABELS[user.role]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {linked ? (
                        <div className="flex items-center gap-1 text-xs text-primary">
                          <Link2 className="h-3 w-3" />
                          {linked.name}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(user.cities || []).slice(0, 2).map(c => (
                          <Badge key={c} variant="outline" className="text-xs">{c}</Badge>
                        ))}
                        {(user.cities || []).length > 2 && (
                          <Badge variant="outline" className="text-xs">+{(user.cities || []).length - 2}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.is_active ? "default" : "secondary"} className="text-xs">
                        {user.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(user)}>Editar</Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={user.is_active ? "text-destructive" : "text-primary"}
                          onClick={() => setDeactivateUser(user)}
                        >
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
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              {editUser ? "Editar Usuário" : "Novo Usuário"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Name with smart search */}
            <div className="relative">
              <Label>Nome completo *</Label>
              <Input
                value={form.full_name}
                onChange={e => handleNameChange(e.target.value)}
                onFocus={() => setShowLiderancaSuggestions(true)}
                onBlur={() => setTimeout(() => setShowLiderancaSuggestions(false), 200)}
                placeholder="Digite o nome..."
              />
              {/* Autocomplete dropdown */}
              {showLiderancaSuggestions && filteredLiderancas.length > 0 && !editUser && (
                <div className="absolute z-50 w-full mt-1 bg-card border rounded-md shadow-lg max-h-48 overflow-y-auto">
                  <div className="p-2 text-xs text-muted-foreground border-b">
                    <UserCheck className="h-3 w-3 inline mr-1" />
                    Lideranças encontradas:
                  </div>
                  {filteredLiderancas.map(l => (
                    <button
                      key={l.id}
                      className="w-full flex items-center gap-2 p-2 hover:bg-accent text-left text-sm"
                      onMouseDown={() => linkLideranca(l)}
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={l.avatar_url || l.img} />
                        <AvatarFallback className="text-xs">{getInitials(l.name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{l.name}</p>
                        <p className="text-xs text-muted-foreground">{l.cargo} • {l.cidade_principal}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Linked liderança badge */}
            {linkedLideranca && (
              <div className="flex items-center gap-2 p-2 bg-primary/5 rounded-md border border-primary/20">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={linkedLideranca.avatar_url || linkedLideranca.img} />
                  <AvatarFallback>{getInitials(linkedLideranca.name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-medium text-primary">Vinculado a: {linkedLideranca.name}</p>
                  <p className="text-xs text-muted-foreground">{linkedLideranca.cargo} • {linkedLideranca.cidade_principal}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={unlinkLideranca} className="text-destructive text-xs">
                  Desvincular
                </Button>
              </div>
            )}

            <div>
              <Label>Email *</Label>
              <Input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="email@exemplo.com"
                disabled={!!editUser}
              />
            </div>

            {!editUser && (
              <div>
                <Label>Senha *</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="Mínimo 6 caracteres"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            <div>
              <Label>Tipo de usuário *</Label>
              <select
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value as AppRole }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="deputado">Deputado</option>
                <option value="chefe_gabinete">Chefe de Gabinete</option>
                <option value="secretario">Secretário</option>
                <option value="lideranca">Liderança</option>
              </select>
            </div>

            <div>
              <Label>Cidades vinculadas</Label>
              <Input
                value={form.citiesInput}
                onChange={e => setForm(f => ({ ...f, citiesInput: e.target.value }))}
                placeholder="Santos, Guarujá, Praia Grande"
                disabled={form.role === "lideranca" && !!linkedLideranca}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {form.role === "lideranca" && linkedLideranca
                  ? "Cidades herdadas da liderança vinculada"
                  : "Separe as cidades por vírgula"}
              </p>
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

      {/* Link alert */}
      <AlertDialog open={showLinkAlert} onOpenChange={setShowLinkAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Liderança encontrada
            </AlertDialogTitle>
            <AlertDialogDescription>
              Já existe uma liderança com nome semelhante: <strong>{suggestedLideranca?.name}</strong> ({suggestedLideranca?.cidade_principal}).
              Deseja vincular este usuário à liderança existente?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Criar novo</AlertDialogCancel>
            <AlertDialogAction onClick={() => suggestedLideranca && linkLideranca(suggestedLideranca)}>
              Vincular existente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Deactivate confirmation */}
      <AlertDialog open={!!deactivateUser} onOpenChange={() => setDeactivateUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deactivateUser?.is_active ? "Desativar usuário?" : "Reativar usuário?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deactivateUser?.is_active
                ? `O usuário "${deactivateUser?.full_name}" não poderá mais acessar o sistema, mas seus dados serão mantidos.`
                : `O usuário "${deactivateUser?.full_name}" voltará a ter acesso ao sistema.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeactivate}>
              {deactivateUser?.is_active ? "Desativar" : "Reativar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
