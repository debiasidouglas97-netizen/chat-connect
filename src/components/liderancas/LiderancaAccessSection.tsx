import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ShieldCheck, KeyRound, AtSign, User as UserIcon, AlertTriangle, Eye, EyeOff, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  liderancaId: string;
  liderancaName: string;
  liderancaEmail: string | null;
  /** Disparado quando um acesso é criado (para refresh externo). */
  onAccessCreated?: () => void;
}

interface LinkedProfile {
  id: string;
  email: string;
  username: string | null;
  is_active: boolean;
}

function maskCPF(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

export default function LiderancaAccessSection({ liderancaId, liderancaName, liderancaEmail, onAccessCreated }: Props) {
  const [profile, setProfile] = useState<LinkedProfile | null | undefined>(undefined); // undefined = loading
  const [resetOpen, setResetOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // Reset password form
  const [newPwd, setNewPwd] = useState("");
  const [newPwdConfirm, setNewPwdConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  // Create access form
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const fetchProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, email, username, is_active")
      .eq("lideranca_id", liderancaId)
      .maybeSingle();
    setProfile((data as any) ?? null);
  };

  useEffect(() => {
    setProfile(undefined);
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liderancaId]);

  // Pré-preencher email do "create access" com o email da liderança
  useEffect(() => {
    if (createOpen && liderancaEmail) setEmail(liderancaEmail);
  }, [createOpen, liderancaEmail]);

  const handleResetPassword = async () => {
    if (newPwd.length < 8) { toast.error("Senha mínima de 8 caracteres"); return; }
    if (newPwd !== newPwdConfirm) { toast.error("Senhas não conferem"); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("reset-lideranca-password", {
        body: { liderancaId, newPassword: newPwd },
      });
      if (error || (data as any)?.error) {
        toast.error((data as any)?.error || error?.message || "Erro ao resetar senha");
        return;
      }
      toast.success("Senha atualizada com sucesso!");
      setResetOpen(false);
      setNewPwd(""); setNewPwdConfirm("");
    } finally {
      setBusy(false);
    }
  };

  const handleToggleActive = async () => {
    if (!profile) return;
    const newState = !profile.is_active;
    const { error } = await supabase
      .from("profiles")
      .update({ is_active: newState, updated_at: new Date().toISOString() } as any)
      .eq("id", profile.id);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success(newState ? "Acesso reativado" : "Acesso desativado");
    fetchProfile();
  };

  const handleCreateAccess = async () => {
    if (!email.includes("@")) { toast.error("E-mail inválido"); return; }
    const cpfDigits = cpf.replace(/\D/g, "");
    if (cpfDigits.length !== 11) { toast.error("CPF deve ter 11 dígitos"); return; }
    if (!/^[a-zA-Z0-9_.]{3,}$/.test(username)) { toast.error("Username inválido"); return; }
    if (password.length < 8) { toast.error("Senha mínima de 8 caracteres"); return; }
    if (password !== passwordConfirm) { toast.error("Senhas não conferem"); return; }

    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-lideranca-user", {
        body: {
          mode: "link",
          liderancaId,
          email: email.trim().toLowerCase(),
          cpf: cpfDigits,
          username: username.trim(),
          password,
        },
      });
      if (error || (data as any)?.error) {
        toast.error((data as any)?.error || error?.message || "Erro ao criar acesso");
        return;
      }
      toast.success("Acesso criado! A liderança já pode entrar no sistema.");
      setCreateOpen(false);
      setEmail(""); setCpf(""); setUsername(""); setPassword(""); setPasswordConfirm("");
      fetchProfile();
      onAccessCreated?.();
    } finally {
      setBusy(false);
    }
  };

  if (profile === undefined) {
    return <div className="text-xs text-muted-foreground py-2">Carregando acesso...</div>;
  }

  // Sem usuário vinculado
  if (!profile) {
    return (
      <>
        <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 space-y-2">
          <div className="flex items-center gap-2 text-warning">
            <AlertTriangle className="h-4 w-4" />
            <p className="text-sm font-semibold">Sem acesso ao sistema</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Esta liderança ainda não tem login no sistema. Crie um acesso para que ela possa cadastrar eleitores e acompanhar o painel.
          </p>
          <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" /> Criar acesso ao sistema
          </Button>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" /> Criar acesso para {liderancaName}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
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
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs flex items-center gap-1"><KeyRound className="h-3 w-3" /> Senha *</Label>
                  <div className="relative">
                    <Input type={showPwd ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mín 8" />
                    <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPwd ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Confirmar *</Label>
                  <Input type={showPwd ? "text" : "password"} value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={busy}>Cancelar</Button>
              <Button onClick={handleCreateAccess} disabled={busy}>{busy ? "Criando..." : "Criar acesso"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Com usuário vinculado
  return (
    <>
      <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">Acesso ao sistema</p>
          </div>
          <Badge variant={profile.is_active ? "default" : "secondary"} className="text-[10px]">
            {profile.is_active ? "Ativo" : "Desativado"}
          </Badge>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <p className="flex items-center gap-1"><Mail className="h-3 w-3 text-muted-foreground" /> {profile.email}</p>
          <p className="flex items-center gap-1"><AtSign className="h-3 w-3 text-muted-foreground" /> {profile.username || "—"}</p>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Button size="sm" variant="outline" onClick={() => setResetOpen(true)} className="gap-1.5 h-7 text-xs">
            <KeyRound className="h-3 w-3" /> Resetar senha
          </Button>
          <Button
            size="sm"
            variant={profile.is_active ? "ghost" : "outline"}
            onClick={handleToggleActive}
            className="h-7 text-xs"
          >
            {profile.is_active ? "Desativar acesso" : "Reativar acesso"}
          </Button>
        </div>
      </div>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" /> Nova senha
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Nova senha *</Label>
              <div className="relative">
                <Input type={showPwd ? "text" : "password"} value={newPwd} onChange={(e) => setNewPwd(e.target.value)} placeholder="Mínimo 8 caracteres" />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPwd ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
            <div>
              <Label className="text-xs">Confirmar *</Label>
              <Input type={showPwd ? "text" : "password"} value={newPwdConfirm} onChange={(e) => setNewPwdConfirm(e.target.value)} />
            </div>
            <p className="text-[10px] text-muted-foreground">
              Informe a nova senha para a liderança usar no próximo login.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)} disabled={busy}>Cancelar</Button>
            <Button onClick={handleResetPassword} disabled={busy}>{busy ? "Salvando..." : "Atualizar senha"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
