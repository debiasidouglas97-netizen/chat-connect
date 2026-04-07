import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";

export interface DocumentoArquivo {
  id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  storage_path: string;
  bucket: string;
  created_at: string;
}

export interface DocumentoGrupo {
  key: string;
  titulo: string;
  origem: "emenda" | "demanda" | "manual";
  origem_id: string;
  arquivos: DocumentoArquivo[];
  created_at: string; // oldest file date for sorting
}

export function useDocumentos() {
  const { tenantId } = useTenant();
  const qc = useQueryClient();

  const { data: grupos = [], isLoading } = useQuery({
    queryKey: ["documentos-unificados", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const grupoMap = new Map<string, DocumentoGrupo>();

      // 1) Emenda attachments
      const { data: tenantEmendas } = await supabase
        .from("emendas")
        .select("id, titulo, cidade, tipo")
        .eq("tenant_id", tenantId!);

      const emendaMap = new Map((tenantEmendas || []).map((e) => [e.id, e]));
      const emendaIdList = (tenantEmendas || []).map((e) => e.id);

      if (emendaIdList.length > 0) {
        const { data } = await supabase
          .from("emenda_attachments")
          .select("id, file_name, file_size, file_type, storage_path, created_at, emenda_id")
          .in("emenda_id", emendaIdList);

        for (const att of data || []) {
          const em = emendaMap.get(att.emenda_id);
          const key = `emenda-${att.emenda_id}`;
          if (!grupoMap.has(key)) {
            grupoMap.set(key, {
              key,
              titulo: em?.titulo || `${em?.tipo} — ${em?.cidade}` || "Emenda",
              origem: "emenda",
              origem_id: att.emenda_id,
              arquivos: [],
              created_at: att.created_at,
            });
          }
          grupoMap.get(key)!.arquivos.push({
            id: att.id,
            file_name: att.file_name,
            file_size: att.file_size,
            file_type: att.file_type,
            storage_path: att.storage_path,
            bucket: "emenda-attachments",
            created_at: att.created_at,
          });
        }
      }

      // 2) Demanda attachments
      const { data: tenantDemandas } = await supabase
        .from("demandas")
        .select("id, title")
        .eq("tenant_id", tenantId!);

      const demandaMap = new Map((tenantDemandas || []).map((d) => [d.id, d]));
      const demandaIdList = (tenantDemandas || []).map((d) => d.id);

      if (demandaIdList.length > 0) {
        const { data } = await supabase
          .from("demanda_attachments")
          .select("id, file_name, file_size, file_type, storage_path, created_at, demanda_id")
          .in("demanda_id", demandaIdList);

        for (const att of data || []) {
          const dem = demandaMap.get(att.demanda_id);
          const key = `demanda-${att.demanda_id}`;
          if (!grupoMap.has(key)) {
            grupoMap.set(key, {
              key,
              titulo: dem?.title || "Demanda",
              origem: "demanda",
              origem_id: att.demanda_id,
              arquivos: [],
              created_at: att.created_at,
            });
          }
          grupoMap.get(key)!.arquivos.push({
            id: att.id,
            file_name: att.file_name,
            file_size: att.file_size,
            file_type: att.file_type,
            storage_path: att.storage_path,
            bucket: "demanda-attachments",
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
          const key = `manual-${m.id}`;
          grupoMap.set(key, {
            key,
            titulo: m.titulo,
            origem: "manual",
            origem_id: m.id,
            arquivos: [{
              id: m.id,
              file_name: m.file_name,
              file_size: m.file_size,
              file_type: m.file_type,
              storage_path: m.storage_path,
              bucket: "documentos-manuais",
              created_at: m.created_at,
            }],
            created_at: m.created_at,
          });
        }
      }

      const result = Array.from(grupoMap.values());
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
    mutationFn: async (doc: { id: string; storage_path: string }) => {
      await supabase.storage.from("documentos-manuais").remove([doc.storage_path]);
      await supabase.from("documentos_manuais" as any).delete().eq("id", doc.id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documentos-unificados"] }),
  });

  const getPublicUrl = (bucket: string, storagePath: string) => {
    const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath);
    return data.publicUrl;
  };

  return { grupos, isLoading, uploadManual, deleteManual, getPublicUrl };
}
