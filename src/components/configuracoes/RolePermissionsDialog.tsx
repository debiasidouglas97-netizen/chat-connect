import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldCheck, RotateCcw, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { toast } from "sonner";
import {
  MODULES,
  ROLE_LABELS,
  defaultRowFor,
  type ConfigurableRole,
  type PermissionRow,
} from "@/lib/permissions-defaults";

type Matrix = Record<string, PermissionRow>;

const ROLES: ConfigurableRole[] = ["chefe_gabinete", "secretario", "lideranca"];
const ACTIONS: Array<{ key: keyof PermissionRow; label: string }> = [
  { key: "can_view", label: "Visualizar" },
  { key: "can_create", label: "Criar" },
  { key: "can_edit", label: "Editar" },
  { key: "can_delete", label: "Excluir" },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export default function RolePermissionsDialog({ open, onOpenChange }: Props) {
  const { tenantId } = useTenant();
  const [activeRole, setActiveRole] = useState<ConfigurableRole>("secretario");
  const [matrices, setMatrices] = useState<Record<ConfigurableRole, Matrix>>({
    chefe_gabinete: {},
    secretario: {},
    lideranca: {},
  });
  const [saving, setSaving] = useState(false);

  const buildDefault = (role: ConfigurableRole): Matrix => {
    const out: Matrix = {};
    for (const m of MODULES) out[m.key] = { ...defaultRowFor(role, m.key) };
    return out;
  };

  useEffect(() => {
    if (!open || !tenantId) return;
    (async () => {
      const { data } = await supabase
        .from("role_permissions" as any)
        .select("role, module, can_view, can_create, can_edit, can_delete")
        .eq("tenant_id", tenantId);
      const next: Record<ConfigurableRole, Matrix> = {
        chefe_gabinete: buildDefault("chefe_gabinete"),
        secretario: buildDefault("secretario"),
        lideranca: buildDefault("lideranca"),
      };
      (data || []).forEach((row: any) => {
        if (!ROLES.includes(row.role)) return;
        next[row.role as ConfigurableRole][row.module] = {
          can_view: row.can_view,
          can_create: row.can_create,
          can_edit: row.can_edit,
          can_delete: row.can_delete,
        };
      });
      setMatrices(next);
    })();
  }, [open, tenantId]);

  const toggle = (role: ConfigurableRole, moduleKey: string, action: keyof PermissionRow) => {
    setMatrices((prev) => {
      const row = prev[role][moduleKey] ?? defaultRowFor(role, moduleKey);
      const updated = { ...row, [action]: !row[action] };
      // If view is turned off, make all dependent actions also off (UX nicety)
      if (action === "can_view" && !updated.can_view) {
        updated.can_create = false;
        updated.can_edit = false;
        updated.can_delete = false;
      }
      // If create/edit/delete is turned on, ensure view is on too
      if (action !== "can_view" && updated[action]) {
        updated.can_view = true;
      }
      return { ...prev, [role]: { ...prev[role], [moduleKey]: updated } };
    });
  };

  const restoreDefaults = (role: ConfigurableRole) => {
    setMatrices((prev) => ({ ...prev, [role]: buildDefault(role) }));
    toast.info(`Padrões restaurados para ${ROLE_LABELS[role]} (não esqueça de salvar)`);
  };

  const handleSave = async () => {
    if (!tenantId) return;
    setSaving(true);
    const payload: any[] = [];
    for (const role of ROLES) {
      for (const m of MODULES) {
        const row = matrices[role][m.key] ?? defaultRowFor(role, m.key);
        payload.push({
          tenant_id: tenantId,
          role,
          module: m.key,
          can_view: row.can_view,
          can_create: row.can_create,
          can_edit: row.can_edit,
          can_delete: row.can_delete,
        });
      }
    }
    const { error } = await supabase
      .from("role_permissions" as any)
      .upsert(payload, { onConflict: "tenant_id,role,module" });
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    } else {
      toast.success("Permissões atualizadas!");
      onOpenChange(false);
    }
  };

  const currentMatrix = matrices[activeRole];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Permissões por Tipo de Usuário
          </DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground">
          Defina o que cada tipo de usuário pode <strong>visualizar</strong>, <strong>criar</strong>,{" "}
          <strong>editar</strong> e <strong>excluir</strong> em cada módulo do sistema. Deputado e
          Super Admin sempre têm acesso total.
        </p>

        <Tabs value={activeRole} onValueChange={(v) => setActiveRole(v as ConfigurableRole)}>
          <TabsList className="grid w-full grid-cols-3">
            {ROLES.map((r) => (
              <TabsTrigger key={r} value={r}>{ROLE_LABELS[r]}</TabsTrigger>
            ))}
          </TabsList>

          {ROLES.map((r) => (
            <TabsContent key={r} value={r} className="mt-3">
              <div className="flex justify-end mb-2">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => restoreDefaults(r)}>
                  <RotateCcw className="h-3.5 w-3.5" /> Restaurar padrão
                </Button>
              </div>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40%]">Módulo</TableHead>
                      {ACTIONS.map((a) => (
                        <TableHead key={a.key} className="text-center">{a.label}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {MODULES.map((m) => {
                      const row = matrices[r][m.key] ?? defaultRowFor(r, m.key);
                      return (
                        <TableRow key={m.key}>
                          <TableCell className="font-medium text-sm">{m.label}</TableCell>
                          {ACTIONS.map((a) => (
                            <TableCell key={a.key} className="text-center">
                              <Checkbox
                                checked={row[a.key]}
                                onCheckedChange={() => toggle(r, m.key, a.key)}
                              />
                            </TableCell>
                          ))}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          ))}
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-1.5">
            <Save className="h-4 w-4" /> {saving ? "Salvando..." : "Salvar permissões"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
