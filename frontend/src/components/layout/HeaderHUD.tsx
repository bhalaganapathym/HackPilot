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
  Command,
  Users
} from "lucide-react";
import { api, ProfileResponse } from "@/lib/api";
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
    { rank: 3, name: "You (Pilot)", xp: profile?.total_xp || 350, active: true },
    { rank: 4, name: "dev_sprint", xp: 290, active: false },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-bg/80 backdrop-blur-md transition-colors">
      <div className="max-w-[1120px] mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 group focus-visible:outline-none">
            <div className="w-7 h-7 rounded-lg bg-text-primary text-bg flex items-center justify-center font-bold text-sm tracking-tighter transition-transform group-hover:scale-105">
              HP
            </div>
            <span className="font-semibold text-base tracking-tight text-text-primary">
              HackPilot
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 text-xs font-medium">
            <Link
              href="/abstract"
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                pathname === "/abstract"
                  ? "text-accent-blue bg-accent-blue/10"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              Abstract
            </Link>
            <Link
              href="/problem"
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                pathname === "/problem"
                  ? "text-accent-amber bg-accent-amber/10"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              Problem
            </Link>
            <Link
              href="/redteam"
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                pathname === "/redteam"
                  ? "text-accent-coral bg-accent-coral/10"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              Red Team
            </Link>
            <Link
              href="/judge"
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                pathname === "/judge"
                  ? "text-accent-violet bg-accent-violet/10 font-semibold"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              Judge Sim
            </Link>

          </nav>
        </div>

        {/* Right HUD elements */}
        <div className="flex items-center gap-2.5">
          {/* Quick Command Key Hint */}
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg border border-border bg-fill/50 text-[11px] text-text-muted hover:text-text-primary hover:bg-fill transition-colors focus-visible:outline-none"
            title="Open Command Palette (Cmd/Ctrl + K)"
          >
            <Command size={11} />
            <span>K</span>
          </button>

          {/* Compact HUD Trigger: XP Ring + Streak */}
          <div className="relative" ref={popoverRef}>
            <button
              type="button"
              onClick={() => setShowProfilePopover(!showProfilePopover)}
              className="flex items-center gap-2 p-1.5 rounded-full hover:bg-fill transition-colors border border-border/60 focus-visible:outline-none"
            >
              {/* Mini Level Circle */}
              <div className="relative w-6 h-6 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 24 24">
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="var(--fill)"
                    strokeWidth="2.5"
                    fill="none"
                  />
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="var(--accent-green)"
                    strokeWidth="2.5"
                    fill="none"
                    strokeDasharray={62.8}
                    strokeDashoffset={62.8 - ((profile?.progress_percent || 30) / 100) * 62.8}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute text-[10px] font-mono font-bold text-text-primary">
                  {profile?.level || 1}
                </span>
              </div>

              {/* Streak Flame */}
              <div className="flex items-center gap-1 pr-1.5 text-xs font-mono font-semibold text-accent-amber">
                <Flame size={13} className="fill-accent-amber" />
                <span>{profile?.streak_days || 1}</span>
              </div>
            </button>

            {/* Profile & League Popover */}
            <AnimatePresence>
              {showProfilePopover && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-80 p-4 rounded-2xl bg-surface border border-border shadow-popover z-50 text-text-primary"
                >
                  {/* Popover Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-border">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-accent-green/15 text-accent-green font-mono font-bold flex items-center justify-center text-sm">
                        L{profile?.level || 1}
                      </div>
                      <div>
                        <div className="text-xs font-semibold">Pilot Mission Progress</div>
                        <div className="text-[11px] font-mono text-text-muted">
                          {profile?.total_xp || 0} Total XP
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-mono font-semibold text-accent-amber bg-accent-amber/10 px-2 py-0.5 rounded-full">
                      <Flame size={12} className="fill-accent-amber" />
                      <span>{profile?.streak_days || 1}d Streak</span>
                    </div>
                  </div>

                  {/* Level Progress Bar */}
                  <div className="py-3">
                    <div className="flex justify-between text-[11px] text-text-muted mb-1">
                      <span>Level {profile?.level || 1}</span>
                      <span>Next Level ({profile?.next_level_xp || 100} XP)</span>
                    </div>
                    <div className="w-full h-1.5 bg-fill rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent-green rounded-full transition-all duration-500"
                        style={{ width: `${profile?.progress_percent || 25}%` }}
                      />
                    </div>
                  </div>

                  {/* Badges Preview */}
                  <div className="pt-2">
                    <div className="text-[11px] font-medium text-text-muted mb-2 uppercase tracking-wider">
                      Badges Unlocked ({profile?.badges.filter((b) => b.unlocked).length || 0}/6)
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {profile?.badges.slice(0, 4).map((badge) => (
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
                  <div className="pt-3 mt-3 border-t border-border">
                    <div className="text-[11px] font-medium text-text-muted mb-2 uppercase tracking-wider flex items-center justify-between">
                      <span>Bronze League</span>
                      <Users size={12} />
                    </div>
                    <div className="space-y-1">
                      {leaguePlayers.map((player) => (
                        <div
                          key={player.rank}
                          className={`flex items-center justify-between text-xs px-2 py-1 rounded-lg ${
                            player.active ? "bg-accent-green/10 text-accent-green font-medium" : "text-text-muted"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] opacity-60">#{player.rank}</span>
                            <span>{player.name}</span>
                          </div>
                          <span className="font-mono text-[11px]">{player.xp} XP</span>
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
              className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-fill transition-colors border border-border/60 focus-visible:outline-none"
              aria-label="More options"
            >
              <MoreHorizontal size={16} />
            </button>

            <AnimatePresence>
              {showMoreMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-56 p-2 rounded-2xl bg-surface border border-border shadow-popover z-50 text-xs text-text-primary"
                >
                  {/* Mode Switch: Participant / Organizer */}
                  <div className="p-1 mb-2">
                    <div className="text-[10px] uppercase font-semibold text-text-muted tracking-wider mb-1.5 px-1">
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

                  <div className="h-px bg-border my-1" />

                  {/* Jury Mode Trigger */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreMenu(false);
                      if (onOpenJuryMode) onOpenJuryMode();
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-accent-blue hover:bg-accent-blue/10 transition-colors text-left font-medium"
                  >
                    <Compass size={14} />
                    <span>Jury Mode (60s Tour)</span>
                  </button>

                  {/* Theme Toggle */}
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-fill transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      {theme === "dark" ? <Moon size={14} /> : <Sun size={14} />}
                      <span>Appearance</span>
                    </div>
                    <span className="text-[11px] text-text-muted capitalize">{theme}</span>
                  </button>

                  {/* Sound FX Toggle */}
                  <button
                    type="button"
                    onClick={toggleSound}
                    className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-fill transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                      <span>Sound Effects</span>
                    </div>
                    <span className="text-[11px] text-text-muted">
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
