
## Objetivo

Substituir o painel lateral de preview (que hoje renderiza inputs genéricos empilhados) por um **botão "Visualizar formulário"** que abre um **modal com o preview fiel ao layout real** do diálogo "Nova Liderança", respeitando agrupamentos, colunas e ordem da configuração.

---

## Mudanças

### 1. `src/components/form-builder/FormPreview.tsx` — reescrever
Transformar de painel lateral em **modal (Dialog)** que reproduz o layout real:

- **Header**: Avatar + botão "Foto" (apenas se o campo `avatar` estiver visível)
- **Grid 2 colunas**: Nome / Cargo
- **Grid 3 colunas**: Cidade principal / Influência / Tipo / Classificação
- **Bloco "Acesso ao Sistema"** (visual igual ao real, com checkbox decorativo) se algum campo de acesso estiver no catálogo
- **Bloco "Contatos adicionais"** em grid 2 colunas com ícones (Phone, MessageCircle, Mail, AtSign)
- **Bloco "Redes Sociais"** em grid 3 colunas com ícones (Instagram, Facebook, Youtube)
- **Bloco "Endereço"** com CEP / Logradouro / Número / Bairro / Cidade / Estado
- **Meta de votos** com layout próprio
- **Campos personalizados** ao final, em grid 2 colunas (mantém `CustomFieldsBlock`)

Regras:
- Filtrar por `cfg.visible !== false`
- Respeitar `cfg.label` (override) ou `def.defaultLabel`
- Marcar `*` se `cfg.required`
- Inputs todos `disabled` com placeholder do tipo real (ex: "Ex: João da Silva", "000.000.000-00")
- Se um grupo inteiro estiver oculto, esconder o cabeçalho do grupo
- Ordem dentro de cada bloco respeita `cfg.order`

Props da nova API:
```tsx
<FormPreview
  segment={segment}
  config={draft}
  open={previewOpen}
  onOpenChange={setPreviewOpen}
/>
```

### 2. `src/pages/configuracoes/CamposCadastro.tsx` — ajustar layout
- **Remover grid `lg:grid-cols-[1fr,360px]`** → voltar para coluna única (largura total para a configuração).
- **Adicionar botão "Visualizar formulário"** (variant outline, ícone `Eye`) na barra de ações, ao lado de "Descartar"/"Salvar".
- Adicionar estado `const [previewOpen, setPreviewOpen] = useState(false);`
- Renderizar `<FormPreview ... open={previewOpen} onOpenChange={setPreviewOpen} />` fora do grid.

### 3. Nada muda em
- `NativeFieldsConfigList`, `CustomFieldsConfigList`, `DynamicFieldRenderer`, `CustomFieldsBlock`
- `useFormConfig`, defaults, types
- Banco / migrations
- Formulário real `NovaLiderancaDialog`

---

## Resultado

- A tela de configuração fica mais ampla e legível (sem painel lateral comprimindo).
- O preview vira um modal grande (`max-w-2xl`, mesma largura do diálogo real) acessado sob demanda, mostrando **exatamente** como o cadastro vai aparecer com os campos atualmente configurados — incluindo agrupamentos, colunas duplas/triplas, ícones e o bloco de acesso.
- Mudanças feitas no draft (sem salvar) já refletem no preview ao reabri-lo, permitindo testar configurações antes de salvar.
