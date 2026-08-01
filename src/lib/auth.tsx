"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { supabase, supabaseConfigured } from "@/lib/supabase";

export interface Account {
  id: string;
  email: string | null;
  name: string;
  avatarUrl: string | null;
}

interface AuthApi {
  account: Account | null;
  loading: boolean;
  /** Accounts are only possible when Supabase is configured. */
  accountsAvailable: boolean;
  signInWithGoogle(): Promise<string | null>;
  /** Sends a magic link; returns an error string or null on success. */
  signInWithEmail(email: string): Promise<string | null>;
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthApi | null>(null);

function toAccount(user: User): Account {
  const meta = user.user_metadata ?? {};
  return {
    id: user.id,
    email: user.email ?? null,
    name:
      (meta.full_name as string) ||
      (meta.name as string) ||
      user.email?.split("@")[0] ||
      "Cook",
    avatarUrl: (meta.avatar_url as string) ?? null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(supabaseConfigured);

  useEffect(() => {
    const sb = supabase();
    if (!sb) return;
    void sb.auth.getSession().then(({ data }) => {
      setAccount(data.session ? toAccount(data.session.user) : null);
      setLoading(false);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => {
      setAccount(session ? toAccount(session.user) : null);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const sb = supabase();
    if (!sb) return "Accounts aren't available yet.";
    const { error } = await sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/account` },
    });
    return error ? error.message : null;
  }, []);

  const signInWithEmail = useCallback(async (email: string) => {
    const sb = supabase();
    if (!sb) return "Accounts aren't available yet.";
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/account` },
    });
    return error ? error.message : null;
  }, []);

  const signOut = useCallback(async () => {
    await supabase()?.auth.signOut();
    setAccount(null);
  }, []);

  const value = useMemo<AuthApi>(
    () => ({
      account,
      loading,
      accountsAvailable: supabaseConfigured,
      signInWithGoogle,
      signInWithEmail,
      signOut,
    }),
    [account, loading, signInWithGoogle, signInWithEmail, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthApi {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
