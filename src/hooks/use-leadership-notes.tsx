import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type NoteTag = "relacionamento" | "politico" | "conflito" | "apoio" | "alerta" | "estrategico";

export interface LeadershipNote {
  id: string;
  lideranca_name: string;
  text: string;
  tag: NoteTag | null;
  author: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export function useLeadershipNotes(liderancaName: string) {
  const queryClient = useQueryClient();
  const queryKey = ["leadership-notes", liderancaName];

  const { data: notes = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leadership_notes")
        .select("*")
        .eq("lideranca_name", liderancaName)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as LeadershipNote[];
    },
    enabled: !!liderancaName,
  });

  const addNote = useMutation({
    mutationFn: async (note: { text: string; tag?: NoteTag; author?: string }) => {
      const { error } = await supabase.from("leadership_notes").insert({
        lideranca_name: liderancaName,
        text: note.text,
        tag: note.tag || null,
        author: note.author || "Gabinete",
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const updateNote = useMutation({
    mutationFn: async (note: { id: string; text?: string; tag?: NoteTag | null; is_pinned?: boolean }) => {
      const { id, ...updates } = note;
      const { error } = await supabase.from("leadership_notes").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("leadership_notes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return { notes, isLoading, addNote, updateNote, deleteNote };
}
