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
      className={`space-y-10 pb-16 transition-transform duration-200 ${
        screenShake ? "animate-bounce" : ""
      }`}
    >
      {/* Top Banner / Theme Header */}
      <div className="gsap-fade-in">
        <div className="flex items-center gap-2 text-xs font-mono font-semibold text-accent-coral uppercase tracking-wider mb-1">
          <ShieldAlert size={14} />
          <span>Idea Red Team Arena</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-text-primary mb-2">
          Stress-test your idea before the grand jury does.
        </h1>
        <p className="text-sm sm:text-base text-text-muted max-w-xl">
          We attack your architecture across 7 failure domains. Defend against each vector to preserve survival HP, earn XP, and unlock the Unbreakable badge.
        </p>
      </div>

      {/* Input Box */}
      <div className="gsap-fade-in rounded-3xl bg-surface border border-border p-6 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Project Concept / Architecture
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowOptions(!showOptions)}
              className="text-xs font-medium text-text-muted hover:text-text-primary flex items-center gap-1 focus-visible:outline-none"
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
              className="text-xs font-medium text-accent-coral hover:underline focus-visible:outline-none"
            >
              Load sample idea
            </button>
          </div>
        </div>

        {/* Intensity Selector under Options */}
        {showOptions && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="p-3 rounded-2xl bg-fill/50 border border-border space-y-1"
          >
            <span className="text-[11px] font-medium text-text-muted block">
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
          className="w-full p-4 rounded-2xl bg-fill/50 border border-border/70 text-text-primary placeholder:text-text-tertiary text-sm leading-relaxed focus:bg-surface focus:outline-none focus:border-accent-coral transition-all resize-y"
        />

        {errorMessage && (
          <div className="flex items-center gap-2 text-xs text-accent-coral bg-accent-coral/10 p-3 rounded-xl border border-accent-coral/20">
            <AlertTriangle size={14} />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleStartAttack}
            disabled={loading}
            className="h-11 px-6 rounded-2xl bg-accent-coral text-white font-semibold text-sm shadow-sm hover:bg-accent-coral/90 disabled:opacity-50 transition-all flex items-center gap-2 focus-visible:outline-none"
          >
            <span>{loading ? "Priming Attacks..." : "Launch Red Team Stress-Test"}</span>
            <ArrowRight size={15} />
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
            <div className="rounded-3xl bg-surface border border-border p-6 shadow-card flex flex-col sm:flex-row items-center justify-between gap-6">
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
                  className="px-3 py-1.5 rounded-xl border border-border text-xs font-medium text-text-muted hover:text-text-primary hover:bg-fill transition-colors flex items-center gap-1.5 focus-visible:outline-none"
                >
                  <Layers size={13} />
                  <span>All Attacks ({battle.attacks.length})</span>
                </button>
              </div>
            </div>

            {/* Focused Attack Card (Boss Moment) */}
            {currentAttack && !isBattleComplete && (
              <div className="rounded-3xl bg-surface border border-border p-6 shadow-card space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-semibold text-text-tertiary">
                      Attack {currentAttackIdx + 1} of {battle.attacks.length}
                    </span>
                    <span className="text-text-tertiary">·</span>
                    <span className="text-xs text-text-muted font-medium">
                      {currentAttack.domain}
                    </span>
                  </div>

                  <span
                    className={`text-[11px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full border ${getSeverityBadge(
                      currentAttack.severity
                    )}`}
                  >
                    {currentAttack.severity} Severity
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-text-primary mb-1">
                    {currentAttack.title}
                  </h3>
                  <p className="text-sm text-text-muted leading-relaxed">
                    {currentAttack.scenario}
                  </p>
                </div>

                {/* Defense Input Form */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                      Your Architectural Rebuttal
                    </label>
                    <button
                      type="button"
                      onClick={() => setDefenseText(DEMO_ATTACK_DEFENSE)}
                      className="text-xs font-medium text-accent-coral hover:underline focus-visible:outline-none"
                    >
                      Fill sample defense
                    </button>
                  </div>

                  <textarea
                    rows={3}
                    value={defenseText}
                    onChange={(e) => setDefenseText(e.target.value)}
                    placeholder="Articulate your concrete fallback, circuit breaker, caching layer, or encryption standard..."
                    className="w-full p-4 rounded-2xl bg-fill/50 border border-border/70 text-text-primary placeholder:text-text-tertiary text-sm leading-relaxed focus:bg-surface focus:outline-none focus:border-accent-coral transition-all resize-y"
                  />

                  {/* Defense Result Feedback if submitted */}
                  {currentResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-2xl bg-fill/60 border border-border space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-text-primary">
                          Defense Rating: {currentResult.rating}/10
                        </span>
                        <span className="font-mono text-accent-green font-semibold">
                          +{currentResult.hp_change} HP Recovery
                        </span>
                      </div>
                      <p className="text-text-muted">{currentResult.feedback}</p>
                    </motion.div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    {!currentResult ? (
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={handleDefend}
                        disabled={defending || !defenseText.trim()}
                        className="h-10 px-5 rounded-2xl bg-accent-coral text-white font-medium text-xs shadow-sm hover:bg-accent-coral/90 disabled:opacity-50 transition-all flex items-center gap-1.5 focus-visible:outline-none"
                      >
                        <ShieldCheck size={14} />
                        <span>{defending ? "Evaluating..." : "Submit Defense"}</span>
                      </motion.button>
                    ) : (
                      <div className="flex items-center gap-2">
                        {currentAttackIdx < battle.attacks.length - 1 ? (
                          <motion.button
                            whileTap={{ scale: 0.97 }}
                            onClick={() => {
                              setCurrentAttackIdx((prev) => prev + 1);
                              setDefenseText("");
                            }}
                            className="h-10 px-5 rounded-2xl bg-text-primary text-bg font-semibold text-xs shadow-sm transition-all flex items-center gap-1.5 focus-visible:outline-none"
                          >
                            <span>Next Attack</span>
                            <ChevronRight size={14} />
                          </motion.button>
                        ) : (
                          <span className="text-xs font-semibold text-accent-green flex items-center gap-1">
                            <CheckCircle2 size={13} />
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
