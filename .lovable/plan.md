# Adicionar ordenação e coluna "Est. Votos" na página Cidades

## O que muda

Na página `/cidades` (`src/pages/Cidades.tsx`):

1. **Novo botão de ordenação "Est. Votos"** na barra de filtros, posicionado entre os botões **"Votos"** e **"% Conversão"**, seguindo o mesmo padrão visual (toggle desc → asc → off, ícone `ArrowDownWideNarrow` / `ArrowUpWideNarrow`, tooltip explicativo).

2. **Nova coluna "Est. Votos"** na visualização em lista (tabela), inserida entre as colunas **"Lideranças"** e **"Emendas"** — assim fica próxima das demais métricas de potencial. Exibe o valor formatado em pt-BR ou `-` quando zero.

## Detalhes técnicos

**Arquivo único alterado:** `src/pages/Cidades.tsx`

- Estender o tipo do `useState` de `sortField` para incluir `"estimativa"`.
- Adicionar um novo branch no `useMemo` de `cidades` que ordena por `getEstimativaVotos(c.name)` respeitando `sortDir`. Adicionar `estimativaVotosByCity` às dependências.
- Duplicar o bloco `<Tooltip>` do botão "Votos" (linhas ~414–431), trocando `"votos"` por `"estimativa"`, label para `"Est. Votos"` e tooltip para "Ordenar por estimativa de votos…".
- Na `<TableHeader>`: inserir `<TableHead>Est. Votos</TableHead>` após "Lideranças".
- Na `<TableRow>` de cada cidade: inserir `<TableCell>` correspondente, exibindo `getEstimativaVotos(c.name).toLocaleString("pt-BR")` em negrito quando > 0, ou `-` em texto muted.

## Fora de escopo
- Visualização em cards (já tem o destaque de Est. Votos implementado).
- Página de detalhe da cidade.
- Cálculo da estimativa (lógica `estimativaVotosByCity` já existe e é reutilizada).
