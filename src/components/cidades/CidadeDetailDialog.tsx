import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MapPin, Users, FileText, Landmark, Phone, Vote } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLiderancas } from "@/hooks/use-liderancas";
import { useMemo } from "react";

interface CidadeDetailDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  cidade: {
    name: string;
    population: string;
    regiao: string;
    demandas: number;
    emendas: number;
    liderancas: number;
    eleitores2024?: number;
  } | null;
}

export default function CidadeDetailDialog({ open, onOpenChange, cidade }: CidadeDetailDialogProps) {
  const navigate = useNavigate();
  const { liderancas } = useLiderancas();

  const cityLiderancas = useMemo(() => {
    if (!cidade) return [];
    const cityName = cidade.name.split("/")[0].trim().toLowerCase();
    return liderancas.filter((l) => {
      const lCity = (l.cidadePrincipal || "").split("/")[0].trim().toLowerCase();
      return lCity === cityName;
    });
  }, [cidade, liderancas]);

  if (!cidade) return null;

  const handleLiderancaClick = (name: string) => {
    onOpenChange(false);
    navigate(`/liderancas?busca=${encodeURIComponent(name)}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <MapPin className="h-6 w-6 text-primary" />
            <div>
              <DialogTitle className="text-xl font-bold">{cidade.name}</DialogTitle>
              <p className="text-sm text-muted-foreground">{cidade.regiao}</p>
            </div>
          </div>
        </DialogHeader>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mt-2">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <Users className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
            <p className="text-lg font-bold text-foreground">{cidade.population || "N/D"}</p>
            <p className="text-[10px] text-muted-foreground uppercase">População</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <Vote className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
            <p className="text-lg font-bold text-foreground">
              {cidade.eleitores2024 && cidade.eleitores2024 > 0
                ? cidade.eleitores2024.toLocaleString("pt-BR")
                : "—"}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase">Eleitores 2024</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <FileText className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
            <p className="text-lg font-bold text-foreground">{cidade.demandas}</p>
            <p className="text-[10px] text-muted-foreground uppercase">Demandas</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <Landmark className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
            <p className="text-lg font-bold text-foreground">{cidade.emendas}</p>
            <p className="text-[10px] text-muted-foreground uppercase">Emendas</p>
          </div>
        </div>

        {/* Lideranças */}
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm text-foreground">
              Lideranças ({cityLiderancas.length})
            </h3>
          </div>

          {cityLiderancas.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma liderança cadastrada nesta cidade
            </p>
          ) : (
            <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
              {cityLiderancas.map((l) => (
                <button
                  key={(l as any).id}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors text-left group"
                  onClick={() => handleLiderancaClick(l.name)}
                >
                  <Avatar className="h-10 w-10 border border-primary/20">
                    {l.avatar_url && <AvatarImage src={l.avatar_url} className="object-cover" />}
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                      {l.img}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground group-hover:text-primary transition-colors truncate">
                      {l.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{(l as any).cargo || "Liderança"}</p>
                  </div>
                  {(l as any).phone && (
                    <Badge variant="outline" className="text-[10px] gap-1 shrink-0">
                      <Phone className="h-3 w-3" />
                      {(l as any).phone}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
