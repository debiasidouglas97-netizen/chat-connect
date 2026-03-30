import React, { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Loader2, Eye, EyeOff, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface CamaraDeputado {
  id: number;
  nome: string;
  siglaPartido: string;
  siglaUf: string;
  urlFoto: string;
  email?: string;
}

export default function AdminDeputados() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  // Form
  const [camaraSearch, setCamaraSearch] = useState("");
  const [camaraResults, setCamaraResults] = useState<CamaraDeputado[]>([]);
  const [searchingCamara, setSearchingCamara] = useState(false);
  const [selectedDeputado, setSelectedDeputado] = useState<CamaraDeputado | null>(null);
  const [formExtra, setFormExtra] = useState({
    email_acesso: "",
    senha: "",
    cpf: "",
    telefone: "",
    data_nascimento: "",
    endereco_cep: "",
    endereco_rua: "",
    endereco_numero: "",
    endereco_bairro: "",
    endereco_cidade: "",
    endereco_estado: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ["admin-tenants"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenants").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return tenants;
    const s = search.toLowerCase();
    return tenants.filter((t: any) =>
      t.nome?.toLowerCase().includes(s) ||
      t.nome_parlamentar?.toLowerCase().includes(s) ||
      t.partido?.toLowerCase().includes(s) ||
      t.estado?.toLowerCase().includes(s)
    );
  }, [tenants, search]);

  // Debounced search
  const searchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const searchCamara = async (query: string) => {
    if (query.length < 3) {
      setCamaraResults([]);
      setSearchingCamara(false);
      return;
    }
    setSearchingCamara(true);
    try {
      const res = await fetch(
        `https://dadosabertos.camara.leg.br/api/v2/deputados?nome=${encodeURIComponent(query)}&ordem=ASC&ordenarPor=nome`
      );
      const json = await res.json();
      setCamaraResults(
        (json.dados || []).map((d: any) => ({
          id: d.id,
          nome: d.nome,
          siglaPartido: d.siglaPartido,
          siglaUf: d.siglaUf,
          urlFoto: d.urlFoto,
          email: d.email,
        }))
      );
    } catch (e) {
      toast.error("Erro ao buscar na API da Câmara");
    }
    setSearchingCamara(false);
  };

  const handleCamaraSearchChange = (value: string) => {
    setCamaraSearch(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (value.length >= 3) {
      searchTimeoutRef.current = setTimeout(() => searchCamara(value), 400);
    } else {
      setCamaraResults([]);
    }
  };

  const selectDeputado = async (dep: CamaraDeputado) => {
    setSelectedDeputado(dep);
    setCamaraResults([]);
    // Fetch full details
    try {
      const res = await fetch(`https://dadosabertos.camara.leg.br/api/v2/deputados/${dep.id}`);
      const json = await res.json();
      const d = json.dados;
      setFormExtra((f) => ({
        ...f,
        email_acesso: d.ultimoStatus?.gabinete?.email || dep.email || "",
        data_nascimento: d.dataNascimento || "",
      }));
    } catch {
      // keep what we have
    }
  };

  const handleSave = async () => {
    if (!selectedDeputado) {
      toast.error("Selecione um deputado da API da Câmara");
      return;
    }
    if (!formExtra.email_acesso.trim()) {
      toast.error("Email de acesso é obrigatório");
      return;
    }
    if (!formExtra.senha || formExtra.senha.length < 6) {
      toast.error("Senha deve ter no mínimo 6 caracteres");
      return;
    }

    setSaving(true);
    try {
      // 1. Create tenant
      const { data: tenant, error: tenantErr } = await supabase.from("tenants").insert({
        camara_deputado_id: selectedDeputado.id,
        nome: selectedDeputado.nome,
        nome_parlamentar: selectedDeputado.nome,
        partido: selectedDeputado.siglaPartido,
        estado: selectedDeputado.siglaUf,
        email: formExtra.email_acesso,
        cpf: formExtra.cpf || null,
        data_nascimento: formExtra.data_nascimento || null,
        telefone: formExtra.telefone || null,
        foto_url: selectedDeputado.urlFoto,
        endereco_cep: formExtra.endereco_cep || null,
        endereco_rua: formExtra.endereco_rua || null,
        endereco_numero: formExtra.endereco_numero || null,
        endereco_bairro: formExtra.endereco_bairro || null,
        endereco_cidade: formExtra.endereco_cidade || null,
        endereco_estado: formExtra.endereco_estado || null,
      } as any).select().single();

      if (tenantErr) throw tenantErr;
      const tenantData = tenant as any;

      // 2. Create user via Supabase Auth
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: formExtra.email_acesso,
        password: formExtra.senha,
        options: {
          data: { full_name: selectedDeputado.nome },
          emailRedirectTo: window.location.origin,
        },
      });
      if (authErr) throw authErr;

      if (authData.user) {
        // 3. Update profile with tenant_id and role
        await supabase.from("profiles").update({
          tenant_id: tenantData.id,
          role: "deputado",
          avatar_url: selectedDeputado.urlFoto,
        } as any).eq("id", authData.user.id);

        // 4. Add role
        await supabase.from("user_roles").insert({
          user_id: authData.user.id,
          role: "deputado",
        } as any);

        // 5. Create deputy_profile for this tenant
        await supabase.from("deputy_profile").insert({
          full_name: selectedDeputado.nome,
          party: selectedDeputado.siglaPartido,
          state: selectedDeputado.siglaUf,
          avatar_url: selectedDeputado.urlFoto,
          tenant_id: tenantData.id,
        } as any);
      }

      toast.success("Deputado cadastrado! Email de confirmação enviado.");
      queryClient.invalidateQueries({ queryKey: ["admin-tenants"] });
      setDialogOpen(false);
      resetForm();
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    }
    setSaving(false);
  };

  const handleToggleStatus = async (tenant: any) => {
    const newStatus = tenant.status === "ativo" ? "inativo" : "ativo";
    await supabase.from("tenants").update({ status: newStatus, updated_at: new Date().toISOString() } as any).eq("id", tenant.id);
    toast.success(newStatus === "ativo" ? "Deputado reativado" : "Deputado desativado");
    queryClient.invalidateQueries({ queryKey: ["admin-tenants"] });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("tenants").delete().eq("id", deleteTarget.id);
    if (error) {
      toast.error("Erro ao excluir: " + error.message);
    } else {
      toast.success("Deputado e todos os dados removidos");
      queryClient.invalidateQueries({ queryKey: ["admin-tenants"] });
    }
    setDeleteTarget(null);
  };

  const resetForm = () => {
    setCamaraSearch("");
    setCamaraResults([]);
    setSelectedDeputado(null);
    setFormExtra({
      email_acesso: "", senha: "", cpf: "", telefone: "", data_nascimento: "",
      endereco_cep: "", endereco_rua: "", endereco_numero: "",
      endereco_bairro: "", endereco_cidade: "", endereco_estado: "",
    });
  };

  const fetchCep = async (cep: string) => {
    const clean = cep.replace(/\D/g, "");
    if (clean.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setFormExtra((f) => ({
          ...f,
          endereco_rua: data.logradouro || "",
          endereco_bairro: data.bairro || "",
          endereco_cidade: data.localidade || "",
          endereco_estado: data.uf || "",
        }));
      }
    } catch {}
  };

  return (
    <div className="space-y-4 max-w-6xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Deputados</h1>
          <p className="text-sm text-muted-foreground">Gerencie os deputados da plataforma</p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> Novo Deputado
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar deputado..." className="pl-9" />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Deputado</TableHead>
                <TableHead>Partido</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum deputado cadastrado</TableCell></TableRow>
              ) : filtered.map((t: any) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {t.foto_url ? (
                        <img src={t.foto_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                          {(t.nome || "?")[0]}
                        </div>
                      )}
                      <span className="font-medium text-sm">{t.nome_parlamentar || t.nome}</span>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline">{t.partido}</Badge></TableCell>
                  <TableCell className="text-sm">{t.estado}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{t.email}</TableCell>
                  <TableCell>
                    <Badge variant={t.status === "ativo" ? "default" : "secondary"}>
                      {t.status === "ativo" ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleToggleStatus(t)}>
                        {t.status === "ativo" ? "Desativar" : "Ativar"}
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleteTarget(t)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Deputado</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* API Câmara search with autocomplete */}
            <div className="relative">
              <Label>Buscar Deputado (API da Câmara)</Label>
              <div className="relative">
                <Input
                  value={camaraSearch}
                  onChange={(e) => handleCamaraSearchChange(e.target.value)}
                  placeholder="Digite o nome do deputado..."
                  className="pr-10"
                />
                {searchingCamara && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
              {camaraSearch.length > 0 && camaraSearch.length < 3 && (
                <p className="text-xs text-muted-foreground mt-1">Digite ao menos 3 caracteres para buscar</p>
              )}
            </div>

            {/* Search results */}
            {camaraResults.length > 0 && (
              <div className="border rounded-md max-h-60 overflow-y-auto">
                {camaraResults.map((dep) => (
                  <button
                    key={dep.id}
                    className="w-full flex items-center gap-3 p-3 hover:bg-accent text-left border-b last:border-b-0"
                    onClick={() => selectDeputado(dep)}
                  >
                    <img src={dep.urlFoto} alt="" className="h-10 w-10 rounded-full object-cover" />
                    <div>
                      <p className="font-medium text-sm">{dep.nome}</p>
                      <p className="text-xs text-muted-foreground">{dep.siglaPartido} — {dep.siglaUf}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Selected deputado */}
            {selectedDeputado && (
              <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <img src={selectedDeputado.urlFoto} alt="" className="h-12 w-12 rounded-full object-cover" />
                <div>
                  <p className="font-semibold">{selectedDeputado.nome}</p>
                  <p className="text-sm text-muted-foreground">{selectedDeputado.siglaPartido} — {selectedDeputado.siglaUf}</p>
                  <p className="text-xs text-muted-foreground">ID Câmara: {selectedDeputado.id}</p>
                </div>
              </div>
            )}

            {selectedDeputado && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Email de acesso *</Label>
                    <Input
                      type="email"
                      value={formExtra.email_acesso}
                      onChange={(e) => setFormExtra((f) => ({ ...f, email_acesso: e.target.value }))}
                      placeholder="email@exemplo.com"
                    />
                  </div>
                  <div>
                    <Label>Senha inicial *</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={formExtra.senha}
                        onChange={(e) => setFormExtra((f) => ({ ...f, senha: e.target.value }))}
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
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>CPF</Label>
                    <Input
                      value={formExtra.cpf}
                      onChange={(e) => setFormExtra((f) => ({ ...f, cpf: e.target.value }))}
                      placeholder="000.000.000-00"
                    />
                  </div>
                  <div>
                    <Label>Telefone</Label>
                    <Input
                      value={formExtra.telefone}
                      onChange={(e) => setFormExtra((f) => ({ ...f, telefone: e.target.value }))}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                </div>

                <div>
                  <Label>Data de nascimento</Label>
                  <Input
                    type="date"
                    value={formExtra.data_nascimento}
                    onChange={(e) => setFormExtra((f) => ({ ...f, data_nascimento: e.target.value }))}
                  />
                </div>

                <div>
                  <Label>CEP</Label>
                  <Input
                    value={formExtra.endereco_cep}
                    onChange={(e) => {
                      const v = e.target.value;
                      setFormExtra((f) => ({ ...f, endereco_cep: v }));
                      if (v.replace(/\D/g, "").length === 8) fetchCep(v);
                    }}
                    placeholder="00000-000"
                  />
                </div>

                {formExtra.endereco_rua && (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                      <Label>Rua</Label>
                      <Input value={formExtra.endereco_rua} onChange={(e) => setFormExtra((f) => ({ ...f, endereco_rua: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Número</Label>
                      <Input value={formExtra.endereco_numero} onChange={(e) => setFormExtra((f) => ({ ...f, endereco_numero: e.target.value }))} />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !selectedDeputado}>
              {saving ? "Criando..." : "Cadastrar Deputado"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir deputado?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os dados de "{deleteTarget?.nome}" (demandas, lideranças, cidades, emendas, eventos) serão permanentemente removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
