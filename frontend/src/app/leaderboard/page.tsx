"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Flame, Medal, UserPlus, Users } from "lucide-react";
import { api, LeaderboardEntry, resolveMediaUrl, SocialSummary } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function LeaderboardPage() {
  const auth = useAuth();
  const [scope, setScope] = useState<"global" | "friends">("global");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.getLeaderboard(scope, auth.accessToken)
      .then((data) => setEntries(data.entries))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [auth.accessToken, scope]);

  const updateRelationship = (username: string, relationship: SocialSummary["relationship"]) => {
    setEntries((current) => current.map((entry) => (
      entry.user.username === username ? { ...entry, relationship } : entry
    )));
  };

  return (
    <div className="max-w-[1200px] w-full mx-auto px-4 sm:px-8 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-white/10 pb-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-mono font-bold text-cyber-yellow uppercase tracking-widest">
            <Medal size={14} />
            <span>Competitive Standings</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            Leaderboard
          </h1>
          <p className="text-sm text-zinc-400 mt-1 max-w-xl">
            Ranked by authoritative HackPilot XP from the live gamification engine. Complete quests and defend against Red Team to climb.
          </p>
        </div>
        <div className="inline-flex rounded-full border border-white/10 bg-void-gray/70 p-1 w-fit backdrop-blur-md">
          {(["global", "friends"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setScope(option)}
              className={`px-5 py-2 rounded-full text-xs font-extrabold capitalize transition-all active:scale-95 ${
                scope === option
                  ? "bg-cyber-yellow text-black shadow-md"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <section className="rounded-[32px] border border-white/10 bg-void-charcoal/85 shadow-2xl backdrop-blur-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm font-mono text-zinc-400">Loading live rankings...</div>
        ) : error ? (
          <div className="p-8 text-center text-sm text-rose-400 font-bold">{error}</div>
        ) : entries.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Users className="mx-auto text-zinc-500" size={32} />
            <h2 className="font-extrabold text-lg text-white">{scope === "friends" ? "No friends ranked yet" : "No pilots ranked yet"}</h2>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              {scope === "friends" ? "Mutual follows become friends and appear here." : "Profiles will appear here after users sign in."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {entries.map((entry) => (
              <LeaderboardRow
                key={entry.user.id}
                entry={entry}
                accessToken={auth.accessToken}
                onRelationshipChange={updateRelationship}
                onError={setError}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function LeaderboardRow({
  entry,
  accessToken,
  onRelationshipChange,
  onError,
}: {
  entry: LeaderboardEntry;
  accessToken?: string | null;
  onRelationshipChange: (username: string, relationship: SocialSummary["relationship"]) => void;
  onError: (message: string | null) => void;
}) {
  const avatar = resolveMediaUrl(entry.user.avatar_url);
  const [busy, setBusy] = useState(false);
  const isFollowing = entry.relationship === "following" || entry.relationship === "friends";
  const actionLabel = entry.relationship === "friends" ? "Friends" : isFollowing ? "Following" : "Follow";

  const handleFollowToggle = async () => {
    if (!accessToken || entry.is_current_user || busy) return;
    setBusy(true);
    try {
      const social = isFollowing
        ? await api.unfollowUser(entry.user.username, accessToken)
        : await api.followUser(entry.user.username, accessToken);
      onRelationshipChange(entry.user.username, social.relationship);
      onError(null);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not update follow status.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={`grid grid-cols-[44px_1fr_auto] sm:grid-cols-[56px_1fr_120px_132px] gap-3 items-center p-5 hover:bg-white/5 transition-colors ${
        entry.is_current_user ? "bg-cyber-yellow/10 border-l-4 border-l-cyber-yellow" : ""
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm font-bold text-zinc-400">#{entry.rank}</span>
        {entry.rank <= 3 && <Medal size={16} className="text-cyber-yellow" />}
      </div>
      <Link
        href={`/u?username=${encodeURIComponent(entry.user.username)}`}
        className="flex items-center gap-3 min-w-0 rounded-full focus:outline-none"
      >
        <div className="w-10 h-10 rounded-full border border-white/10 bg-white/5 overflow-hidden flex items-center justify-center text-sm font-black shrink-0 text-cyber-yellow">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt={`${entry.user.username} profile picture`} className="w-full h-full object-cover" />
          ) : (
            <span>{entry.user.username.slice(0, 2).toUpperCase()}</span>
          )}
        </div>
        <div className="min-w-0">
          <div className="font-bold text-white truncate">{entry.user.name || entry.user.username}</div>
          <div className="text-xs text-zinc-400 font-mono truncate">@{entry.user.username}</div>
        </div>
      </Link>
      <div className="text-right">
        <div className="font-mono font-black text-cyber-yellow">{entry.total_xp} XP</div>
        <div className="text-xs text-zinc-400 font-mono">Level {entry.level}</div>
      </div>
      <div className="col-span-3 sm:col-span-1 flex sm:justify-end items-center gap-2">
        <div className="hidden sm:flex items-center gap-1 text-xs text-cyber-yellow font-mono font-bold mr-2">
          <Flame size={14} className="fill-cyber-yellow" />
          {entry.streak_days}d
        </div>
        {entry.is_current_user ? (
          <span className="h-8 inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3.5 text-xs font-bold text-cyber-yellow">
            You
          </span>
        ) : accessToken ? (
          <button
            type="button"
            onClick={handleFollowToggle}
            disabled={busy}
            className={`h-8 inline-flex items-center gap-1.5 rounded-full border px-4 text-xs font-bold transition-all disabled:opacity-60 active:scale-95 ${
              isFollowing
                ? "border-white/15 bg-white/5 text-zinc-300 hover:border-rose-400 hover:text-rose-400"
                : "border-cyber-yellow bg-cyber-yellow text-black hover:bg-cyber-yellow-hover shadow-yellow-glow"
            }`}
            aria-label={`${actionLabel} ${entry.user.username}`}
          >
            {isFollowing ? <Check size={14} /> : <UserPlus size={14} />}
            {busy ? "Saving" : actionLabel}
          </button>
        ) : (
          <Link
            href="/login"
            className="h-8 inline-flex items-center rounded-full border border-white/15 px-4 text-xs font-bold text-zinc-400 hover:text-white hover:bg-white/10"
          >
            Login
          </Link>
        )}
      </div>
    </div>
  );
}
