"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Chrome } from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await auth.signInWithEmail(email, password);
      router.push("/profile/edit");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-10">
      <div className="rounded-2xl bg-surface border border-border p-6 shadow-card space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Welcome back</h1>
          <p className="text-sm text-text-muted mt-1">Sign in to sync your HackPilot profile, friends, and leaderboard progress.</p>
        </div>

        {auth.configError && (
          <div className="rounded-xl border border-accent-amber/30 bg-accent-amber/10 p-3 text-xs text-accent-amber">
            {auth.configError}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block text-sm font-medium">
            Email
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              required
              className="mt-1 w-full rounded-xl border border-border bg-fill px-3 py-2 text-sm focus-visible:outline-none"
            />
          </label>
          <label className="block text-sm font-medium">
            Password
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              required
              minLength={6}
              className="mt-1 w-full rounded-xl border border-border bg-fill px-3 py-2 text-sm focus-visible:outline-none"
            />
          </label>

          {error && <p className="text-sm text-accent-coral" role="alert">{error}</p>}

          <button
            type="submit"
            disabled={loading || !auth.configured}
            className="w-full h-11 rounded-xl bg-accent-blue text-white text-sm font-semibold disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => auth.signInWithGoogle().catch((err) => setError(err.message))}
          disabled={!auth.configured}
          className="w-full h-11 rounded-xl border border-border bg-surface text-sm font-semibold flex items-center justify-center gap-2 hover:bg-fill disabled:opacity-50"
        >
          <Chrome size={16} />
          Continue with Google
        </button>

        <p className="text-sm text-text-muted">
          New to HackPilot?{" "}
          <Link href="/signup" className="text-accent-blue font-medium hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
