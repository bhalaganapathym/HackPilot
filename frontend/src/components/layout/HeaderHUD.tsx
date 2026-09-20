"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flame,
  Moon,
  Sun,
  Volume2,
  VolumeX,
  Compass,
  MoreHorizontal,
  Users
} from "lucide-react";
import { api, ProfileResponse } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { sounds } from "@/lib/sounds";
import { BadgeItem } from "../common/BadgeItem";
import { SegmentedControl } from "../common/SegmentedControl";

interface HeaderHUDProps {
  onOpenJuryMode?: () => void;
  onOpenCommandPalette?: () => void;
}

export const HeaderHUD: React.FC<HeaderHUDProps> = ({
  onOpenJuryMode,
  onOpenCommandPalette,
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();

  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [showProfilePopover, setShowProfilePopover] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const popoverRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);

  // Close popovers on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowProfilePopover(false);
      }
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch profile
  const fetchProfile = async () => {
    try {
      const data = await api.getProfile();
      setProfile(data);
    } catch {
      // Offline fallback
    }
  };

  useEffect(() => {
    fetchProfile();
    // Theme sync
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "dark" : "light");
    setSoundEnabled(sounds.enabled);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
      localStorage.setItem("hackpilot_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      localStorage.setItem("hackpilot_theme", "light");
    }
  };

  const toggleSound = () => {
    const nextVal = sounds.toggleSound();
    setSoundEnabled(nextVal);
  };

  const isOrganizer = pathname.startsWith("/organizer");
  const gamification = auth.profile?.gamification;
  const xpLevel = gamification?.level ?? profile?.level ?? 1;
  const totalXp = gamification?.total_xp ?? profile?.total_xp ?? 0;
  const streakDays = gamification?.current_streak ?? profile?.streak_days ?? 1;
  const progressPercent = gamification?.progress_percent ?? profile?.progress_percent ?? 30;
  const nextLevelXp = gamification?.next_level_xp ?? profile?.next_level_xp ?? 100;
  const badges = gamification?.badges ?? profile?.badges ?? [];

  const handleModeChange = (mode: "participant" | "organizer") => {
    if (mode === "organizer") {
      router.push("/organizer");
    } else {
      router.push("/");
    }
    setShowMoreMenu(false);
  };

  // Mock League Leaderboard for Popover
  const leaguePlayers = [
    { rank: 1, name: "team_hyperion", xp: 1420, active: false },
    { rank: 2, name: "hack_ninja", xp: 1180, active: false },
    { rank: 3, name: auth.profile?.username ? `@${auth.profile.username}` : "You (Pilot)", xp: totalXp || 350, active: true },
    { rank: 4, name: "dev_sprint", xp: 290, active: false },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#0A0A0A]/80 backdrop-blur-2xl transition-colors">
      <div className="max-w-[1200px] mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group focus-visible:outline-none">
            <div className="w-8 h-8 rounded-full bg-cyber-yellow text-black flex items-center justify-center font-black text-xs tracking-wider shadow-yellow-glow group-hover:scale-105 active:scale-95 transition-all">
              HP
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-base tracking-tight text-white group-hover:text-cyber-yellow transition-colors leading-tight">
                HackPilot
              </span>
              <span className="text-[9px] uppercase tracking-widest text-zinc-400 font-semibold leading-none">
                AI Co-Pilot
              </span>
            </div>
          </Link>

          {/* Navigation Links - Pill Style */}
          <nav className="hidden lg:flex items-center gap-1.5 text-xs font-semibold">
            <Link
              href="/abstract"
              className={`px-3.5 py-1.5 rounded-full transition-all active:scale-95 ${
                pathname === "/abstract"
                  ? "bg-cyber-yellow text-black shadow-md font-bold"
                  : "text-zinc-400 hover:text-white hover:bg-white/10"
              }`}
            >
              Abstract
            </Link>
            <Link
              href="/problem"
              className={`px-3.5 py-1.5 rounded-full transition-all active:scale-95 ${
                pathname === "/problem"
                  ? "bg-cyber-yellow text-black shadow-md font-bold"
                  : "text-zinc-400 hover:text-white hover:bg-white/10"
              }`}
            >
              Problem
            </Link>
            <Link
              href="/redteam"
              className={`px-3.5 py-1.5 rounded-full transition-all active:scale-95 ${
                pathname === "/redteam"
                  ? "bg-cyber-yellow text-black shadow-md font-bold"
                  : "text-zinc-400 hover:text-white hover:bg-white/10"
              }`}
            >
              Red Team
            </Link>
            <Link
              href="/judge"
              className={`px-3.5 py-1.5 rounded-full transition-all active:scale-95 ${
                pathname === "/judge"
                  ? "bg-cyber-yellow text-black shadow-md font-bold"
                  : "text-zinc-400 hover:text-white hover:bg-white/10"
              }`}
            >
              Judge Sim
            </Link>
            <Link
              href="/duel"
              className={`px-3.5 py-1.5 rounded-full transition-all active:scale-95 ${
                pathname === "/duel"
                  ? "bg-cyber-yellow text-black shadow-md font-bold"
                  : "text-zinc-400 hover:text-white hover:bg-white/10"
              }`}
            >
              Duel
            </Link>
            <Link
              href="/rapid-fire"
              className={`px-3.5 py-1.5 rounded-full transition-all active:scale-95 ${
                pathname === "/rapid-fire"
                  ? "bg-cyber-yellow text-black shadow-md font-bold"
                  : "text-zinc-400 hover:text-white hover:bg-white/10"
              }`}
            >
              Rapid Fire
            </Link>
            <Link
              href="/pitch-deck"
              className={`px-3.5 py-1.5 rounded-full transition-all active:scale-95 ${
                pathname === "/pitch-deck"
                  ? "bg-cyber-yellow text-black shadow-md font-bold"
                  : "text-zinc-400 hover:text-white hover:bg-white/10"
              }`}
            >
              Pitch Deck
            </Link>
            <Link
              href="/leaderboard"
              className={`px-3.5 py-1.5 rounded-full transition-all active:scale-95 ${
                pathname === "/leaderboard"
                  ? "bg-cyber-yellow text-black shadow-md font-bold"
                  : "text-zinc-400 hover:text-white hover:bg-white/10"
              }`}
            >
              Leaderboard
            </Link>
          </nav>
        </div>

        {/* Right HUD elements */}
        <div className="flex items-center gap-3">
          {/* Quick Command Key Hint */}
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="hidden sm:flex items-center px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-[11px] text-zinc-400 hover:text-white hover:bg-white/10 transition-all active:scale-95 focus-visible:outline-none"
            title="Open Command Palette (Cmd/Ctrl + K)"
          >
            <span className="font-mono">⌘K</span>
          </button>

          {/* Compact HUD Trigger: XP Ring + Streak in Glass Pill */}
          <div className="relative" ref={popoverRef}>
            <button
              type="button"
              onClick={() => setShowProfilePopover(!showProfilePopover)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 transition-all border border-white/15 focus-visible:outline-none active:scale-95"
            >
              {/* Mini Level Circle */}
              <div className="relative w-6 h-6 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 24 24">
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="#262626"
                    strokeWidth="2.5"
                    fill="none"
                  />
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="#FDE047"
                    strokeWidth="2.5"
                    fill="none"
                    strokeDasharray={62.8}
                    strokeDashoffset={62.8 - (progressPercent / 100) * 62.8}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute text-[10px] font-mono font-black text-white">
                  {xpLevel}
                </span>
              </div>

              {/* Streak Flame */}
              <div className="flex items-center gap-1 text-xs font-mono font-bold text-cyber-yellow">
                <Flame size={13} className="fill-cyber-yellow" />
                <span>{streakDays}d</span>
              </div>
            </button>

            {/* Profile & League Popover */}
            <AnimatePresence>
              {showProfilePopover && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute right-0 mt-3 w-88 p-5 rounded-[32px] bg-void-charcoal/95 border border-white/20 shadow-2xl backdrop-blur-2xl z-50 text-white"
                >
                  {/* Popover Header */}
                  <div className="flex items-center justify-between pb-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-cyber-yellow text-black font-mono font-black flex items-center justify-center text-sm shadow-yellow-glow">
                        L{xpLevel}
                      </div>
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-zinc-300">Pilot Cockpit</div>
                        <div className="text-[11px] font-mono text-cyber-yellow font-semibold">
                          {totalXp} Total XP
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-mono font-bold text-black bg-cyber-yellow px-2.5 py-1 rounded-full shadow-sm">
                      <Flame size={12} className="fill-black" />
                      <span>{streakDays}d Streak</span>
                    </div>
                  </div>

                  {/* Level Progress Bar */}
                  <div className="py-4">
                    <div className="flex justify-between text-[11px] font-mono text-zinc-400 mb-1.5">
                      <span>Level {xpLevel}</span>
                      <span>Next Level ({nextLevelXp} XP)</span>
                    </div>
                    <div className="w-full h-2 bg-void-gray rounded-full overflow-hidden p-0.5 border border-white/5">
                      <div
                        className="h-full bg-cyber-yellow rounded-full transition-all duration-500 shadow-yellow-glow"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Badges Preview */}
                  <div className="pt-2">
                    <div className="text-[10px] font-bold text-zinc-400 mb-2 uppercase tracking-widest">
                      Unlocked Badges ({badges.filter((b) => b.unlocked).length}/{badges.length || 1})
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {badges.slice(0, 4).map((badge) => (
                        <BadgeItem
                          key={badge.id}
                          id={badge.id}
                          name={badge.name}
                          description={badge.description}
                          icon={badge.icon}
                          unlocked={badge.unlocked}
                          size="sm"
                        />
                      ))}
                    </div>
                  </div>

                  {/* League Mini Leaderboard */}
                  <div className="pt-4 mt-4 border-t border-white/10">
                    <div className="text-[10px] font-bold text-zinc-400 mb-2.5 uppercase tracking-widest flex items-center justify-between">
                      <span>Live League Standings</span>
                      <Users size={12} className="text-cyber-yellow" />
                    </div>
                    <div className="space-y-1.5">
                      {leaguePlayers.map((player) => (
                        <div
                          key={player.rank}
                          className={`flex items-center justify-between text-xs px-3 py-1.5 rounded-full ${
                            player.active
                              ? "bg-cyber-yellow/20 text-cyber-yellow border border-cyber-yellow/40 font-bold"
                              : "text-zinc-400 bg-white/5"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] opacity-60">#{player.rank}</span>
                            <span>{player.name}</span>
                          </div>
                          <span className="font-mono text-[10px]">{player.xp} XP</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* "More" Menu Dropdown */}
          <div className="relative" ref={moreRef}>
            <button
              type="button"
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="w-9 h-9 rounded-full flex items-center justify-center text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 transition-all border border-white/15 focus-visible:outline-none active:scale-95"
              aria-label="More options"
            >
              <MoreHorizontal size={16} />
            </button>

            <AnimatePresence>
              {showMoreMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute right-0 mt-3 w-60 p-3 rounded-[32px] bg-void-charcoal/95 border border-white/20 shadow-2xl backdrop-blur-2xl z-50 text-xs text-white"
                >
                  {/* Mode Switch: Participant / Organizer */}
                  <div className="p-1 mb-2">
                    <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-widest mb-2 px-1">
                      View Mode
                    </div>
                    <SegmentedControl
                      size="sm"
                      options={[
                        { value: "participant", label: "Participant" },
                        { value: "organizer", label: "Organizer" },
                      ]}
                      value={isOrganizer ? "organizer" : "participant"}
                      onChange={handleModeChange}
                      className="w-full justify-center"
                    />
                  </div>

                  <div className="h-px bg-white/10 my-2" />

                  {auth.profile ? (
                    <>
                      <Link
                        href={`/u?username=${encodeURIComponent(auth.profile.username)}`}
                        onClick={() => setShowMoreMenu(false)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-full hover:bg-white/10 text-zinc-300 hover:text-white transition-colors"
                      >
                        <Users size={14} />
                        <span>Profile</span>
                      </Link>
                      <Link
                        href="/profile/edit"
                        onClick={() => setShowMoreMenu(false)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-full hover:bg-white/10 text-zinc-300 hover:text-white transition-colors"
                      >
                        <Compass size={14} />
                        <span>Edit Profile</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          auth.signOut();
                          setShowMoreMenu(false);
                          router.push("/");
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-full hover:bg-white/10 text-zinc-400 hover:text-rose-400 transition-colors text-left"
                      >
                        <span>Logout</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/login"
                        onClick={() => setShowMoreMenu(false)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-full hover:bg-white/10 text-zinc-300 hover:text-white transition-colors"
                      >
                        <span>Login</span>
                      </Link>
                      <Link
                        href="/signup"
                        onClick={() => setShowMoreMenu(false)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-full bg-cyber-yellow text-black hover:bg-cyber-yellow-hover font-bold transition-all mt-1 justify-center active:scale-95"
                      >
                        <span>Sign Up Free</span>
                      </Link>
                    </>
                  )}

                  <div className="h-px bg-white/10 my-2" />

                  {/* Jury Mode Trigger */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreMenu(false);
                      if (onOpenJuryMode) onOpenJuryMode();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-full text-cyber-yellow hover:bg-cyber-yellow/10 transition-colors text-left font-semibold"
                  >
                    <Compass size={14} />
                    <span>Jury Mode (60s Tour)</span>
                  </button>

                  {/* Theme Toggle */}
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-full hover:bg-white/10 text-zinc-300 hover:text-white transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      {theme === "dark" ? <Moon size={14} /> : <Sun size={14} />}
                      <span>Appearance</span>
                    </div>
                    <span className="text-[10px] font-mono uppercase text-zinc-400">{theme}</span>
                  </button>

                  {/* Sound FX Toggle */}
                  <button
                    type="button"
                    onClick={toggleSound}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-full hover:bg-white/10 text-zinc-300 hover:text-white transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                      <span>Sound FX</span>
                    </div>
                    <span className="text-[10px] font-mono uppercase text-cyber-yellow">
                      {soundEnabled ? "On" : "Off"}
                    </span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
};
