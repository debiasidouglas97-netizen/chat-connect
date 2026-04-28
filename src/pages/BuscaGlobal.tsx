import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search as SearchIcon, Loader2 } from "lucide-react";
import {
  useGlobalSearch, getCategoryLabel, type SearchCategory,
} from "@/hooks/use-global-search";

const ALL_CATS: SearchCategory[] = [
  "liderancas", "eleitores", "cidades", "demandas", "emendas",
  "proposicoes", "agenda", "mobilizacao", "documentos", "usuarios",
];

export default function BuscaGlobal() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [q, setQ] = useState(params.get("q") || "");
  const [activeCats, setActiveCats] = useState<Set<SearchCategory>>(new Set(ALL_CATS));
  const { results, isLoading, enabled } = useGlobalSearch(q);

  useEffect(() => {
    const t = setTimeout(() => {
      if (q) setParams({ q }, { replace: true });
      else setParams({}, { replace: true });
    }, 300);
    return () => clearTimeout(t);
  }, [q, setParams]);

  const filtered = useMemo(
    () => results.filter((r) => activeCats.has(r.category)),
    [results, activeCats]
  );

  const grouped = useMemo(() => {
    const m = new Map<SearchCategory, typeof filtered>();
    filtered.forEach((r) => {
      if (!m.has(r.category)) m.set(r.category, []);
      m.get(r.category)!.push(r);
    });
    return Array.from(m.entries());
  }, [filtered]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    results.forEach((r) => { c[r.category] = (c[r.category] || 0) + 1; });
    return c;
  }, [results]);

  const toggleCat = (c: SearchCategory) => {
    setActiveCats((prev) => {
      const next = new Set(prev);
      next.has(c) ? next.delete(c) : next.add(c);
      return next;
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Busca Global</h1>
        <p className="text-sm text-muted-foreground">
          Pesquise em toda a plataforma — lideranças, eleitores, cidades, demandas, emendas, agenda e mais.
        </p>
      </div>

      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Digite um nome, cidade, número de emenda..."
          className="pl-10 h-12 text-base"
        />
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap gap-2">
        {ALL_CATS.map((c) => {
          const active = activeCats.has(c);
          const n = counts[c] || 0;
          return (
            <Button
              key={c}
              size="sm"
              variant={active ? "default" : "outline"}
              onClick={() => toggleCat(c)}
              className="h-7 rounded-full"
            >
              {getCategoryLabel(c)}
              {n > 0 && <Badge variant="secondary" className="ml-2 h-4 px-1.5 text-[10px]">{n}</Badge>}
            </Button>
          );
        })}
      </div>

      {!enabled && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Digite ao menos 2 caracteres para começar.
          </CardContent>
        </Card>
      )}

      {enabled && isLoading && (
        <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Buscando em toda a plataforma…
        </div>
      )}

      {enabled && !isLoading && filtered.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhum resultado para <span className="font-semibold text-foreground">"{q}"</span>.
          </CardContent>
        </Card>
      )}

      {enabled && !isLoading && grouped.map(([cat, items]) => (
        <div key={cat} className="space-y-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {getCategoryLabel(cat)}
            </h2>
            <Badge variant="secondary" className="text-[10px]">{items.length}</Badge>
          </div>
          <div className="grid gap-2">
            {items.map((r) => (
              <Card
                key={`${cat}-${r.id}`}
                className="cursor-pointer hover:border-primary/50 hover:shadow-sm transition"
                onClick={() => navigate(r.to)}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <r.icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{r.title}</div>
                    {r.subtitle && (
                      <div className="text-xs text-muted-foreground truncate">{r.subtitle}</div>
                    )}
                  </div>
                  <Badge variant="outline" className="text-[10px]">{getCategoryLabel(cat)}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
