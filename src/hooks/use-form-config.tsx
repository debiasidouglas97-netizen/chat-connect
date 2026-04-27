import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import {
  resolveSegmentConfig,
  buildDefaultSegmentConfig,
} from "@/lib/form-config-defaults";
import type { FormSegment, SegmentFormConfig } from "@/lib/form-config-types";
import { toast } from "sonner";

/**
 * Hook que retorna a configuração efetiva de formulário (campos nativos +
 * personalizados) do tenant para um segmento. Retorna sempre uma config
 * "resolvida" (com defaults aplicados), mesmo enquanto carrega.
 */
export function useFormConfig(segment: FormSegment) {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["form-config", tenantId, segment],
    enabled: !!tenantId,
    queryFn: async (): Promise<SegmentFormConfig> => {
      const { data, error } = await supabase
        .from("tenant_form_config" as any)
        .select("native_fields, custom_fields")
        .eq("tenant_id", tenantId!)
        .eq("segment", segment)
        .maybeSingle();

      if (error) throw error;
      // groupOrder pode estar embutido em native_fields.__groupOrder
      const nativeRaw = (data ? (data as any).native_fields : null) || {};
      const embeddedOrder = Array.isArray(nativeRaw.__groupOrder)
        ? (nativeRaw.__groupOrder as string[])
        : undefined;
      const raw: Partial<SegmentFormConfig> | null = data
        ? {
            nativeFields: nativeRaw,
            customFields: (data as any).custom_fields || [],
            groupOrder: embeddedOrder,
          }
        : null;
      return resolveSegmentConfig(segment, raw);
    },
  });

  const save = useMutation({
    mutationFn: async (config: SegmentFormConfig) => {
      if (!tenantId) throw new Error("Tenant não identificado");
      // Serializa groupOrder dentro de native_fields como chave reservada
      const nativeFieldsPayload: Record<string, any> = { ...config.nativeFields };
      if (config.groupOrder && config.groupOrder.length > 0) {
        nativeFieldsPayload.__groupOrder = config.groupOrder;
      }
      const payload = {
        tenant_id: tenantId,
        segment,
        native_fields: nativeFieldsPayload as any,
        custom_fields: config.customFields as any,
      };
      const { error } = await supabase
        .from("tenant_form_config" as any)
        .upsert(payload, { onConflict: "tenant_id,segment" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["form-config", tenantId, segment] });
      toast.success("Configuração de campos salva!");
    },
    onError: (err: any) => {
      toast.error("Erro ao salvar: " + (err?.message || "desconhecido"));
    },
  });

  return {
    config: query.data ?? buildDefaultSegmentConfig(segment),
    isLoading: query.isLoading,
    save,
  };
}
