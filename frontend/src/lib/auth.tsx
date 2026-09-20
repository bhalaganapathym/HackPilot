"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { api, PublicProfileResponse } from "@/lib/api";
import { isSupabaseConfigured, supabase, supabaseConfigError } from "@/lib/supabase";

interface AuthContextValue {
  configured: boolean;
  configError: string | null;
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: PublicProfileResponse | null;
  accessToken: string | null;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<PublicProfileResponse | null>(null);

  const accessToken = session?.access_token ?? null;

  const refreshProfile = useCallback(async () => {
    if (!accessToken) {
      setProfile(null);
      return;
    }
    const data = await api.getMe(accessToken);
    setProfile(data);
  }, [accessToken]);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession) {
        setProfile(null);
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!accessToken) return;
    refreshProfile().catch(() => {});
  }, [accessToken, refreshProfile]);

  const value = useMemo<AuthContextValue>(() => ({
    configured: isSupabaseConfigured,
    configError: supabaseConfigError,
    loading,
    session,
    user: session?.user ?? null,
    profile,
    accessToken,
    async signInWithEmail(email: string, password: string) {
      if (!supabase) throw new Error("Supabase Auth is not configured.");
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
    },
    async signUpWithEmail(email: string, password: string) {
      if (!supabase) throw new Error("Supabase Auth is not configured.");
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw new Error(error.message);
    },
    async signInWithGoogle() {
      if (!supabase) throw new Error("Supabase Auth is not configured.");
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw new Error(error.message);
    },
    async signOut() {
      if (!supabase) return;
      await supabase.auth.signOut();
      setProfile(null);
    },
    refreshProfile,
  }), [accessToken, loading, profile, refreshProfile, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }
  return context;
}
