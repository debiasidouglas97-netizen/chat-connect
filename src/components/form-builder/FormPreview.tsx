import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye } from "lucide-react";
import CustomFieldsBlock from "./CustomFieldsBlock";
import { NATIVE_FIELDS_CATALOG } from "@/lib/form-config-defaults";
import type { FormSegment, SegmentFormConfig } from "@/lib/form-config-types";

interface Props {
  segment: FormSegment;
  config: SegmentFormConfig;
}

/**
 * Preview LADO-A-LADO do formulário, montado em tempo real conforme a config.
 * Não envia nada para o banco — apenas renderiza inputs desabilitados em ordem,
 * com rótulos e marcações de "obrigatório" reais.
 */
export default function FormPreview({ segment, config }: Props) {
  const catalog = NATIVE_FIELDS_CATALOG[segment];

  const visibleNatives = catalog
    .map((def) => ({ def, cfg: config.nativeFields[def.key] }))
    .filter((x) => x.cfg?.visible !== false)
    .sort((a, b) => (a.cfg?.order ?? 0) - (b.cfg?.order ?? 0));

  return (
    <Card className="p-4 sticky top-4 max-h-[calc(100vh-8rem)] overflow-y-auto">
      <div className="flex items-center gap-2 pb-3 border-b mb-4">
        <Eye className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold">Preview do formulário</p>
      </div>

      <div className="space-y-3">
        {visibleNatives.map(({ def, cfg }) => {
          const label = (cfg?.label?.trim() || def.defaultLabel) ?? def.defaultLabel;
          return (
            <div key={def.key} className="space-y-1">
              <Label className="text-xs">
                {label}
                {cfg?.required && <span className="text-destructive ml-1">*</span>}
              </Label>
              <Input disabled placeholder={`(${def.inputType})`} className="bg-muted/30" />
            </div>
          );
        })}

        {config.customFields.filter((f) => f.visible).length > 0 && (
          <div className="pt-3 border-t">
            <CustomFieldsBlock
              fields={config.customFields}
              values={{}}
              onChange={() => {}}
              disabled
              title="Campos personalizados"
            />
          </div>
        )}
      </div>
    </Card>
  );
}
