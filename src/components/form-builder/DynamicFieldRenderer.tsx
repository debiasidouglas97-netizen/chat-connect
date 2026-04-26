import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CustomFieldConfig } from "@/lib/form-config-types";

interface Props {
  field: CustomFieldConfig;
  value: any;
  onChange: (value: any) => void;
  /** Quando true, indica visualmente que o campo é obrigatório e está vazio. */
  showError?: boolean;
  disabled?: boolean;
}

/**
 * Renderiza um único campo personalizado conforme seu tipo. Usado tanto no
 * preview quanto nos formulários reais (Nova/Editar Liderança, etc).
 */
export default function DynamicFieldRenderer({ field, value, onChange, showError, disabled }: Props) {
  const id = `cf-${field.key}`;
  const labelEl = (
    <Label htmlFor={id} className="text-xs">
      {field.label}
      {field.required && <span className="text-destructive ml-1">*</span>}
    </Label>
  );

  const errorRing = showError ? "border-destructive focus-visible:ring-destructive" : "";

  switch (field.type) {
    case "textarea":
      return (
        <div className="space-y-1">
          {labelEl}
          <Textarea
            id={id}
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
            className={errorRing}
            disabled={disabled}
            rows={3}
          />
          {field.helperText && <p className="text-[10px] text-muted-foreground">{field.helperText}</p>}
        </div>
      );

    case "checkbox":
      return (
        <div className="flex items-start gap-2 py-1">
          <Checkbox
            id={id}
            checked={!!value}
            onCheckedChange={(v) => onChange(v === true)}
            disabled={disabled}
          />
          <div>
            <label htmlFor={id} className="text-xs cursor-pointer">
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </label>
            {field.helperText && <p className="text-[10px] text-muted-foreground">{field.helperText}</p>}
          </div>
        </div>
      );

    case "select": {
      const options = field.options || [];
      return (
        <div className="space-y-1">
          {labelEl}
          <Select value={value ?? ""} onValueChange={onChange} disabled={disabled}>
            <SelectTrigger id={id} className={errorRing}>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {field.helperText && <p className="text-[10px] text-muted-foreground">{field.helperText}</p>}
        </div>
      );
    }

    case "number":
    case "date":
    case "phone":
    case "url":
    case "text":
    default: {
      const inputType =
        field.type === "number"
          ? "number"
          : field.type === "date"
          ? "date"
          : field.type === "phone"
          ? "tel"
          : field.type === "url"
          ? "url"
          : "text";
      return (
        <div className="space-y-1">
          {labelEl}
          <Input
            id={id}
            type={inputType}
            value={value ?? ""}
            onChange={(e) =>
              onChange(field.type === "number" ? (e.target.value === "" ? null : Number(e.target.value)) : e.target.value)
            }
            className={errorRing}
            disabled={disabled}
          />
          {field.helperText && <p className="text-[10px] text-muted-foreground">{field.helperText}</p>}
        </div>
      );
    }
  }
}
