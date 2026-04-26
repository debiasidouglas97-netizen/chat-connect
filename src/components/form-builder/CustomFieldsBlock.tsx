import DynamicFieldRenderer from "./DynamicFieldRenderer";
import type { CustomFieldConfig } from "@/lib/form-config-types";

interface Props {
  fields: CustomFieldConfig[];
  values: Record<string, any>;
  onChange: (values: Record<string, any>) => void;
  /** Conjunto de keys obrigatórias que estão vazias (para destaque). */
  errorKeys?: Set<string>;
  disabled?: boolean;
  /** Título da seção (opcional). */
  title?: string;
}

/**
 * Bloco que renderiza todos os campos personalizados visíveis de uma config,
 * em duas colunas no desktop. Já filtra por `visible` e ordena por `order`.
 */
export default function CustomFieldsBlock({ fields, values, onChange, errorKeys, disabled, title }: Props) {
  const visible = fields.filter((f) => f.visible).sort((a, b) => a.order - b.order);
  if (visible.length === 0) return null;

  const setOne = (key: string, val: any) => onChange({ ...values, [key]: val });

  return (
    <div className="space-y-3">
      {title && (
        <p className="text-xs font-medium text-muted-foreground pt-2">{title}</p>
      )}
      <div className="grid grid-cols-2 gap-3">
        {visible.map((f) => (
          <div
            key={f.key}
            className={f.type === "textarea" || f.type === "checkbox" ? "col-span-2" : ""}
          >
            <DynamicFieldRenderer
              field={f}
              value={values?.[f.key]}
              onChange={(v) => setOne(f.key, v)}
              showError={errorKeys?.has(f.key)}
              disabled={disabled}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Valida campos obrigatórios. Retorna o Set de keys com erro. */
export function validateCustomFields(
  fields: CustomFieldConfig[],
  values: Record<string, any>,
): Set<string> {
  const errors = new Set<string>();
  for (const f of fields) {
    if (!f.visible || !f.required) continue;
    const v = values?.[f.key];
    const isEmpty =
      v === undefined ||
      v === null ||
      (typeof v === "string" && v.trim() === "") ||
      (Array.isArray(v) && v.length === 0);
    if (isEmpty) errors.add(f.key);
  }
  return errors;
}
