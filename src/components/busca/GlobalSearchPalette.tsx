import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import {
  useGlobalSearch, getCategoryLabel, type SearchCategory, type SearchResult,
} from "@/hooks/use-global-search";
import { QUICK_ACTIONS } from "@/lib/search-actions";
import { usePermissions } from "@/hooks/use-permissions";
import { Search as SearchIcon, ArrowRight, Loader2 } from "lucide-react";

const RECENT_KEY = "mandato:global-search:recent";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

export function GlobalSearchPalette({ open, onOpenChange }: Props) {
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const { results, isLoading, enabled } = useGlobalSearch(q);
  const { can } = usePermissions();

  // Reset query each time the palette opens.
  useEffect(() => { if (open) setQ(""); }, [open]);

  const recent: SearchResult[] = useMemo(() => {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); } catch { return []; }
  }, [open]);

  const grouped = useMemo(() => {
    const m = new Map<SearchCategory, SearchResult[]>();
    results.forEach((r) => {
      if (!m.has(r.category)) m.set(r.category, []);
      m.get(r.category)!.push(r);
    });
    return Array.from(m.entries());
  }, [results]);

  const visibleQuickActions = QUICK_ACTIONS.filter((a) => can(a.module, a.kind === "create" ? "create" : "view"));

  const select = (r: SearchResult) => {
    // persist recent
    try {
      const list = [r, ...recent.filter((x) => !(x.id === r.id && x.category === r.category))].slice(0, 5);
      localStorage.setItem(RECENT_KEY, JSON.stringify(list));
    } catch {}
    onOpenChange(false);
    navigate(r.to);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Buscar lideranças, eleitores, cidades, demandas, emendas..."
        value={q}
        onValueChange={setQ}
      />
      {/* `shouldFilter={false}`-like behavior: cmdk filters by default; we already filtered server-side.
          We disable internal filtering by giving each item a unique `value` and using onSelect. */}
      <CommandList>
        {!enabled && (
          <>
            {recent.length > 0 && (
              <>
                <CommandGroup heading="Buscas recentes">
                  {recent.map((r) => (
                    <CommandItem key={`recent-${r.category}-${r.id}`} value={`recent-${r.id}`} onSelect={() => select(r)}>
                      <r.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span className="flex-1 truncate">{r.title}</span>
                      <Badge variant="secondary" className="ml-2 text-[10px]">{getCategoryLabel(r.category)}</Badge>
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
              </>
            )}
            <CommandGroup heading="Atalhos">
              {visibleQuickActions.slice(0, 10).map((a) => (
                <CommandItem key={a.id} value={a.id} onSelect={() => { onOpenChange(false); navigate(a.to); }}>
                  <a.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="flex-1">{a.label}</span>
                  {a.hint && <Badge variant="outline" className="ml-2 text-[10px]">{a.hint}</Badge>}
                  <ArrowRight className="ml-2 h-3 w-3 text-muted-foreground" />
                </CommandItem>
              ))}
            </CommandGroup>
            <div className="px-3 py-2 text-[11px] text-muted-foreground border-t">
              <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono">⌘K</kbd> abre a busca em qualquer tela ·
              <kbd className="ml-1 rounded border bg-muted px-1.5 py-0.5 font-mono">↵</kbd> abrir ·
              <kbd className="ml-1 rounded border bg-muted px-1.5 py-0.5 font-mono">esc</kbd> fechar
            </div>
          </>
        )}

        {enabled && isLoading && (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Buscando…
          </div>
        )}

        {enabled && !isLoading && results.length === 0 && (
          <CommandEmpty>
            <div className="py-4">
              Nenhum resultado para <span className="font-semibold">"{q}"</span>
              <div className="mt-2 text-xs text-muted-foreground">
                Tente outro termo ou crie um novo registro.
              </div>
            </div>
          </CommandEmpty>
        )}

        {enabled && !isLoading && grouped.map(([cat, items]) => (
          <CommandGroup key={cat} heading={getCategoryLabel(cat)}>
            {items.map((r) => (
              <CommandItem key={`${cat}-${r.id}`} value={`${cat}-${r.id}-${r.title}`} onSelect={() => select(r)}>
                <r.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm">{highlight(r.title, q)}</div>
                  {r.subtitle && (
                    <div className="truncate text-xs text-muted-foreground">{r.subtitle}</div>
                  )}
                </div>
                <Badge variant="secondary" className="ml-2 text-[10px]">{getCategoryLabel(cat)}</Badge>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}

        {enabled && results.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem
                value="see-all"
                onSelect={() => { onOpenChange(false); navigate(`/busca?q=${encodeURIComponent(q)}`); }}
              >
                <SearchIcon className="mr-2 h-4 w-4" />
                Ver todos os resultados para "{q}"
              </CommandItem>
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}

function highlight(text: string, q: string) {
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-primary/20 text-foreground rounded px-0.5">{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  );
}
