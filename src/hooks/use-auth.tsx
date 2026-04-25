import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export type AppRole = "deputado" | "chefe_gabinete" | "secretario" | "lideranca" | "super_admin";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: AppRole;
  lideranca_id: string | null;
  avatar_url: string | null;
  cities: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LinkedLideranca {
  id: string;
  name: string;
  avatar_url: string | null;
  img: string;
  cidade_principal: string;
  cargo: string;
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || "U";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [linkedLideranca, setLinkedLideranca] = useState<LinkedLideranca | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (data) {
      const p = data as unknown as Profile;
      setProfile(p);
      if (p.lideranca_id) {
        const { data: lid } = await supabase
          .from("liderancas")
          .select("id, name, avatar_url, img, cidade_principal, cargo")
          .eq("id", p.lideranca_id)
          .single();
        if (lid) setLinkedLideranca(lid);
        else setLinkedLideranca(null);
      } else {
        setLinkedLideranca(null);
      }
    } else {
      setProfile(null);
      setLinkedLideranca(null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (!mounted) return;
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession?.user) {
          // Defer to avoid deadlocks with Supabase auth callback
          setTimeout(async () => {
            await fetchProfile(newSession.user.id);
            if (mounted) setLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setLinkedLideranca(null);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      if (!mounted) return;
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      if (initialSession?.user) {
        await fetchProfile(initialSession.user.id);
      }
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setLinkedLideranca(null);
  };

  const isAdmin = profile?.role === "deputado" || profile?.role === "chefe_gabinete";

  const userAvatarUrl = profile?.avatar_url || linkedLideranca?.avatar_url || linkedLideranca?.img || null;
  // Para lideranças, prioriza o nome da liderança vinculada (mais reconhecível que o full_name do profile)
  const userDisplayName = (profile?.role === "lideranca" && linkedLideranca?.name)
    ? linkedLideranca.name
    : (profile?.full_name || linkedLideranca?.name || "Usuário");
  const userInitials = getInitials(userDisplayName);

  return {
    user, session, profile, linkedLideranca, loading,
    signIn, signUp, signOut, isAdmin, fetchProfile,
    userAvatarUrl, userDisplayName, userInitials,
  };
}
