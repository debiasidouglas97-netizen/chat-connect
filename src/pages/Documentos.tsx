import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Upload, Image, File, Download } from "lucide-react";

const documentos = [
  { name: "Ofício 234/2024 — Prefeitura Uberlândia", tipo: "PDF", vinculo: "Demanda #12", data: "15 Mar 2024", size: "245 KB" },
  { name: "Foto inauguração escola Araguari", tipo: "Imagem", vinculo: "Liderança — Maria Oliveira", data: "10 Mar 2024", size: "1.2 MB" },
  { name: "Planilha emendas 2024", tipo: "PDF", vinculo: "Emenda #5", data: "05 Mar 2024", size: "89 KB" },
  { name: "Ata reunião saneamento Patrocínio", tipo: "PDF", vinculo: "Demanda #8", data: "01 Mar 2024", size: "156 KB" },
];

export default function Documentos() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Documentos</h1>
          <p className="text-sm text-muted-foreground">Arquivos vinculados a demandas, lideranças e emendas</p>
        </div>
        <Button className="gap-2">
          <Upload className="h-4 w-4" /> Upload
        </Button>
      </div>

      <div className="space-y-3">
        {documentos.map((doc, i) => (
          <Card key={i} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                {doc.tipo === "Imagem" ? <Image className="h-5 w-5 text-primary" /> : <FileText className="h-5 w-5 text-primary" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{doc.name}</p>
                <div className="flex items-center gap-3 mt-1">
                  <Badge variant="secondary" className="text-[10px]">{doc.vinculo}</Badge>
                  <span className="text-[10px] text-muted-foreground">{doc.data}</span>
                  <span className="text-[10px] text-muted-foreground">{doc.size}</span>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <Download className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
