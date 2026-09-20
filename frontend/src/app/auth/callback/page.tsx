"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, supabaseConfigError } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setError(supabaseConfigError ?? "Supabase Auth is not configured.");
      return;
    }
    const client = supabase;

    const finishLogin = async () => {
      const params = new URLSearchParams(window.location.search);
      const oauthError = params.get("error_description") || params.get("error");
      if (oauthError) {
        setError(oauthError);
        return;
      }

      const code = params.get("code");
      if (code) {
        const { error: exchangeError } = await client.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          setError(exchangeError.message);
          return;
        }
      }

      const { data, error: sessionError } = await client.auth.getSession();
      if (sessionError) {
        setError(sessionError.message);
        return;
      }
      if (!data.session) {
        setError("No authenticated session was returned. Please try signing in again.");
        return;
      }

      router.replace("/profile/edit");
    };

    finishLogin();
  }, [router]);

  return (
    <div className="max-w-md mx-auto py-16">
      <div className="rounded-2xl bg-surface border border-border p-6 shadow-card">
        <h1 className="text-xl font-bold">Finishing login</h1>
        <p className="text-sm text-text-muted mt-2">
          {error ?? "Hang tight while HackPilot verifies your session."}
        </p>
      </div>
    </div>
  );
}
