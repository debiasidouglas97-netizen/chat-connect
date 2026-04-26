import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Wand2, Layers, Eye } from "lucide-react";
import NativeFieldsConfigList from "@/components/form-builder/NativeFieldsConfigList";
import CustomFieldsConfigList from "@/components/form-builder/CustomFieldsConfigList";
import FormPreview from "@/components/form-builder/FormPreview";
import { useFormConfig } from "@/hooks/use-form-config";
import type { FormSegment, SegmentFormConfig } from "@/lib/form-config-types";
import { usePermissions } from "@/hooks/use-permissions";

interface Props {
  segment: FormSegment;
  segmentLabel: string;
}

function CamposCadastroSegment({ segment, segmentLabel }: Props) {
  const { config, isLoading, save } = useFormConfig(segment);
  const { isAdmin } = usePermissions();
  const [draft, setDraft] = useState<SegmentFormConfig>(config);

  useEffect(() => {
    setDraft(config);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(config)]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(config);

  if (isLoading) {
    return <div className="text-sm text-muted-foreground py-8 text-center">Carregando...</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr,360px] gap-6">
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              Campos nativos — {segmentLabel}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <NativeFieldsConfigList
              segment={segment}
              config={draft.nativeFields}
              onChange={(nf) => setDraft({ ...draft, nativeFields: nf })}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-primary" />
              Campos personalizados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CustomFieldsConfigList
              fields={draft.customFields}
              onChange={(cf) => setDraft({ ...draft, customFields: cf })}
            />
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-2 sticky bottom-2 z-10">
          {dirty && (
            <Button variant="outline" onClick={() => setDraft(config)}>
              Descartar
            </Button>
          )}
          <Button
            disabled={!dirty || !isAdmin || save.isPending}
            onClick={() => save.mutate(draft)}
            className="gap-1.5 shadow-md"
          >
            <Save className="h-4 w-4" />
            {save.isPending ? "Salvando..." : "Salvar configuração"}
          </Button>
        </div>

        {!isAdmin && (
          <p className="text-xs text-muted-foreground text-center">
            Apenas o deputado e o chefe de gabinete podem alterar esta configuração.
          </p>
        )}
      </div>

      <div className="hidden lg:block">
        <FormPreview segment={segment} config={draft} />
      </div>
    </div>
  );
}

export default function CamposCadastro() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Campos de Cadastro</h2>
        <p className="text-sm text-muted-foreground">
          Personalize quais campos aparecem em cada cadastro, defina obrigatoriedade,
          ordem e crie campos exclusivos do seu mandato.
        </p>
      </div>

      <Tabs defaultValue="liderancas">
        <TabsList>
          <TabsTrigger value="liderancas">Lideranças</TabsTrigger>
          <TabsTrigger value="eleitores" disabled>
            Eleitores (em breve)
          </TabsTrigger>
          <TabsTrigger value="usuarios" disabled>
            Usuários (em breve)
          </TabsTrigger>
        </TabsList>
        <TabsContent value="liderancas" className="mt-4">
          <CamposCadastroSegment segment="liderancas" segmentLabel="Lideranças" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
