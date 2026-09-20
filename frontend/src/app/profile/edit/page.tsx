"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Trash2 } from "lucide-react";
import { api, resolveMediaUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function EditProfilePage() {
  const router = useRouter();
  const auth = useAuth();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!auth.loading && !auth.accessToken) {
      router.replace("/login");
    }
  }, [auth.accessToken, auth.loading, router]);

  useEffect(() => {
    if (!auth.profile) return;
    setName(auth.profile.name || "");
    setUsername(auth.profile.username || "");
    setBio(auth.profile.bio || "");
    setLinkedinUrl(auth.profile.linkedin_url || "");
    setGithubUrl(auth.profile.github_url || "");
  }, [auth.profile]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!auth.accessToken) return;
    setError(null);
    setSaved(false);
    setLoading(true);
    try {
      await api.updateMe(auth.accessToken, {
        name,
        username,
        bio,
        linkedin_url: linkedinUrl || null,
        github_url: githubUrl || null,
      });
      await auth.refreshProfile();
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save profile.");
    } finally {
      setLoading(false);
    }
  };

  const onAvatarChange = async (file?: File) => {
    if (!file || !auth.accessToken) return;
    setError(null);
    const form = new FormData();
    form.append("file", file);
    try {
      await api.uploadAvatar(auth.accessToken, form);
      await auth.refreshProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload profile picture.");
    }
  };

  const removeAvatar = async () => {
    if (!auth.accessToken) return;
    setError(null);
    try {
      await api.removeAvatar(auth.accessToken);
      await auth.refreshProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove profile picture.");
    }
  };

  const avatar = resolveMediaUrl(auth.profile?.avatar_url);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Edit Profile</h1>
        <p className="text-sm text-text-muted mt-1">Tune the identity other HackPilot users see on profiles and leaderboards.</p>
      </div>

      <form onSubmit={onSubmit} className="rounded-2xl border border-border bg-surface p-6 shadow-card space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
          <div className="w-20 h-20 rounded-2xl border border-border bg-fill overflow-hidden flex items-center justify-center font-bold text-xl">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt="Your profile picture" className="w-full h-full object-cover" />
            ) : (
              <span>{username.slice(0, 2).toUpperCase() || "HP"}</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex items-center gap-2 rounded-xl bg-accent-blue text-white px-4 py-2 text-sm font-semibold cursor-pointer">
              <Camera size={15} />
              Upload Picture
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(event) => onAvatarChange(event.target.files?.[0])}
              />
            </label>
            <button type="button" onClick={removeAvatar} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-fill">
              <Trash2 size={15} />
              Remove
            </button>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block text-sm font-medium">
            Name
            <input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} className="mt-1 w-full rounded-xl border border-border bg-fill px-3 py-2 text-sm" />
          </label>
          <label className="block text-sm font-medium">
            Username
            <input value={username} onChange={(event) => setUsername(event.target.value.toLowerCase())} required pattern="[a-z0-9_][a-z0-9_-]{2,29}" className="mt-1 w-full rounded-xl border border-border bg-fill px-3 py-2 text-sm font-mono" />
            <span className="mt-1 block text-xs text-text-muted">3-30 lowercase letters, numbers, underscores, or hyphens.</span>
          </label>
        </div>

        <label className="block text-sm font-medium">
          Email
          <input value={auth.profile?.email || auth.user?.email || ""} readOnly className="mt-1 w-full rounded-xl border border-border bg-fill px-3 py-2 text-sm text-text-muted" />
          <span className="mt-1 block text-xs text-text-muted">Email is managed by Supabase Auth.</span>
        </label>

        <label className="block text-sm font-medium">
          Bio
          <textarea value={bio} onChange={(event) => setBio(event.target.value)} maxLength={280} rows={4} className="mt-1 w-full rounded-xl border border-border bg-fill px-3 py-2 text-sm resize-none" />
        </label>

        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block text-sm font-medium">
            LinkedIn
            <input value={linkedinUrl} onChange={(event) => setLinkedinUrl(event.target.value)} type="url" className="mt-1 w-full rounded-xl border border-border bg-fill px-3 py-2 text-sm" placeholder="https://www.linkedin.com/in/..." />
          </label>
          <label className="block text-sm font-medium">
            GitHub
            <input value={githubUrl} onChange={(event) => setGithubUrl(event.target.value)} type="url" className="mt-1 w-full rounded-xl border border-border bg-fill px-3 py-2 text-sm" placeholder="https://github.com/..." />
          </label>
        </div>

        {error && <p className="text-sm text-accent-coral" role="alert">{error}</p>}
        {saved && <p className="text-sm text-accent-green" role="status">Profile saved.</p>}

        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={loading || !auth.accessToken} className="rounded-xl bg-accent-blue text-white px-5 py-2 text-sm font-semibold disabled:opacity-60">
            {loading ? "Saving..." : "Save Profile"}
          </button>
          {auth.profile?.username && (
            <button type="button" onClick={() => router.push(`/u?username=${encodeURIComponent(auth.profile?.username || "")}`)} className="rounded-xl border border-border px-5 py-2 text-sm font-semibold hover:bg-fill">
              View Public Profile
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
