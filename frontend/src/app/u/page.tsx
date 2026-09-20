"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Github, Linkedin, ShieldCheck, Trophy, UserPlus, Users } from "lucide-react";
import { api, PublicProfileResponse, resolveMediaUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { BadgeItem } from "@/components/common/BadgeItem";

export default function PublicProfilePage() {
  const auth = useAuth();
  const [username, setUsername] = useState("");
  const [profile, setProfile] = useState<PublicProfileResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const value = params.get("username") || "";
    setUsername(value);
  }, []);

  useEffect(() => {
    if (!username) return;
    api.getPublicProfile(username, auth.accessToken)
      .then(setProfile)
      .catch((err) => setError(err.message));
  }, [auth.accessToken, username]);

  const toggleFollow = async () => {
    if (!profile || !auth.accessToken) return;
    setBusy(true);
    try {
      const nextSocial = profile.social.relationship === "following" || profile.social.relationship === "friends"
        ? await api.unfollowUser(profile.username, auth.accessToken)
        : await api.followUser(profile.username, auth.accessToken);
      setProfile({ ...profile, social: nextSocial });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update follow state.");
    } finally {
      setBusy(false);
    }
  };

  if (!username) {
    return <div className="rounded-2xl border border-border bg-surface p-6 text-sm text-text-muted">No profile username was provided.</div>;
  }

  if (error) {
    return <div className="rounded-2xl border border-accent-coral/30 bg-accent-coral/10 p-4 text-accent-coral">{error}</div>;
  }

  if (!profile) {
    return <div className="rounded-2xl border border-border bg-surface p-6 text-sm text-text-muted">Loading profile...</div>;
  }

  const avatar = resolveMediaUrl(profile.avatar_url);
  const earnedBadges = profile.gamification.badges.filter((badge) => badge.unlocked);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-surface p-6 shadow-card">
        <div className="flex flex-col md:flex-row gap-6 md:items-start md:justify-between">
          <div className="flex gap-4">
            <div className="w-20 h-20 rounded-2xl bg-fill border border-border overflow-hidden flex items-center justify-center text-2xl font-bold">
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatar} alt={`${profile.username} profile picture`} className="w-full h-full object-cover" />
              ) : (
                <span>{profile.username.slice(0, 2).toUpperCase()}</span>
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight">{profile.name || profile.username}</h1>
              <p className="text-sm font-mono text-text-muted">@{profile.username}</p>
              {profile.bio && <p className="mt-3 text-sm text-text-muted max-w-2xl leading-relaxed">{profile.bio}</p>}
              <div className="flex flex-wrap gap-2 mt-4">
                {profile.linkedin_url && (
                  <a href={profile.linkedin_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs hover:bg-fill">
                    <Linkedin size={14} /> LinkedIn <ExternalLink size={12} />
                  </a>
                )}
                {profile.github_url && (
                  <a href={profile.github_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs hover:bg-fill">
                    <Github size={14} /> GitHub <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-start md:items-end gap-3">
            <div className="flex gap-4 text-sm">
              <div><span className="font-semibold">{profile.social.followers_count}</span> <span className="text-text-muted">Followers</span></div>
              <div><span className="font-semibold">{profile.social.following_count}</span> <span className="text-text-muted">Following</span></div>
            </div>
            {profile.is_current_user ? (
              <Link href="/profile/edit" className="rounded-xl bg-accent-blue text-white px-4 py-2 text-sm font-semibold">Edit Profile</Link>
            ) : auth.accessToken ? (
              <button
                type="button"
                onClick={toggleFollow}
                disabled={busy}
                className="rounded-xl bg-accent-blue text-white px-4 py-2 text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-60"
              >
                <UserPlus size={15} />
                {profile.social.relationship === "friends" ? "Friends" : profile.social.relationship === "following" ? "Following" : "Follow"}
              </button>
            ) : (
              <Link href="/login" className="rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-fill">Login to follow</Link>
            )}
          </div>
        </div>
      </section>

      <section className="grid md:grid-cols-4 gap-4">
        {[
          ["Total XP", profile.gamification.total_xp],
          ["Level", profile.gamification.level],
          ["Current Streak", `${profile.gamification.current_streak}d`],
          ["Quests", profile.gamification.quests_completed],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-border bg-surface p-4">
            <div className="text-xs text-text-muted">{label}</div>
            <div className="text-2xl font-bold mt-1">{value}</div>
          </div>
        ))}
      </section>

      <section className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
          <div className="flex items-center gap-2 font-semibold"><Trophy size={18} className="text-accent-amber" /> Achievements</div>
          {profile.gamification.achievements.length ? (
            <div className="space-y-2">
              {profile.gamification.achievements.map((badge) => (
                <div key={badge.id} className="flex items-start gap-3 rounded-xl bg-fill p-3">
                  <ShieldCheck size={16} className="text-accent-green mt-0.5" />
                  <div>
                    <div className="text-sm font-semibold">{badge.name}</div>
                    <div className="text-xs text-text-muted">{badge.description}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-muted">No earned achievements yet.</p>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
          <div className="flex items-center gap-2 font-semibold"><Users size={18} className="text-accent-blue" /> Badges</div>
          {earnedBadges.length ? (
            <div className="grid sm:grid-cols-2 gap-2">
              {earnedBadges.map((badge) => (
                <BadgeItem key={badge.id} id={badge.id} name={badge.name} description={badge.description} icon={badge.icon} unlocked={badge.unlocked} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-muted">No badges unlocked yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
