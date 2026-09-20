"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Sliders,
  ChevronRight,
  Layers,
  X,
  CheckCircle2
} from "lucide-react";
import {
  api,
  RedTeamAttackResponse,
  RedTeamDefendResponse,
  AttackVector,
  RedTeamIntensity
} from "@/lib/api";
import { DEMO_RED_TEAM_IDEA, DEMO_ATTACK_DEFENSE } from "@/lib/demoData";
import { sounds } from "@/lib/sounds";
import { SegmentedHpBar } from "@/components/common/SegmentedHpBar";
import { SegmentedControl } from "@/components/common/SegmentedControl";
import { AIThinkingPanel } from "@/components/common/AIThinkingPanel";
import { XPToast } from "@/components/common/XPToast";
import { MascotPilot } from "@/components/common/MascotPilot";
import { useGsapEntrance } from "@/lib/animations";

export default function RedTeamPage() {
  const containerRef = useGsapEntrance<HTMLDivElement>(".gsap-fade-in", 0.04);
  const [ideaText, setIdeaText] = useState("");
  const [intensity, setIntensity] = useState<RedTeamIntensity>("fair");
  const [showOptions, setShowOptions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentThought, setCurrentThought] = useState("");
  const [allThoughts, setAllThoughts] = useState<string[]>([]);

  // Battle State
  const [battle, setBattle] = useState<RedTeamAttackResponse | null>(null);
  const [currentHp, setCurrentHp] = useState(100);
  const [currentAttackIdx, setCurrentAttackIdx] = useState(0);
  const [defenseText, setDefenseText] = useState("");
  const [defending, setDefending] = useState(false);
  const [defenseResults, setDefenseResults] = useState<Record<string, RedTeamDefendResponse>>({});
  const [showAllAttacksSheet, setShowAllAttacksSheet] = useState(false);
  const [screenShake, setScreenShake] = useState(false);

  const [toastXp, setToastXp] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Start Red Team Battle
  const handleStartAttack = async () => {
    if (ideaText.trim().length < 15) {
      setErrorMessage("Please enter at least 15 characters to stress-test your idea.");
      return;
    }

    setErrorMessage(null);
    setLoading(true);
    setCurrentThought("Auditing architecture across 7 vulnerability domains...");
    setAllThoughts(["Synthesizing worst-case failure vectors tailored to keywords..."]);

    const jobId = `job-redteam-${Date.now()}`;
    const unsubscribe = api.subscribeStream(
      jobId,
      (token) => {
        if (token.trim()) {
          setCurrentThought(token);
          setAllThoughts((prev) => [...prev, token]);
        }
      },
      () => {},
      () => {}
    );

    try {
      const response = await api.redTeamAttack(ideaText, intensity);
      setBattle(response);
      setCurrentHp(response.initial_hp);
      setCurrentAttackIdx(0);
      setDefenseResults({});
      sounds.playHit();
      setToastXp(40);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to start Red Team attack.";
      setErrorMessage(msg);
    } finally {
      unsubscribe();
      setLoading(false);
    }
  };

  // Submit Defense Rebuttal
  const handleDefend = async () => {
    if (!battle || !defenseText.trim()) return;

    const currentAttack = battle.attacks[currentAttackIdx];
    setDefending(true);

    try {
      const res = await api.redTeamDefend({
        attack_id: currentAttack.id,
        defense: defenseText,
        idea: ideaText,
        battle_id: battle.battle_id,
        current_hp: currentHp,
      });

      setDefenseResults((prev) => ({
        ...prev,
        [currentAttack.id]: res,
      }));

      setCurrentHp(res.current_hp);

      if (res.rating < 5 && currentAttack.severity === "critical") {
        // Critical hit screen shake
        setScreenShake(true);
        sounds.playHit();
        setTimeout(() => setScreenShake(false), 500);
      } else {
        sounds.playXP();
      }

      setToastXp(res.xp_result.xp_gained);
    } catch {
      // Fallback
    } finally {
      setDefending(false);
    }
  };

  const currentAttack: AttackVector | undefined = battle?.attacks[currentAttackIdx];
  const currentResult: RedTeamDefendResponse | undefined = currentAttack
    ? defenseResults[currentAttack.id]
    : undefined;

  const isBattleComplete =
    battle && Object.keys(defenseResults).length === battle.attacks.length;

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case "critical":
        return "bg-accent-coral/20 text-accent-coral border-accent-coral/40";
      case "high":
        return "bg-accent-coral/10 text-accent-coral border-accent-coral/30";
      case "medium":
        return "bg-accent-amber/10 text-accent-amber border-accent-amber/30";
      case "low":
      default:
        return "bg-fill text-text-muted border-border";
    }
  };

  return (
    <div
      ref={containerRef}
      className={`max-w-[1200px] w-full mx-auto px-4 sm:px-8 py-8 space-y-10 transition-transform duration-200 ${
        screenShake ? "animate-bounce" : ""
      }`}
    >
      {/* Top Banner / Theme Header */}
      <div className="gsap-fade-in space-y-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-mono font-bold text-rose-400 uppercase tracking-widest">
          <ShieldAlert size={14} />
          <span>Idea Red Team Arena</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white leading-tight">
          Stress-test your idea before the grand jury does.
        </h1>
        <p className="text-sm sm:text-base text-zinc-400 max-w-2xl leading-relaxed">
          We attack your architecture across 7 failure domains. Defend against each vector to preserve survival HP, earn XP, and unlock the Unbreakable badge.
        </p>
      </div>

      {/* Input Box */}
      <div className="gsap-fade-in rounded-[32px] bg-void-charcoal/80 border border-white/10 p-7 sm:p-8 shadow-2xl backdrop-blur-xl space-y-5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">
            Project Concept / Architecture
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowOptions(!showOptions)}
              className="text-xs font-bold text-zinc-400 hover:text-white flex items-center gap-1.5 focus-visible:outline-none px-3 py-1.5 rounded-full bg-white/5 border border-white/10"
            >
              <Sliders size={12} />
              <span>Options ({intensity})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIdeaText(DEMO_RED_TEAM_IDEA);
                setErrorMessage(null);
              }}
              className="text-xs font-bold text-cyber-yellow hover:underline focus-visible:outline-none"
            >
              Load Sample Idea
            </button>
          </div>
        </div>

        {/* Intensity Selector under Options */}
        {showOptions && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2"
          >
            <span className="text-xs font-bold text-zinc-300 block">
              Adversary Scrutiny Intensity:
            </span>
            <SegmentedControl<RedTeamIntensity>
              size="sm"
              options={[
                { value: "friendly", label: "Friendly (5 attacks)" },
                { value: "fair", label: "Fair (6 attacks)" },
                { value: "ruthless", label: "Ruthless (7 attacks)" },
              ]}
              value={intensity}
              onChange={setIntensity}
            />
          </motion.div>
        )}

        <textarea
          rows={4}
          value={ideaText}
          onChange={(e) => setIdeaText(e.target.value)}
          placeholder="Describe your project concept, technologies, and target workflow..."
          className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-zinc-500 text-sm leading-relaxed focus:bg-white/10 focus:outline-none focus:border-rose-500 transition-all resize-y"
        />

        {errorMessage && (
          <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-500/10 p-3 rounded-2xl border border-rose-500/20">
            <AlertTriangle size={14} />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleStartAttack}
            disabled={loading}
            className="h-12 px-8 rounded-full bg-rose-500 text-white font-extrabold text-sm shadow-md hover:bg-rose-600 disabled:opacity-50 transition-all flex items-center gap-2 focus-visible:outline-none"
          >
            <span>{loading ? "Priming Attacks..." : "Launch Red Team Stress-Test"}</span>
            <ArrowRight size={16} />
          </motion.button>
        </div>
      </div>

      {/* AI Thinking Narration */}
      <AIThinkingPanel
        currentThought={currentThought}
        allThoughts={allThoughts}
        isThinking={loading}
      />

      {/* Arena Screen: One Attack at a Time */}
      <AnimatePresence>
        {battle && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Arena Header: Slim HP Bar + Mascot State */}
            <div className="rounded-[32px] bg-void-charcoal/85 border border-white/10 p-7 shadow-2xl backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="w-full sm:max-w-md">
                <SegmentedHpBar currentHp={currentHp} maxHp={100} segments={10} />
              </div>

              <div className="flex items-center gap-3">
                <MascotPilot
                  expression={
                    currentHp <= 30
                      ? "worried"
                      : isBattleComplete
                      ? "celebrating"
                      : currentResult
                      ? "smug"
                      : "idle"
                  }
                  size={36}
                  speech={
                    currentHp <= 30
                      ? "HP Critical! Defend with concrete architecture!"
                      : isBattleComplete
                      ? "Arena Cleared! Unbreakable status achieved."
                      : undefined
                  }
                />

                <button
                  type="button"
                  onClick={() => setShowAllAttacksSheet(true)}
                  className="px-4 py-2 rounded-full border border-white/10 bg-white/5 text-xs font-bold text-zinc-300 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1.5 focus-visible:outline-none"
                >
                  <Layers size={13} />
                  <span>All Attacks ({battle.attacks.length})</span>
                </button>
              </div>
            </div>

            {/* Focused Attack Card (Boss Moment) */}
            {currentAttack && !isBattleComplete && (
              <div className="rounded-[32px] bg-void-charcoal/85 border border-white/10 p-7 sm:p-8 shadow-2xl space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-cyber-yellow">
                      Attack {currentAttackIdx + 1} of {battle.attacks.length}
                    </span>
                    <span className="text-zinc-500">·</span>
                    <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider">
                      {currentAttack.domain}
                    </span>
                  </div>

                  <span
                    className={`text-[11px] font-mono font-bold uppercase px-3 py-1 rounded-full border ${getSeverityBadge(
                      currentAttack.severity
                    )}`}
                  >
                    {currentAttack.severity} Severity
                  </span>
                </div>

                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-white mb-2">
                    {currentAttack.title}
                  </h3>
                  <p className="text-sm text-zinc-300 leading-relaxed">
                    {currentAttack.scenario}
                  </p>
                </div>

                {/* Defense Input Form */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                      Your Architectural Rebuttal
                    </label>
                    <button
                      type="button"
                      onClick={() => setDefenseText(DEMO_ATTACK_DEFENSE)}
                      className="text-xs font-bold text-cyber-yellow hover:underline focus-visible:outline-none"
                    >
                      Fill Sample Defense
                    </button>
                  </div>

                  <textarea
                    rows={3}
                    value={defenseText}
                    onChange={(e) => setDefenseText(e.target.value)}
                    placeholder="Articulate your concrete fallback, circuit breaker, caching layer, or encryption standard..."
                    className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-zinc-500 text-sm leading-relaxed focus:bg-white/10 focus:outline-none focus:border-rose-500 transition-all resize-y"
                  />

                  {/* Defense Result Feedback if submitted */}
                  {currentResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">
                          Defense Rating: {currentResult.rating}/10
                        </span>
                        <span className="font-mono text-cyber-yellow font-bold text-sm">
                          +{currentResult.hp_change} HP Recovery
                        </span>
                      </div>
                      <p className="text-zinc-300">{currentResult.feedback}</p>
                    </motion.div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    {!currentResult ? (
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleDefend}
                        disabled={defending || !defenseText.trim()}
                        className="h-11 px-7 rounded-full bg-cyber-yellow text-black font-extrabold text-xs shadow-yellow-glow hover:bg-cyber-yellow-hover disabled:opacity-50 transition-all flex items-center gap-2 focus-visible:outline-none"
                      >
                        <ShieldCheck size={16} />
                        <span>{defending ? "Evaluating Architecture..." : "Submit Defense Rebuttal"}</span>
                      </motion.button>
                    ) : (
                      <div className="flex items-center gap-2">
                        {currentAttackIdx < battle.attacks.length - 1 ? (
                          <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              setCurrentAttackIdx((prev) => prev + 1);
                              setDefenseText("");
                            }}
                            className="h-11 px-7 rounded-full bg-white text-black font-extrabold text-xs shadow-md transition-all flex items-center gap-2 focus-visible:outline-none active:scale-95"
                          >
                            <span>Next Attack Vector</span>
                            <ChevronRight size={15} />
                          </motion.button>
                        ) : (
                          <span className="text-xs font-mono font-bold text-cyber-yellow flex items-center gap-1.5 px-4 py-2 rounded-full bg-cyber-yellow/10 border border-cyber-yellow/20">
                            <CheckCircle2 size={15} />
                            All attacks faced!
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Battle Summary Card when complete */}
            {isBattleComplete && (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-3xl bg-surface border border-accent-green/30 p-8 shadow-card text-center space-y-4"
              >
                <div className="w-12 h-12 rounded-2xl bg-accent-green/15 text-accent-green mx-auto flex items-center justify-center">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-bold tracking-tight text-text-primary">
                    Arena Cleared: {currentHp > 50 ? "Unbreakable Defense" : "Survival Secured"}
                  </h3>
                  <p className="text-sm text-text-muted max-w-md mx-auto mt-1">
                    You survived all {battle.attacks.length} attacks with {currentHp} HP remaining. Your project has proven technical resilience against jury scrutiny.
                  </p>
                </div>

                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setBattle(null);
                      setDefenseResults({});
                    }}
                    className="h-10 px-5 rounded-2xl bg-fill hover:bg-fill-hover text-text-primary text-xs font-medium border border-border transition-colors flex items-center gap-1.5"
                  >
                    <RotateCcw size={13} />
                    <span>Test Another Idea</span>
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* "See All Attacks" Side Sheet */}
      <AnimatePresence>
        {showAllAttacksSheet && battle && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAllAttacksSheet(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="relative w-full max-w-md h-full bg-surface border-l border-border p-6 shadow-popover overflow-y-auto z-10 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <h3 className="text-base font-semibold text-text-primary">
                  All Attack Vectors ({battle.attacks.length})
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAllAttacksSheet(false)}
                  className="p-1 rounded-full text-text-muted hover:text-text-primary"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3">
                {battle.attacks.map((atk, idx) => {
                  const res = defenseResults[atk.id];
                  return (
                    <div
                      key={atk.id}
                      onClick={() => {
                        setCurrentAttackIdx(idx);
                        setShowAllAttacksSheet(false);
                      }}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-colors ${
                        idx === currentAttackIdx
                          ? "border-accent-coral bg-accent-coral/5"
                          : "border-border hover:bg-fill/50"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="font-mono text-text-tertiary">
                          #{idx + 1} {atk.domain}
                        </span>
                        <span
                          className={`font-mono uppercase font-semibold px-2 py-0.5 rounded-md ${getSeverityBadge(
                            atk.severity
                          )}`}
                        >
                          {atk.severity}
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-text-primary">
                        {atk.title}
                      </div>
                      {res && (
                        <div className="mt-1.5 text-[11px] text-accent-green font-medium">
                          Defended ({res.rating}/10)
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <XPToast xp={toastXp} onDone={() => setToastXp(null)} />
    </div>
  );
}
