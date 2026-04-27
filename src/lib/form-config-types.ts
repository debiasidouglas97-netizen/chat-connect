// Tipos compartilhados do sistema de Cadastro Inteligente por Segmento.

export type FormSegment = "liderancas" | "eleitores" | "usuarios";

/** Configuração de um campo NATIVO (já existe como coluna na tabela). */
export interface NativeFieldConfig {
  /** Identificador estável do campo. Mapeia 1:1 para a coluna/payload do form. */
  key: string;
  /** Rótulo customizado pelo deputado. Se vazio, usar o `defaultLabel`. */
  label?: string;
  visible: boolean;
  required: boolean;
  /** Ordem de exibição (asc). */
  order: number;
}

/** Tipos de campo personalizado suportados. */
export type CustomFieldType =
  | "text"
  | "textarea"
  | "number"
  | "select"
  | "checkbox"
  | "date"
  | "phone"
  | "url";

/** Configuração de um campo PERSONALIZADO criado pelo deputado. */
export interface CustomFieldConfig {
  /** Identificador estável (slug). Gerado a partir do label. */
  key: string;
  label: string;
  type: CustomFieldType;
  visible: boolean;
  required: boolean;
  order: number;
  /** Apenas para `select`. */
  options?: string[];
  /** Texto auxiliar opcional. */
  helperText?: string;
}

/** Configuração completa de um segmento. */
export interface SegmentFormConfig {
  nativeFields: Record<string, NativeFieldConfig>;
  customFields: CustomFieldConfig[];
  /** Ordem dos GRUPOS (nomes) na exibição. Primeiro item é o grupo travado no topo. */
  groupOrder?: string[];
}

/** Metadado de um campo nativo, usado para listagem na tela de configuração. */
export interface NativeFieldDef {
  key: string;
  defaultLabel: string;
  /** Grupo lógico (ex: "Identificação", "Contatos"). */
  group: string;
  /** Se `true`, o campo NÃO pode ser ocultado nem deixar de ser obrigatório (ex: nome). */
  locked?: boolean;
  /** Tipo aproximado, usado só para o preview. */
  inputType: CustomFieldType;
}
