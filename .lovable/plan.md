## Busca Global — Plataforma inteira em um único campo

A rota `/busca` está no menu mas ainda não tem página. Vou criar uma busca **unificada estilo command palette** (Linear/Raycast) que pesquisa em tudo e leva direto ao registro/perfil correspondente.

### Como vai funcionar

- **Atalho global ⌘K / Ctrl+K**: abre um overlay de busca de qualquer lugar do app (montado no `AppLayout`).
- **Página dedicada `/busca?q=...`**: mesma busca em layout maior, com filtros por categoria e resultados agrupados — útil quando o usuário quer "navegar" pelos resultados.
- **Digitação livre**: ex. "Douglas de Biasi" → mostra a liderança/eleitor/usuário com esse nome; clicar abre o perfil. "São Paulo" → abre a cidade. "Emenda 2024 saúde" → lista emendas.

### Categorias pesquisadas (tudo respeitando `tenant_id` + permissões `can_view`)

```text
🧑 Lideranças       → nome, whatsapp, cidade, cargo  → abre LiderancaDetailDialog
👥 Eleitores        → nome, whatsapp, email, cidade  → abre detalhe do eleitor
🏙  Cidades          → nome, região                   → abre CidadeDetailDialog
📋 Demandas         → título, descrição, solicitante → abre DemandaDetailDialog
💰 Emendas          → número, objeto, beneficiário   → abre EmendaDetailDialog
📜 Proposições      → ementa, número                 → /proposicoes?focus=ID
📅 Agenda           → título, local, descrição       → abre EventoDetailDialog
📨 Mobilizações     → título, conteúdo               → abre MobilizacaoDetailDialog
📂 Documentos       → nome do arquivo                → abre/baixa documento
👤 Usuários         → nome, email, username          → /configuracoes (aba usuários)
⚡ Ações rápidas     → "Nova liderança", "Novo eleitor", "Ir para Mapa", etc.
```

A busca por "Douglas de Biasi" pode aparecer em **mais de uma categoria** ao mesmo tempo (ex.: é usuário do sistema *e* uma liderança cadastrada) — mostramos ambos com badge da origem para o usuário escolher.

### Comportamento e UX

- **Resultados agrupados por categoria**, ordenados por relevância (match no início do nome > match parcial > match em campo secundário).
- **Highlight** do trecho que casou com o termo.
- **Ícones por tipo** + cor pastel da identidade (segue paleta atual).
- **Histórico recente** (localStorage) — mostra últimas 5 buscas quando o campo está vazio.
- **Atalhos sugeridos quando vazio**: "Ir para Dashboard", "Nova demanda", "Abrir Mapa" etc.
- **Estado vazio**: "Nenhum resultado para 'xyz' — tente outro termo ou crie uma nova liderança."
- **Loading com skeleton** por categoria (busca debounced, 250ms).
- **Teclado**: ↑/↓ navega, Enter abre, Esc fecha, Tab alterna categoria.

### Arquitetura técnica

**Novos arquivos**
- `src/pages/BuscaGlobal.tsx` — página `/busca` com layout completo (filtros laterais por categoria + resultados).
- `src/components/busca/GlobalSearchPalette.tsx` — overlay ⌘K reutilizando `CommandDialog` (já existe em `src/components/ui/command.tsx`).
- `src/components/busca/SearchResultItem.tsx` — item de resultado com ícone, título, subtítulo, badge de categoria, highlight.
- `src/hooks/use-global-search.tsx` — hook central que recebe `query` + `enabledCategories` e devolve `{ results, isLoading }`. Faz queries paralelas via `Promise.all` no Supabase (`ilike` em campos relevantes, `limit 8` por categoria) com debounce.
- `src/lib/search-actions.ts` — registro estático das "ações rápidas" (criar entidade, navegar para módulo).

**Edições**
- `src/App.tsx` — adicionar rota `/busca` protegida por `module="busca"`.
- `src/components/AppLayout.tsx` — montar `<GlobalSearchPalette />` global e listener de `⌘K`.
- `src/components/AppSidebar.tsx` — mostrar dica "⌘K" ao lado do item "Busca Global".
- `src/lib/permissions-defaults.ts` — módulo `busca` já existe; mantido.

**Detalhes de implementação**
- Cada resultado guarda `onSelect()` que decide entre: abrir um dialog (passando o ID via state) ou navegar via `react-router`. Para abrir dialogs de fora das páginas-mãe, vamos disparar via `URLSearchParams` (ex.: `/liderancas?open=<id>`) e cada página já existente checa esse param no mount para abrir o detalhe — padrão simples e sem refactor de estado global.
- RLS já garante isolamento por tenant; o hook só precisa filtrar por `tenant_id` redundantemente.
- Permissões: a UI esconde categorias para as quais `can("modulo","view")` é falso.

### Fora de escopo (pode virar v2)
- Busca semântica/IA (embeddings) — começamos com `ilike` que é instantâneo e barato; se quiser, depois plugamos Lovable AI para "perguntas em linguagem natural".
- Busca em conteúdo de anexos (PDFs).
- Salvar buscas favoritas.

### Resultado para o usuário
Você digita "Douglas de Biasi" em qualquer tela (⌘K) e em < 300ms vê: o **usuário** Douglas, a **liderança** Douglas, eventuais **demandas** abertas por ele e **eventos** com o nome dele — clica e vai direto ao registro. Mesma coisa para cidades, emendas, proposições etc.