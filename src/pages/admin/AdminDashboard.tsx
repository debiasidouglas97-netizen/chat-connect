import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Building2, CheckCircle2, XCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function AdminDashboard() {
  const { data: tenants = [] } = useQuery({
    queryKey: ["admin-tenants"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenants").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const active = tenants.filter((t: any) => t.status === "ativo").length;
  const inactive = tenants.filter((t: any) => t.status === "inativo").length;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">Painel Super Admin</h1>
        <p className="text-muted-foreground text-sm">Gerencie todos os deputados da plataforma</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Total Deputados</p>
              <p className="text-2xl font-bold">{tenants.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-11 w-11 rounded-lg bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Ativos</p>
              <p className="text-2xl font-bold">{active}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-11 w-11 rounded-lg bg-destructive/10 flex items-center justify-center">
              <XCircle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Inativos</p>
              <p className="text-2xl font-bold">{inactive}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent tenants */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Deputados Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tenants.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum deputado cadastrado ainda. Acesse "Deputados" para cadastrar.
            </p>
          ) : (
            <div className="space-y-3">
              {tenants.slice(0, 5).map((t: any) => (
                <div key={t.id} className="flex items-center gap-4 p-3 rounded-lg border">
                  {t.foto_url ? (
                    <img src={t.foto_url} alt={t.nome} className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold">
                      {(t.nome || "?")[0]}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{t.nome_parlamentar || t.nome}</p>
                    <p className="text-xs text-muted-foreground">{t.partido} — {t.estado}</p>
                  </div>
                  <Badge variant={t.status === "ativo" ? "default" : "secondary"}>
                    {t.status === "ativo" ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
