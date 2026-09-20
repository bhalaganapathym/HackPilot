"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  FileText,
  HelpCircle,
  ShieldAlert,
  Gavel,
  Swords,
  Zap,
  ArrowRight,
  Flame,
  CheckCircle2
} from "lucide-react";
import { api, ProfileResponse } from "@/lib/api";
import {
  DEMO_ABSTRACT_INITIAL,
  DEMO_PROBLEM_STATEMENT,
  DEMO_RED_TEAM_IDEA
} from "@/lib/demoData";
import { sounds } from "@/lib/sounds";
import { XPToast } from "@/components/common/XPToast";
import { useGsapEntrance, bindCardHover } from "@/lib/animations";

export default function HomePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [demoLoaded, setDemoLoaded] = useState(false);
  const [toastXp, setToastXp] = useState<number | null>(null);

  const containerRef = useGsapEntrance<HTMLDivElement>(".gsap-reveal", 0.05);
  const card1Ref = useRef<HTMLDivElement>(null);
  const card2Ref = useRef<HTMLDivElement>(null);
  const card3Ref = useRef<HTMLDivElement>(null);
  const card4Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.getProfile().then(setProfile).catch(() => {});
  }, []);

  useEffect(() => {
    const unbind1 = bindCardHover(card1Ref.current);
    const unbind2 = bindCardHover(card2Ref.current);
    const unbind3 = bindCardHover(card3Ref.current);
    const unbind4 = bindCardHover(card4Ref.current);
    return () => {
      unbind1();
      unbind2();
      unbind3();
      unbind4();
    };
  }, []);

  const handleLoadDemoData = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("hackpilot_demo_abstract", DEMO_ABSTRACT_INITIAL);
      localStorage.setItem("hackpilot_demo_problem", DEMO_PROBLEM_STATEMENT);
      localStorage.setItem("hackpilot_demo_idea", DEMO_RED_TEAM_IDEA);
    }
    sounds.playXP();
    setToastXp(50);
    setDemoLoaded(true);
    setTimeout(() => {
      router.push("/abstract");
    }, 900);
  };

  return (
    <div ref={containerRef} className="space-y-14 py-4 sm:py-8">
      {/* Calm Hero Section with subtle blurred background accent */}
      <section className="gsap-reveal relative text-center max-w-2xl mx-auto space-y-6 pt-4 pb-6">
        {/* Subtle slow hero background blur */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 sm:w-96 h-48 bg-accent-blue/10 dark:bg-accent-blue/15 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-surface text-xs text-text-muted">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-green" />
          <span>HackPilot Phase 1 · Participant Core Active</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-text-primary leading-[1.12]">
          Turn hackathon friction into a game.
        </h1>

        <p className="text-base sm:text-lg text-text-muted leading-relaxed">
          Every weakness in your idea becomes a fixable quest. Decode problem statements with instant Q&amp;A and defend against Red Team attacks.
        </p>

        {/* Primary CTA & Secondary text buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push("/abstract")}
            className="h-12 px-7 rounded-2xl bg-accent-blue text-white font-semibold text-sm shadow-sm hover:bg-accent-blue/90 transition-all flex items-center gap-2 focus-visible:outline-none w-full sm:w-auto justify-center"
          >
            <span>Try it in 60 seconds</span>
            <ArrowRight size={16} />
          </motion.button>

          <button
            type="button"
            onClick={handleLoadDemoData}
            className="text-sm font-medium text-text-muted hover:text-text-primary transition-colors px-3 py-2 flex items-center gap-1.5 focus-visible:outline-none"
          >
            {demoLoaded ? (
              <>
                <CheckCircle2 size={15} className="text-accent-green" />
                <span className="text-accent-green font-medium">Demo data loaded!</span>
              </>
            ) : (
              <span>Load demo data</span>
            )}
          </button>
        </div>

        {/* Subtle text link to Jury Mode */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => {
              const event = new CustomEvent("open-jury-mode");
              window.dispatchEvent(event);
            }}
            className="text-xs text-text-tertiary hover:text-accent-blue transition-colors underline-offset-4 hover:underline focus-visible:outline-none"
          >
            Are you a hackathon judge? Launch 60-second guided Jury Mode →
          </button>
        </div>
      </section>

      {/* Simple 3-Card Tool Grid (Each with Icon, One Line, Open Action) */}
      <section className="space-y-4">
        <div className="gsap-reveal text-xs font-semibold uppercase tracking-wider text-text-tertiary">
          Core Participant Suite
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Abstract Analyzer */}
          <div
            ref={card1Ref}
            className="gsap-reveal rounded-3xl bg-surface border border-border p-5 shadow-card flex flex-col justify-between gap-5 hover:border-accent-blue/40 transition-colors"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-accent-blue/10 text-accent-blue flex items-center justify-center">
                <FileText size={20} />
              </div>
              <h3 className="text-base font-bold text-text-primary">
                Abstract Analyzer
              </h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Evaluates clarity, technical depth, and impact. Weaknesses transform into actionable XP quests with live score deltas.
              </p>
            </div>

            <Link
              href="/abstract"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-blue hover:underline"
            >
              <span>Open Analyzer</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          {/* Card 2: Problem Explainer */}
          <div
            ref={card2Ref}
            className="gsap-reveal rounded-3xl bg-surface border border-border p-5 shadow-card flex flex-col justify-between gap-5 hover:border-accent-amber/40 transition-colors"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-accent-amber/10 text-accent-amber flex items-center justify-center">
                <HelpCircle size={20} />
              </div>
              <h3 className="text-base font-bold text-text-primary">
                Problem Explainer
              </h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Plain-English challenge decoding, mandatory checklists, hidden evaluation criteria, and truthful Q&amp;A.
              </p>
            </div>

            <Link
              href="/problem"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-amber hover:underline"
            >
              <span>Open Explainer</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          {/* Card 3: Idea Red Team */}
          <div
            ref={card3Ref}
            className="gsap-reveal rounded-3xl bg-surface border border-border p-5 shadow-card flex flex-col justify-between gap-5 hover:border-accent-coral/40 transition-colors"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-accent-coral/10 text-accent-coral flex items-center justify-center">
                <ShieldAlert size={20} />
              </div>
              <h3 className="text-base font-bold text-text-primary">
                Idea Red Team
              </h3>
              <p className="text-xs text-text-muted leading-relaxed">
                7-domain architectural stress test with survival HP, rated rebuttals, and Unbreakable badge survival.
              </p>
            </div>

            <Link
              href="/redteam"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-coral hover:underline"
            >
              <span>Open Arena</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          {/* Card 4: AI Judge Simulator */}
          <div
            ref={card4Ref}
            className="gsap-reveal rounded-3xl bg-surface border border-border p-5 shadow-card flex flex-col justify-between gap-5 hover:border-accent-violet/40 transition-colors"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-accent-violet/10 text-accent-violet flex items-center justify-center">
                <Gavel size={20} />
              </div>
              <h3 className="text-base font-bold text-text-primary">
                AI Judge Simulator
              </h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Practice live demo Q&amp;A under pressure against 3 AI judge archetypes with real-time defense scoring and XP rewards.
              </p>
            </div>

            <Link
              href="/judge"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-violet hover:underline"
            >
              <span>Practice Trial</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        {/* New Tools Row */}
        <div className="gsap-reveal text-xs font-semibold uppercase tracking-wider text-text-tertiary mt-6">
          Advanced Toolkit
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Card 5: Idea Duel */}
          <div className="gsap-reveal rounded-3xl bg-surface border border-border p-5 shadow-card flex flex-col justify-between gap-5 hover:border-yellow-500/40 transition-colors">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-yellow-500/10 text-yellow-400 flex items-center justify-center">
                <Swords size={20} />
              </div>
              <h3 className="text-base font-bold text-text-primary">
                Idea Duel
              </h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Compare two project concepts head-to-head across 5 strategic dimensions. Diagnostic trade-off analysis — no arbitrary winners.
              </p>
            </div>
            <Link
              href="/duel"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-yellow-400 hover:underline"
            >
              <span>Start Duel</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          {/* Card 6: 60-Second Rapid Fire */}
          <div className="gsap-reveal rounded-3xl bg-surface border border-border p-5 shadow-card flex flex-col justify-between gap-5 hover:border-orange-500/40 transition-colors">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-400 flex items-center justify-center">
                <Zap size={20} />
              </div>
              <h3 className="text-base font-bold text-text-primary">
                60-Second Rapid Fire
              </h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Sharpen your investor pitch in 60 seconds. Timed phase prompts, 7-dimension AI scoring, and coaching tips for every segment.
              </p>
            </div>
            <Link
              href="/rapid-fire"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-400 hover:underline"
            >
              <span>Start Pitch</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          {/* Card 7: Pitch Deck Analyzer */}
          <div className="gsap-reveal rounded-3xl bg-surface border border-border p-5 shadow-card flex flex-col justify-between gap-5 hover:border-indigo-500/40 transition-colors">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                <FileText size={20} />
              </div>
              <h3 className="text-base font-bold text-text-primary">
                Pitch Deck Analyzer
              </h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Upload your PDF deck for slide-by-slide clarity scoring, evidence gap detection, AWS usage audit, and judge question prep.
              </p>
            </div>
            <Link
              href="/pitch-deck"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:underline"
            >
              <span>Analyze Deck</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </section>

      {/* Slim Progress Tile (Level, Streak, XP) */}
      <section className="gsap-reveal">
        <div className="rounded-2xl bg-surface border border-border p-4 shadow-card flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-accent-green/15 text-accent-green font-mono font-bold flex items-center justify-center text-xs">
              L{profile?.level || 1}
            </div>
            <div>
              <div className="text-xs font-semibold text-text-primary">
                Mission Cockpit Status
              </div>
              <div className="text-[11px] font-mono text-text-muted">
                {profile?.total_xp || 0} Total XP · {profile?.quests_completed || 0} Quests Completed
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1 font-mono font-semibold text-accent-amber">
              <Flame size={14} className="fill-accent-amber" />
              <span>{profile?.streak_days || 1} Day Streak</span>
            </div>

          </div>
        </div>
      </section>

      <XPToast xp={toastXp} onDone={() => setToastXp(null)} />
    </div>
  );
}
