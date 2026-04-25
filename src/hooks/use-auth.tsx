import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
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

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  linkedLideranca: LinkedLideranca | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  fetchProfile: (userId: string) => Promise<void>;
  userAvatarUrl: string | null;
  userDisplayName: string;
  userInitials: string;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
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
  const userDisplayName = (profile?.role === "lideranca" && linkedLideranca?.name)
    ? linkedLideranca.name
    : (profile?.full_name || linkedLideranca?.name || "Usuário");
  const userInitials = getInitials(userDisplayName);

  const value: AuthContextValue = {
    user, session, profile, linkedLideranca, loading,
    signIn, signUp, signOut, isAdmin, fetchProfile,
    userAvatarUrl, userDisplayName, userInitials,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
