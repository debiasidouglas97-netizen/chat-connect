import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Landmark, Plus, ArrowUpRight } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const emendas = [
  { id: 1, cidade: "Uberlândia", valor: "R$ 2.500.000", status: "Liberada", tipo: "Saúde", ano: 2024 },
  { id: 2, cidade: "Uberaba", valor: "R$ 1.200.000", status: "Aprovada", tipo: "Educação", ano: 2024 },
  { id: 3, cidade: "Araguari", valor: "R$ 800.000", status: "Paga", tipo: "Infraestrutura", ano: 2024 },
  { id: 4, cidade: "Uberlândia", valor: "R$ 500.000", status: "Proposta", tipo: "Cultura", ano: 2025 },
  { id: 5, cidade: "Patrocínio", valor: "R$ 1.000.000", status: "Aprovada", tipo: "Saúde", ano: 2024 },
  { id: 6, cidade: "Ituiutaba", valor: "R$ 600.000", status: "Liberada", tipo: "Educação", ano: 2024 },
];

const statusColors: Record<string, string> = {
  Proposta: "bg-muted text-muted-foreground",
  Aprovada: "bg-info/10 text-info border-info/20",
  Liberada: "bg-warning/10 text-warning border-warning/20",
  Paga: "bg-success/10 text-success border-success/20",
};

export default function Emendas() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Emendas Parlamentares</h1>
          <p className="text-sm text-muted-foreground">Controle e acompanhamento de emendas</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> Nova Emenda
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {["Proposta", "Aprovada", "Liberada", "Paga"].map((s) => (
          <Card key={s}>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase">{s}</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {emendas.filter((e) => e.status === s).length}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cidade</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ano</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {emendas.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.cidade}</TableCell>
                  <TableCell>{e.tipo}</TableCell>
                  <TableCell className="font-semibold">{e.valor}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${statusColors[e.status]}`}>
                      {e.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{e.ano}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <ArrowUpRight className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
