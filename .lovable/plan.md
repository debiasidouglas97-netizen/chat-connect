## Objetivo

Reorganizar a tela de **Configurações → Campos de Cadastro** para suportar **dois níveis de ordenação**:

1. **Ordem dos GRUPOS** (ex: "Identificação" sempre primeiro, depois "Contatos", "Estratégia", "Redes Sociais"…)
2. **Ordem dos CAMPOS dentro de cada grupo** (já funciona hoje)

O grupo **"Identificação"** fica **fixo no topo** (não pode ser movido). Todos os outros grupos podem ser reordenados livremente com setas ↑/↓.

---

## Mudanças

### 1. `src/lib/form-config-types.ts`
Adicionar opcionalmente uma propriedade de ordem de grupo na config do segmento:

```ts
export interface SegmentFormConfig {
  nativeFields: Record<string, NativeFieldConfig>;
  customFields: CustomFieldConfig[];
  groupOrder?: string[]; // NOVO — ordem dos grupos (nomes)
}
```

### 2. `src/lib/form-config-defaults.ts`
- Em `buildDefaultSegmentConfig`, derivar `groupOrder` automaticamente a partir da ordem natural do catálogo (primeira ocorrência de cada grupo). Resultado para Eleitores: `["Informações Básicas", "Contato", "Informações Eleitorais", "Perfil Político", "Comunicação", "Demográficos", "Redes Sociais", "Endereço", "Sistema"]`. Para Lideranças: `["Identificação", "Localização", "Contatos", "Redes Sociais", "Estratégia"]`.
- Em `resolveSegmentConfig`, fazer merge: começa pela `groupOrder` salva, adiciona ao final qualquer grupo novo do catálogo que não esteja na lista, e remove grupos órfãos. **Sempre força "Identificação" como primeiro item** (e equivalente em Eleitores: "Informações Básicas" como fixo no topo).
- Exportar uma constante `LOCKED_FIRST_GROUP: Record<FormSegment, string>` para indicar qual grupo fica travado no topo de cada segmento:
  - `liderancas` → `"Identificação"`
  - `eleitores` → `"Informações Básicas"`
  - `usuarios` → `"Identificação"`

### 3. `src/components/form-builder/NativeFieldsConfigList.tsx` — refatorar
- Aceitar e propagar a `groupOrder` (via novas props `groupOrder: string[]` e `onGroupOrderChange: (next: string[]) => void`).
- Renderizar os grupos **na ordem definida por `groupOrder`** (não mais `Object.entries(grouped)`).
- Em cada cabeçalho de grupo, mostrar **setas ↑/↓** para mover o grupo inteiro:
  - O grupo `LOCKED_FIRST_GROUP[segment]` exibe um pequeno ícone de cadeado e **não tem setas** (sempre fixo no topo).
  - O primeiro grupo movível não pode subir mais; o último não pode descer.
- Visual do header do grupo passa a ser uma "barra" leve (`bg-muted/40`, `rounded-t-lg`), com título à esquerda e controles de reordenação à direita, para deixar claro o agrupamento.
- Setas internas dos campos (já existentes) continuam funcionando como hoje, mas só reordenam dentro do grupo.

### 4. `src/pages/configuracoes/CamposCadastro.tsx`
- Passar `groupOrder` e `onGroupOrderChange` ao `NativeFieldsConfigList`:
  ```tsx
  <NativeFieldsConfigList
    segment={segment}
    config={draft.nativeFields}
    onChange={(nf) => setDraft({ ...draft, nativeFields: nf })}
    groupOrder={draft.groupOrder ?? []}
    onGroupOrderChange={(go) => setDraft({ ...draft, groupOrder: go })}
  />
  ```

### 5. `src/components/form-builder/FormPreview.tsx`
- Quando renderizar a lista de campos no preview, **respeitar `config.groupOrder`** (em vez de hardcode da ordem). Pequeno ajuste para iterar pela `groupOrder` resolvida e, dentro de cada grupo, ordenar pelos `order` dos campos visíveis. O grupo travado continua sendo o primeiro automaticamente.

### 6. Persistência
Nada muda no schema do banco — o campo `custom_fields` e `native_fields` permanecem em JSONB. A nova `groupOrder` será gravada junto na coluna `native_fields` (como `__groupOrder` no JSON) **OU** preferimos uma terceira coluna? → **Decisão: gravar dentro de `native_fields` numa chave reservada `__groupOrder`** para evitar migração. O `resolveSegmentConfig` extrai e remove essa chave especial antes de tratar o resto como `Record<string, NativeFieldConfig>`. `useFormConfig.save` precisa, ao serializar, reinjetar `__groupOrder` em `native_fields`.

> Alternativa: criar uma migração nova adicionando coluna `group_order JSONB`. Mais limpo, mas exige migration. **Vou pelo caminho sem migration** (chave `__groupOrder` dentro de `native_fields`) para manter a mudança rápida e reversível.

---

## Resultado

- O grupo **Identificação** (e em Eleitores, **Informações Básicas**) fica fixo no topo, com cadeado.
- Cada outro grupo (Contatos, Estratégia, Redes Sociais, etc.) ganha setas ↑/↓ no cabeçalho que reordenam o **bloco inteiro**.
- Os campos dentro de cada grupo continuam reordenáveis individualmente (comportamento atual preservado).
- Tanto o **preview** quanto o **formulário real** (Nova Liderança / Novo Eleitor — em iteração futura) passarão a respeitar a nova ordem de grupos.
- A configuração persiste via JSONB existente, sem migração.