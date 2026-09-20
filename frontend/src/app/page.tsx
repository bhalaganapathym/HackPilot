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
  CheckCircle2,
  Award,
  Layers,
  ChevronRight
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

  const partnerLogos = [
    { name: "AWS Bedrock", category: "AI Foundation" },
    { name: "Anthropic Claude", category: "Reasoning Engine" },
    { name: "OpenAI", category: "Embeddings" },
    { name: "GitHub", category: "Dev Ecosystem" },
    { name: "Supabase", category: "Vector Store" },
    { name: "Hugging Face", category: "Open Models" },
    { name: "Next.js 14", category: "Edge Runtime" },
    { name: "Vercel", category: "Global Mesh" },
  ];

  return (
    <div ref={containerRef} className="w-full flex flex-col bg-void-onyx">
      {/* 1. THE "LIQUID" HERO SECTION - Cyber Yellow Asymmetrical Wave */}
      <section className="relative w-full bg-cyber-yellow text-black pt-12 pb-24 sm:pt-20 sm:pb-36 px-4 sm:px-8 rounded-b-[120px] rounded-bl-[40px] shadow-2xl overflow-hidden">
        {/* Subtle Organic Background Liquid Swirls */}
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-yellow-300 rounded-full blur-3xl opacity-60 pointer-events-none" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] bg-yellow-400 rounded-full blur-2xl opacity-40 pointer-events-none" />

        <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center relative z-10">
          {/* Left Column: Left-Aligned Massive Typography */}
          <div className="lg:col-span-7 space-y-7 text-left">

            {/* Massive Minimalist Hero Headline */}
            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tight text-black leading-[0.94]">
              Turn friction into <br />
              <span className="underline decoration-black/30 decoration-wavy decoration-from-font">
                victory.
              </span>
            </h1>

            {/* Sub-Header */}
            <p className="text-lg sm:text-xl font-medium text-black/80 max-w-xl leading-relaxed">
              Every flaw in your idea becomes a fixable quest. Stress-test your architecture, defend against Red Team attacks, and conquer the leaderboard.
            </p>

            {/* Pill CTA Buttons with Squish Interaction */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push("/abstract")}
                className="h-14 px-9 rounded-full bg-black text-white font-bold text-base shadow-2xl hover:bg-neutral-900 transition-all flex items-center gap-3 focus-visible:outline-none"
              >
                <span>Launch in 60s</span>
                <ArrowRight size={18} className="text-cyber-yellow" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleLoadDemoData}
                type="button"
                className="h-14 px-7 rounded-full border-2 border-black/25 text-black font-bold text-sm hover:border-black hover:bg-black/5 transition-all flex items-center gap-2 focus-visible:outline-none"
              >
                {demoLoaded ? (
                  <>
                    <CheckCircle2 size={18} className="text-black" />
                    <span>Demo Loaded!</span>
                  </>
                ) : (
                  <>
                    <span>Load Demo Data</span>
                  </>
                )}
              </motion.button>
            </div>

            {/* High-Vis Award Badge */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  const event = new CustomEvent("open-jury-mode");
                  window.dispatchEvent(event);
                }}
                className="inline-flex items-center gap-2 text-xs font-bold text-black/90 hover:text-black transition-colors underline underline-offset-4"
              >
                <Award size={14} className="text-black" />
                <span>Hackathon Judge or Mentor? Launch 60s Guided Jury Mode →</span>
              </button>
            </div>
          </div>

          {/* Right Column: The "Glassmorphic" Data Card (Float Animation) */}
          <div className="lg:col-span-5 relative flex justify-center lg:justify-end">
            <div className="w-full max-w-md animate-float">
              <div className="relative rounded-[32px] bg-white/20 backdrop-blur-2xl border border-white/40 shadow-2xl p-7 text-black space-y-6">
                {/* Top Action Pill Badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-black animate-ping" />
                    <span className="text-[11px] font-black uppercase tracking-widest text-black/70">
                      Live Co-Pilot HUD
                    </span>
                  </div>
                  <span className="px-3.5 py-1 rounded-full bg-black text-cyber-yellow text-xs font-black tracking-wider uppercase shadow-md">
                    Active Mission
                  </span>
                </div>

                {/* Score Dial & Stats Preview */}
                <div className="flex items-center gap-5 p-4 rounded-2xl bg-white/40 border border-white/60">
                  <div className="w-16 h-16 rounded-full bg-black text-cyber-yellow flex flex-col items-center justify-center font-mono font-black shadow-lg">
                    <span className="text-xl leading-none">94</span>
                    <span className="text-[8px] uppercase tracking-wider text-white/70">Score</span>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-black text-black">
                      Hyper-Defended Abstract
                    </div>
                    <div className="text-xs text-black/75">
                      3 Quests Completed · +150 XP Earned
                    </div>
                    <div className="text-[10px] font-mono font-bold text-black/60 uppercase">
                      Target: Unbreakable Tier
                    </div>
                  </div>
                </div>

                {/* Mini Quest List */}
                <div className="space-y-2">
                  <div className="text-[10px] uppercase font-black text-black/60 tracking-widest">
                    Real-Time Quests
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/30 border border-white/50 text-xs font-bold">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-black" />
                      Quantify Scalability Impact
                    </span>
                    <span className="font-mono text-black text-[11px]">+50 XP</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/30 border border-white/50 text-xs font-bold">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-black" />
                      AWS Bedrock Architecture
                    </span>
                    <span className="font-mono text-black text-[11px]">+50 XP</span>
                  </div>
                </div>

                {/* Card Button */}
                <Link
                  href="/abstract"
                  className="w-full h-12 rounded-full bg-black text-white hover:bg-neutral-900 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg"
                >
                  <span>Enter Audit Arena</span>
                  <ChevronRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. THE DARK VOID SECTION (#0A0A0A) */}
      <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-8 py-16 space-y-20">
        {/* LOGO TICKER IN THE VOID - Monochromatic White/Gray */}
        <section className="space-y-4">
          <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-400 text-center">
            Ecosystem Integrations &amp; Foundation Stack
          </div>
          <div className="relative overflow-hidden py-4 border-y border-white/10">
            <div className="flex items-center justify-around flex-wrap gap-8 opacity-80 hover:opacity-100 transition-opacity">
              {partnerLogos.map((logo, idx) => (
                <div key={idx} className="flex items-center gap-2 group cursor-default">
                  <div className="w-2 h-2 rounded-full bg-zinc-600 group-hover:bg-cyber-yellow transition-colors" />
                  <span className="text-sm font-bold tracking-tight text-zinc-300 group-hover:text-white transition-colors">
                    {logo.name}
                  </span>
                  <span className="text-[9px] font-mono text-zinc-400 hidden sm:inline">
                    [{logo.category}]
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 3. CORE PARTICIPANT SUITE - Glassmorphic Data Cards */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-white/10 pb-4">
            <div>
              <div className="text-xs font-mono font-bold uppercase tracking-widest text-cyber-yellow">
                Core Engine
              </div>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white mt-1">
                Participant Suite
              </h2>
            </div>
            <p className="text-xs font-medium text-zinc-400 max-w-sm">
              Engineered with 32px glass containers and instant gamified quest generation.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1: Abstract Analyzer */}
            <div
              ref={card1Ref}
              className="gsap-reveal rounded-[32px] bg-void-charcoal/80 border border-white/10 hover:border-cyber-yellow/60 backdrop-blur-xl p-6 shadow-2xl flex flex-col justify-between gap-6 transition-all duration-300 group hover:-translate-y-1"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-cyber-yellow text-black flex items-center justify-center font-bold shadow-yellow-glow">
                    <FileText size={22} />
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono font-bold text-cyber-yellow">
                    QUESTS
                  </span>
                </div>
                <h3 className="text-lg font-black text-white group-hover:text-cyber-yellow transition-colors">
                  Abstract Analyzer
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Evaluates clarity, technical depth, and impact. Weaknesses transform into actionable XP quests with live score deltas.
                </p>
              </div>

              <Link
                href="/abstract"
                className="w-full py-3 rounded-full bg-white/5 hover:bg-cyber-yellow hover:text-black border border-white/10 hover:border-cyber-yellow text-xs font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <span>Open Analyzer</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            {/* Card 2: Problem Explainer */}
            <div
              ref={card2Ref}
              className="gsap-reveal rounded-[32px] bg-void-charcoal/80 border border-white/10 hover:border-cyber-yellow/60 backdrop-blur-xl p-6 shadow-2xl flex flex-col justify-between gap-6 transition-all duration-300 group hover:-translate-y-1"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 text-cyber-yellow flex items-center justify-center font-bold border border-white/15">
                    <HelpCircle size={22} />
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono font-bold text-zinc-400">
                    DECODE
                  </span>
                </div>
                <h3 className="text-lg font-black text-white group-hover:text-cyber-yellow transition-colors">
                  Problem Explainer
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Plain-English challenge decoding, mandatory checklists, hidden evaluation criteria, and truthful interactive Q&amp;A.
                </p>
              </div>

              <Link
                href="/problem"
                className="w-full py-3 rounded-full bg-white/5 hover:bg-cyber-yellow hover:text-black border border-white/10 hover:border-cyber-yellow text-xs font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <span>Open Explainer</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            {/* Card 3: Idea Red Team */}
            <div
              ref={card3Ref}
              className="gsap-reveal rounded-[32px] bg-void-charcoal/80 border border-white/10 hover:border-cyber-yellow/60 backdrop-blur-xl p-6 shadow-2xl flex flex-col justify-between gap-6 transition-all duration-300 group hover:-translate-y-1"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold border border-rose-500/30">
                    <ShieldAlert size={22} />
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-[10px] font-mono font-bold text-rose-400">
                    SURVIVAL HP
                  </span>
                </div>
                <h3 className="text-lg font-black text-white group-hover:text-cyber-yellow transition-colors">
                  Idea Red Team
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  7-domain architectural stress test with survival HP, rated rebuttals, and Unbreakable badge survival scoring.
                </p>
              </div>

              <Link
                href="/redteam"
                className="w-full py-3 rounded-full bg-white/5 hover:bg-cyber-yellow hover:text-black border border-white/10 hover:border-cyber-yellow text-xs font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <span>Enter Arena</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            {/* Card 4: AI Judge Simulator */}
            <div
              ref={card4Ref}
              className="gsap-reveal rounded-[32px] bg-void-charcoal/80 border border-white/10 hover:border-cyber-yellow/60 backdrop-blur-xl p-6 shadow-2xl flex flex-col justify-between gap-6 transition-all duration-300 group hover:-translate-y-1"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold border border-purple-500/30">
                    <Gavel size={22} />
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-[10px] font-mono font-bold text-purple-400">
                    TRIAL SIM
                  </span>
                </div>
                <h3 className="text-lg font-black text-white group-hover:text-cyber-yellow transition-colors">
                  AI Judge Simulator
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Practice demo Q&amp;A under pressure against 3 archetypes with real-time defense scoring and XP rewards.
                </p>
              </div>

              <Link
                href="/judge"
                className="w-full py-3 rounded-full bg-white/5 hover:bg-cyber-yellow hover:text-black border border-white/10 hover:border-cyber-yellow text-xs font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <span>Practice Trial</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </section>

        {/* 4. ADVANCED TOOLKIT - Glassmorphic Rows */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-white/10 pb-4">
            <div>
              <div className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-400">
                Specialized Arsenal
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-1">
                Advanced Competitive Tools
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card 5: Idea Duel */}
            <div className="gsap-reveal rounded-[32px] bg-void-charcoal/80 border border-white/10 hover:border-cyber-yellow/60 backdrop-blur-xl p-6 shadow-2xl flex flex-col justify-between gap-6 transition-all group">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-cyber-yellow/10 text-cyber-yellow flex items-center justify-center border border-cyber-yellow/20">
                  <Swords size={22} />
                </div>
                <h3 className="text-base font-black text-white group-hover:text-cyber-yellow transition-colors">
                  Idea Duel
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Compare two project concepts head-to-head across 5 strategic dimensions. Diagnostic trade-off analysis — no arbitrary winners.
                </p>
              </div>
              <Link
                href="/duel"
                className="inline-flex items-center gap-2 text-xs font-bold text-cyber-yellow hover:underline"
              >
                <span>Start Head-to-Head Duel</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            {/* Card 6: 60-Second Rapid Fire */}
            <div className="gsap-reveal rounded-[32px] bg-void-charcoal/80 border border-white/10 hover:border-cyber-yellow/60 backdrop-blur-xl p-6 shadow-2xl flex flex-col justify-between gap-6 transition-all group">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-400 flex items-center justify-center border border-orange-500/20">
                  <Zap size={22} />
                </div>
                <h3 className="text-base font-black text-white group-hover:text-cyber-yellow transition-colors">
                  60-Second Rapid Fire
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Sharpen your pitch in 60 seconds. Timed phase prompts, 7-dimension AI scoring, and coaching tips for every segment.
                </p>
              </div>
              <Link
                href="/rapid-fire"
                className="inline-flex items-center gap-2 text-xs font-bold text-orange-400 hover:underline"
              >
                <span>Begin Timed Pitch</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            {/* Card 7: Pitch Deck Analyzer */}
            <div className="gsap-reveal rounded-[32px] bg-void-charcoal/80 border border-white/10 hover:border-cyber-yellow/60 backdrop-blur-xl p-6 shadow-2xl flex flex-col justify-between gap-6 transition-all group">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
                  <Layers size={22} />
                </div>
                <h3 className="text-base font-black text-white group-hover:text-cyber-yellow transition-colors">
                  Pitch Deck Analyzer
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Upload your PDF deck for slide-by-slide clarity scoring, evidence gap detection, AWS usage audit, and question prep.
                </p>
              </div>
              <Link
                href="/pitch-deck"
                className="inline-flex items-center gap-2 text-xs font-bold text-blue-400 hover:underline"
              >
                <span>Upload &amp; Audit Deck</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </section>

        {/* 5. MISSION COCKPIT STATUS - Glassmorphic Container with Cyber Yellow Bar */}
        <section className="gsap-reveal">
          <div className="rounded-[32px] bg-void-charcoal/90 border border-white/15 p-6 shadow-2xl backdrop-blur-2xl flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-cyber-yellow text-black font-mono font-black flex items-center justify-center text-lg shadow-yellow-glow">
                L{profile?.level || 1}
              </div>
              <div>
                <div className="text-sm font-bold text-white uppercase tracking-wider">
                  Pilot Mission Cockpit Status
                </div>
                <div className="text-xs font-mono text-zinc-400 mt-0.5">
                  {profile?.total_xp || 0} Total XP · {profile?.quests_completed || 0} Quests Completed
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6 text-xs">
              <div className="flex items-center gap-2 font-mono font-bold text-cyber-yellow px-4 py-2 rounded-full bg-white/5 border border-white/10">
                <Flame size={16} className="fill-cyber-yellow" />
                <span>{profile?.streak_days || 1} Day Streak</span>
              </div>
              <Link
                href="/leaderboard"
                className="px-5 py-2.5 rounded-full bg-cyber-yellow text-black font-bold text-xs hover:bg-cyber-yellow-hover transition-all active:scale-95 shadow-md"
              >
                View Leaderboard
              </Link>
            </div>
          </div>
        </section>
      </div>

      <XPToast xp={toastXp} onDone={() => setToastXp(null)} />
    </div>
  );
}
