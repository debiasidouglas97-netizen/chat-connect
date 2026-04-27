## Problema

Ao salvar uma nova ordem de grupos em **Configurações → Campos de Cadastro → Lideranças** (por exemplo: Identificação → Contatos → Estratégia → Redes Sociais → Localização), o **diálogo "Nova Liderança"** não respeita essa ordem — os blocos visuais (Endereço, Redes sociais, Meta de votos, Contatos adicionais) estão **hardcoded** no JSX.

A configuração já é lida (`useFormConfig`) e usada para visibilidade/labels/ordem de subcampos, mas a ordem dos **grupos inteiros** é ignorada.

## Solução

Refatorar `src/components/liderancas/NovaLiderancaDialog.tsx` para renderizar os blocos por grupo, na ordem definida em `formCfg.groupOrder`.

### Mapeamento bloco → grupo
- **Identificação** (fixo no topo, sempre primeiro): Foto, Nome/Cargo, Cidade/Influência/Tipo/Classificação, CPF/RG (Documentos), bloco "Acesso ao sistema".
- **Estratégia**: bloco `MetaVotosInput`.
- **Contatos**: bloco "Contatos adicionais" (telefone, whatsapp, telegram, email quando sem acesso).
- **Redes Sociais**: bloco Instagram/Facebook/YouTube.
- **Localização**: bloco Endereço (CEP, Rua, Número, Bairro, Cidade, Estado) + bloco "Cidades de atuação".

Os campos personalizados continuam no final (após todos os grupos).

### Mudança no JSX
Dentro de `<div className="space-y-4">`:

1. Manter a primeira parte (Identificação) como já está renderizada — sempre primeiro.
2. Substituir os blocos hardcoded posteriores por um `IIFE` que monta um dicionário:
   ```
   const blocksByGroup: Record<string, JSX.Element | null> = {
     "Estratégia": estrategiaBlock,
     "Contatos": contatosBlock,
     "Redes Sociais": redesBlock,
     "Localização": localizacaoBlock,
   };
   const order = (formCfg.groupOrder ?? [])
     .filter(g => g !== "Identificação");
   // adiciona grupos faltantes ao final como fallback
   ```
3. Renderizar `order.map(g => blocksByGroup[g]).filter(Boolean)`.

O bloco "Cidades de atuação" passa para dentro do grupo **Localização** (junto do Endereço), o que faz sentido semanticamente.

### Resultado
A ordem dos grupos no formulário "Nova Liderança" passa a refletir exatamente a configuração salva em **Configurações → Campos de Cadastro**. Identificação permanece sempre primeiro (já é o grupo travado). Reordenando "Redes Sociais" para o segundo lugar nas configurações, ela aparecerá logo após a Identificação no cadastro real.

### Escopo
Apenas o arquivo `src/components/liderancas/NovaLiderancaDialog.tsx`. Nada muda na config, defaults, hook, banco ou no `NovoEleitorDialog` (que pode ser feito em iteração separada se necessário, com a mesma estratégia).