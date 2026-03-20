import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface DeputyProfile {
  id: string;
  full_name: string;
  public_name: string | null;
  party: string;
  state: string;
  regions: string[];
  priority_cities: string[];
  focus_areas: string[];
  bio: string | null;
  institutional_message: string | null;
  avatar_url: string | null;
  logo_url: string | null;
  primary_color: string;
  created_at: string;
  updated_at: string;
}

export function useDeputyProfile() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["deputy-profile"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deputy_profile")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as DeputyProfile | null;
    },
  });

  const upsert = useMutation({
    mutationFn: async (profile: Partial<DeputyProfile>) => {
      const existing = query.data;
      if (existing?.id) {
        const { data, error } = await supabase
          .from("deputy_profile")
          .update({ ...profile, updated_at: new Date().toISOString() })
          .eq("id", existing.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("deputy_profile")
          .insert([profile as any])
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deputy-profile"] });
      toast.success("Perfil salvo com sucesso!");
    },
    onError: (err: Error) => {
      toast.error("Erro ao salvar: " + err.message);
    },
  });

  const uploadAvatar = async (file: File): Promise<string> => {
    const ext = file.name.split(".").pop();
    const path = `deputy-avatar-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, {
      upsert: true,
    });
    if (error) throw error;
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    return data.publicUrl;
  };

  return {
    profile: query.data,
    isLoading: query.isLoading,
    upsert,
    uploadAvatar,
  };
}
