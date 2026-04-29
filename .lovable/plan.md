# Destacar Estimativa de Votos no card de cidade

## Contexto
Hoje, no card de cidade (página `/cidades`, modo grid), a **Estimativa de Votos** aparece como uma linha discreta no grid de informações ("Est. Votos: —"), enquanto o número de **Votos — Eleição 2022** ganha destaque no canto direito com tipografia grande, em itálico e negrito.

Como a estimativa de votos é uma métrica estratégica (soma das metas das lideranças vinculadas à cidade), ela deve receber o mesmo tratamento visual de destaque, lado a lado com os votos de 2022, permitindo comparação direta entre o **potencial atual** e o **histórico eleitoral**.

## O que muda visualmente

No card de cidade (`src/pages/Cidades.tsx`, modo grid):

1. **Remover** a linha "Est. Votos: —" do grid de 2 colunas com os outros dados (população, eleitores, visitas, etc).
2. **Criar um bloco de destaque duplo** no rodapé do card, alinhado à direita, mostrando lado a lado:
   - **Estimativa de Votos** (potencial mapeado pelas lideranças)
   - **Votos — Eleição 2022** (histórico)

Layout proposto:

```text
                            1.250        |        4
                  EST. VOTOS — POTENCIAL  |  VOTOS — ELEIÇÃO 2022
```

- Mesma tipografia do bloco atual de 2022: `text-2xl font-black italic` para o número, `text-[10px] uppercase tracking-wider italic` para o rótulo.
- Separador visual sutil entre os dois (borda vertical fina ou gap).
- Quando a estimativa for `0`, exibir `—` (sem ocultar), para manter o destaque mesmo em cidades sem metas mapeadas ainda — assim o usuário percebe a oportunidade de cadastrar metas.
- Quando `votos2022 = 0`, manter o comportamento atual (oculta esse lado), e a estimativa ocupa o destaque sozinha.

## Detalhes técnicos

**Arquivo único alterado:** `src/pages/Cidades.tsx`

- Remover o `<span>` da linha 580–582 (Est. Votos do grid).
- Substituir o bloco das linhas 588–599 por um container `flex items-end justify-end gap-4` contendo dois sub-blocos com a mesma estilização atual de "Votos 2022".
- Reusar `getEstimativaVotos(c.name)` e `popClass.text` (já disponíveis no escopo do `.map`).
- Não alterar o modo lista/tabela (apenas o modo grid, que é onde está a referência da imagem).
- Não há mudanças em `CidadeDetailDialog`, banco, hooks ou tipos — apenas apresentação visual.

## Fora de escopo
- Modo tabela da página de Cidades.
- Página de detalhe da cidade (já tem destaque próprio para estimativa).
- Cálculo da estimativa (lógica permanece idêntica).
