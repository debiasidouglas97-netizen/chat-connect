import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";

export interface DocumentoUnificado {
  id: string;
  titulo: string;
  file_name: string;
  file_size: number;
  file_type: string;
  storage_path: string;
  bucket: string;
  origem: "emenda" | "demanda" | "manual";
  origem_titulo: string;
  created_at: string;
}

export function useDocumentos() {
  const { tenantId } = useTenant();
  const qc = useQueryClient();

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["documentos-unificados", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const result: DocumentoUnificado[] = [];

      // 1) Emenda attachments — busca por tenant_id OU via emendas do tenant
      const { data: tenantEmendas } = await supabase
        .from("emendas")
        .select("id")
        .eq("tenant_id", tenantId!);
      const emendaIds = (tenantEmendas || []).map((e) => e.id);

      let emendaAtts: any[] = [];
      if (emendaIds.length > 0) {
        const { data } = await supabase
          .from("emenda_attachments")
          .select("id, file_name, file_size, file_type, storage_path, created_at, emenda_id")
          .in("emenda_id", emendaIds);
        emendaAtts = data || [];
      }

      if (emendaAtts && emendaAtts.length > 0) {
        const emendaIds = [...new Set(emendaAtts.map((a) => a.emenda_id))];
        const { data: emendas } = await supabase
          .from("emendas")
          .select("id, titulo, cidade, tipo")
          .in("id", emendaIds);
        const emendaMap = new Map((emendas || []).map((e) => [e.id, e]));

        for (const att of emendaAtts) {
          const em = emendaMap.get(att.emenda_id);
          result.push({
            id: att.id,
            titulo: att.file_name,
            file_name: att.file_name,
            file_size: att.file_size,
            file_type: att.file_type,
            storage_path: att.storage_path,
            bucket: "emenda-attachments",
            origem: "emenda",
            origem_titulo: em?.titulo || `${em?.tipo} — ${em?.cidade}` || "Emenda",
            created_at: att.created_at,
          });
        }
      }

      // 2) Demanda attachments — busca via demandas do tenant
      const { data: tenantDemandas } = await supabase
        .from("demandas")
        .select("id, title")
        .eq("tenant_id", tenantId!);
      const demandaMap = new Map((tenantDemandas || []).map((d) => [d.id, d]));
      const demandaIds = (tenantDemandas || []).map((d) => d.id);

      let demandaAtts: any[] = [];
      if (demandaIds.length > 0) {
        const { data } = await supabase
          .from("demanda_attachments")
          .select("id, file_name, file_size, file_type, storage_path, created_at, demanda_id")
          .in("demanda_id", demandaIds);
        demandaAtts = data || [];
      }

      if (demandaAtts.length > 0) {

        for (const att of demandaAtts) {
          const dem = demandaMap.get(att.demanda_id);
          result.push({
            id: att.id,
            titulo: att.file_name,
            file_name: att.file_name,
            file_size: att.file_size,
            file_type: att.file_type,
            storage_path: att.storage_path,
            bucket: "demanda-attachments",
            origem: "demanda",
            origem_titulo: dem?.title || "Demanda",
            created_at: att.created_at,
          });
        }
      }

      // 3) Documentos manuais
      const { data: manuais } = await supabase
        .from("documentos_manuais" as any)
        .select("*")
        .eq("tenant_id", tenantId!);

      if (manuais) {
        for (const m of manuais as any[]) {
          result.push({
            id: m.id,
            titulo: m.titulo,
            file_name: m.file_name,
            file_size: m.file_size,
            file_type: m.file_type,
            storage_path: m.storage_path,
            bucket: "documentos-manuais",
            origem: "manual",
            origem_titulo: m.titulo,
            created_at: m.created_at,
          });
        }
      }

      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return result;
    },
  });

  const uploadManual = useMutation({
    mutationFn: async ({ file, titulo }: { file: File; titulo: string }) => {
      const path = `${tenantId}/${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage
        .from("documentos-manuais")
        .upload(path, file);
      if (upErr) throw upErr;

      const { error: dbErr } = await supabase.from("documentos_manuais" as any).insert({
        titulo,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        storage_path: path,
        tenant_id: tenantId,
      } as any);
      if (dbErr) throw dbErr;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documentos-unificados"] }),
  });

  const deleteManual = useMutation({
    mutationFn: async (doc: DocumentoUnificado) => {
      await supabase.storage.from("documentos-manuais").remove([doc.storage_path]);
      await supabase.from("documentos_manuais" as any).delete().eq("id", doc.id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documentos-unificados"] }),
  });

  const getPublicUrl = (doc: DocumentoUnificado) => {
    const { data } = supabase.storage.from(doc.bucket).getPublicUrl(doc.storage_path);
    return data.publicUrl;
  };

  return { docs, isLoading, uploadManual, deleteManual, getPublicUrl };
}
