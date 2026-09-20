"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  Timer,
  RotateCcw,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  ChevronRight,
  Play,
  Mic2,
  Target,
} from "lucide-react";
import { api, RapidFireEvaluateRequest, RapidFireResponse } from "@/lib/api";
import { XPToast } from "@/components/common/XPToast";
import { AIThinkingPanel } from "@/components/common/AIThinkingPanel";
import { RadialScoreDial } from "@/components/common/RadialScoreDial";
import { sounds } from "@/lib/sounds";

type Phase = "IDLE" | "COUNTDOWN" | "ACTIVE" | "EVALUATING" | "RESULTS";

const TOTAL_SECONDS = 60;

const PHASE_PROMPTS: Record<string, { range: string; prompt: string; color: string }> = {
  "45-60": {
    range: "0-15s",
    prompt: "Hook: Who is the user and what painful problem do they have?",
    color: "text-cyan-400",
  },
  "30-45": {
    range: "15-30s",
    prompt: "Solution: What exactly does your hack do? One clear sentence.",
    color: "text-yellow-400",
  },
  "15-30": {
    range: "30-45s",
    prompt: "Differentiation: Why is this better than anything existing?",
    color: "text-orange-400",
  },
  "0-15": {
    range: "45-60s",
    prompt: "Close: What is your ask? Demo / next step / impact metric?",
    color: "text-green-400",
  },
};

function getPhasePrompt(secondsLeft: number) {
  if (secondsLeft > 45) return PHASE_PROMPTS["45-60"];
  if (secondsLeft > 30) return PHASE_PROMPTS["30-45"];
  if (secondsLeft > 15) return PHASE_PROMPTS["15-30"];
  return PHASE_PROMPTS["0-15"];
}

function ScoreBar({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-300">{label}</span>
        <span className={`font-bold ${color}`}>{score}/10</span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score * 10}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={`h-full rounded-full ${
            score >= 8 ? "bg-green-500" : score >= 6 ? "bg-yellow-500" : score >= 4 ? "bg-orange-500" : "bg-red-500"
          }`}
        />
      </div>
    </div>
  );
}

export default function RapidFirePage() {
  const [phase, setPhase] = useState<Phase>("IDLE");
  const [countdown, setCountdown] = useState(3);
  const [secondsLeft, setSecondsLeft] = useState(TOTAL_SECONDS);
  const [pitchText, setPitchText] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
  const [result, setResult] = useState<RapidFireResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastXp, setToastXp] = useState<number | null>(null);
  const [currentThought, setCurrentThought] = useState("");
  const [allThoughts, setAllThoughts] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (phase !== "COUNTDOWN") return;
    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          setPhase("ACTIVE");
          setSecondsLeft(TOTAL_SECONDS);
          sounds.playClick();
          setTimeout(() => textareaRef.current?.focus(), 100);
          return 0;
        }
        sounds.playClick();
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  const handleEvaluate = useCallback(async () => {
    clearTimer();
    setPhase("EVALUATING");
    setCurrentThought("Parsing pitch structure and narrative flow...");
    setAllThoughts(["Scoring clarity, impact, feasibility, differentiation..."]);

    const jobId = `job-rapidfire-${Date.now()}`;
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
      const payload: RapidFireEvaluateRequest = {
        pitch_text: pitchText || "(No pitch delivered in time)",
        project_title: projectTitle || undefined,
        time_taken_seconds: TOTAL_SECONDS - secondsLeft || 60,
      };
      const res = await api.evaluateRapidFire(payload);
      setResult(res);
      setPhase("RESULTS");
      const xp = res.gamification?.xp_gained ?? 0;
      if (xp > 0) {
        setToastXp(xp);
        sounds.playLevelUp();
      } else {
        sounds.playSuccess();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Evaluation failed";
      setErrorMessage(msg);
      setPhase("IDLE");
    } finally {
      unsubscribe();
    }
  }, [pitchText, projectTitle, secondsLeft, clearTimer]);

  useEffect(() => {
    if (phase !== "ACTIVE") return;
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearTimer();
          handleEvaluate();
          return 0;
        }
        if (s === 15 || s === 30 || s === 45) {
          sounds.playHit();
        }
        return s - 1;
      });
    }, 1000);
    return clearTimer;
  }, [phase, handleEvaluate, clearTimer]);

  const handleStart = () => {
    if (!projectTitle.trim()) return;
    setPhase("COUNTDOWN");
    setPitchText("");
    setResult(null);
    setErrorMessage(null);
  };

  const handleReset = () => {
    clearTimer();
    setPhase("IDLE");
    setSecondsLeft(TOTAL_SECONDS);
    setPitchText("");
    setResult(null);
    setErrorMessage(null);
    setCurrentThought("");
    setAllThoughts([]);
  };

  const currentPhasePrompt = phase === "ACTIVE" ? getPhasePrompt(secondsLeft) : null;
  const progress = ((TOTAL_SECONDS - secondsLeft) / TOTAL_SECONDS) * 100;
  const isUrgent = secondsLeft <= 15 && phase === "ACTIVE";
  const scores = result?.analysis?.scores;
  const avgScore = scores
    ? Math.round(
        ((scores.problem_clarity + scores.solution_clarity + scores.differentiation +
          scores.technical_explanation + scores.impact + scores.conciseness + scores.judge_readiness) / 7) * 10
      )
    : 0;

  return (
    <div className="space-y-8 pb-16 max-w-[1200px] mx-auto px-4 sm:px-8 py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyber-yellow/10 border border-cyber-yellow/30 text-cyber-yellow text-xs font-mono font-bold tracking-wide mx-auto">
            <Zap size={13} />
            <span>High-Speed Evaluation Engine</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white">
            60-Second Rapid Fire
          </h1>
          <p className="text-white/60 text-sm max-w-xl mx-auto leading-relaxed">
            Deliver your pitch in 60 seconds. AI evaluates clarity, impact, structure, and judge readiness in real time.
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {phase === "IDLE" && (
            <motion.div key="idle" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-[#171717]/80 backdrop-blur-xl border border-white/10 rounded-[32px] p-6 sm:p-8 space-y-6 shadow-2xl">
              <div className="space-y-2">
                <label className="text-xs font-mono uppercase tracking-wider text-white/60 font-bold flex items-center gap-2">
                  <Target className="w-4 h-4 text-cyber-yellow" />
                  Your project title
                </label>
                <input
                  type="text"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  placeholder="e.g. AI-powered campus waste management"
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder-white/40 focus:outline-none focus:border-cyber-yellow/50 transition-colors text-sm"
                  maxLength={150}
                  onKeyDown={(e) => e.key === "Enter" && handleStart()}
                />
                <p className="text-xs text-white/40 font-mono">This gives the AI context for evaluation. Press Enter or click Start.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {["Sustainable campus IoT", "Mental health support app", "AI tutor for rural schools"].map((t) => (
                  <button key={t} onClick={() => setProjectTitle(t)} className="px-3.5 py-1.5 bg-[#0A0A0A] hover:bg-white/10 border border-white/10 hover:border-cyber-yellow/40 rounded-full text-xs text-white/70 hover:text-white transition-all active:scale-95">
                    {t}
                  </button>
                ))}
              </div>
              <div className="bg-[#0A0A0A]/60 border border-white/10 rounded-[24px] p-5 space-y-2.5">
                <p className="text-xs font-mono font-bold text-cyber-yellow uppercase tracking-wider">How it works</p>
                <ul className="text-xs text-white/70 space-y-2">
                  <li className="flex items-start gap-2"><ChevronRight className="w-3.5 h-3.5 mt-0.5 text-cyber-yellow shrink-0" /><span>3-second countdown then the 60-second timer starts</span></li>
                  <li className="flex items-start gap-2"><ChevronRight className="w-3.5 h-3.5 mt-0.5 text-cyber-yellow shrink-0" /><span>Type your pitch. Prompts guide each 15-second segment</span></li>
                  <li className="flex items-start gap-2"><ChevronRight className="w-3.5 h-3.5 mt-0.5 text-cyber-yellow shrink-0" /><span>When time is up, AI evaluates across 7 dimensions</span></li>
                  <li className="flex items-start gap-2"><ChevronRight className="w-3.5 h-3.5 mt-0.5 text-cyber-yellow shrink-0" /><span>Earn 60 XP + Speed Demon badge on completion</span></li>
                </ul>
              </div>
              {errorMessage && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-2xl px-4 py-3 text-red-400 text-xs flex items-center gap-2">{errorMessage}</div>
              )}
              <button
                onClick={handleStart}
                disabled={!projectTitle.trim()}
                className="w-full flex items-center justify-center gap-3 py-4 rounded-full font-black text-base bg-cyber-yellow hover:bg-cyber-yellow/90 active:scale-95 text-black transition-all shadow-xl shadow-cyber-yellow/20 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>Start 60-Second Pitch</span>
              </button>
            </motion.div>
          )}

          {phase === "COUNTDOWN" && (
            <motion.div key="countdown" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.2 }} className="flex flex-col items-center justify-center py-24 space-y-6">
              <AnimatePresence mode="wait">
                <motion.div key={countdown} initial={{ scale: 1.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={{ duration: 0.4 }} className="text-9xl font-black text-cyber-yellow tracking-tighter drop-shadow-[0_0_40px_rgba(253,224,71,0.4)]">
                  {countdown > 0 ? countdown : "GO!"}
                </motion.div>
              </AnimatePresence>
              <p className="text-white/60 font-mono text-sm uppercase tracking-wider">Get ready to pitch...</p>
            </motion.div>
          )}

          {phase === "ACTIVE" && (
            <motion.div key="active" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="bg-[#171717]/80 backdrop-blur-xl border border-white/10 rounded-[32px] p-6 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Timer className={`w-6 h-6 ${isUrgent ? "text-red-400 animate-pulse" : "text-cyber-yellow"}`} />
                    <span className={`text-4xl font-mono font-black tabular-nums ${isUrgent ? "text-red-400" : "text-cyber-yellow"}`}>
                      {String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:{String(secondsLeft % 60).padStart(2, "0")}
                    </span>
                  </div>
                  <button onClick={handleEvaluate} className="px-6 py-2.5 bg-cyber-yellow hover:bg-cyber-yellow/90 active:scale-95 text-black rounded-full text-xs font-black shadow-lg shadow-cyber-yellow/20 transition-all">
                    Finish Early
                  </button>
                </div>
                <div className="h-2 bg-[#0A0A0A] rounded-full overflow-hidden border border-white/10">
                  <motion.div
                    style={{ width: `${progress}%` }}
                    className={`h-full rounded-full transition-all duration-1000 ${isUrgent ? "bg-red-500" : "bg-cyber-yellow"}`}
                  />
                </div>
              </div>

              {currentPhasePrompt && (
                <motion.div key={currentPhasePrompt.range} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-cyber-yellow/10 border border-cyber-yellow/30 rounded-2xl px-5 py-3.5 flex items-start gap-3">
                  <Mic2 className="w-4 h-4 mt-0.5 shrink-0 text-cyber-yellow" />
                  <div>
                    <p className="text-xs font-mono font-bold uppercase tracking-wider text-cyber-yellow">{currentPhasePrompt.range}</p>
                    <p className="text-sm text-white/90 font-medium">{currentPhasePrompt.prompt}</p>
                  </div>
                </motion.div>
              )}

              <textarea
                ref={textareaRef}
                value={pitchText}
                onChange={(e) => setPitchText(e.target.value)}
                placeholder="Start typing your pitch here..."
                className="w-full h-56 bg-[#0A0A0A] border border-white/10 rounded-[32px] p-5 text-white placeholder-white/40 resize-none focus:outline-none focus:border-cyber-yellow/50 text-base leading-relaxed transition-colors"
              />
            </motion.div>
          )}

          {phase === "EVALUATING" && (
            <motion.div key="evaluating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-8">
              <AIThinkingPanel currentThought={currentThought} allThoughts={allThoughts} isThinking={true} />
            </motion.div>
          )}

          {phase === "RESULTS" && result && scores && (
            <motion.div key="results" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="bg-cyber-yellow/10 border border-cyber-yellow/30 rounded-[32px] p-6 sm:p-8 flex items-center gap-6 shadow-2xl">
                <RadialScoreDial score={avgScore} size={90} label="Overall" />
                <div className="flex-1">
                  <h2 className="text-2xl font-black text-cyber-yellow">Pitch Evaluated!</h2>
                  {result.gamification?.xp_gained ? (
                    <p className="text-white font-bold mt-1 text-sm font-mono">+{result.gamification.xp_gained} XP earned</p>
                  ) : null}
                </div>
              </div>

              <div className="bg-[#171717]/80 backdrop-blur-xl border border-white/10 rounded-[32px] p-6 space-y-4 shadow-2xl">
                <h3 className="text-xs font-mono font-bold text-cyber-yellow uppercase tracking-wider">Score Breakdown</h3>
                <ScoreBar label="Problem Clarity" score={scores.problem_clarity} color="text-cyber-yellow" />
                <ScoreBar label="Solution Clarity" score={scores.solution_clarity} color="text-cyber-yellow" />
                <ScoreBar label="Differentiation" score={scores.differentiation} color="text-cyber-yellow" />
                <ScoreBar label="Technical Explanation" score={scores.technical_explanation} color="text-cyber-yellow" />
                <ScoreBar label="Impact" score={scores.impact} color="text-cyber-yellow" />
                <ScoreBar label="Conciseness" score={scores.conciseness} color="text-cyber-yellow" />
                <ScoreBar label="Judge Readiness" score={scores.judge_readiness} color="text-cyber-yellow" />
              </div>

              {result.analysis.strengths.length > 0 && (
                <div className="bg-[#171717]/80 backdrop-blur-xl border border-cyber-yellow/30 rounded-[32px] p-6 space-y-3 shadow-2xl">
                  <h3 className="text-xs font-mono font-bold text-cyber-yellow flex items-center gap-2 uppercase tracking-wider"><CheckCircle2 className="w-4 h-4" /> Strengths</h3>
                  <ul className="space-y-1.5">
                    {result.analysis.strengths.map((s, i) => (
                      <li key={i} className="text-sm text-white/80 flex items-start gap-2"><ChevronRight className="w-3.5 h-3.5 mt-0.5 text-cyber-yellow shrink-0" />{s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {result.analysis.weaknesses.length > 0 && (
                <div className="bg-[#171717]/80 backdrop-blur-xl border border-red-500/30 rounded-[32px] p-6 space-y-3 shadow-2xl">
                  <h3 className="text-xs font-mono font-bold text-red-400 flex items-center gap-2 uppercase tracking-wider"><AlertTriangle className="w-4 h-4" /> Areas to Strengthen</h3>
                  <ul className="space-y-1.5">
                    {result.analysis.weaknesses.map((w, i) => (
                      <li key={i} className="text-sm text-white/80 flex items-start gap-2"><ChevronRight className="w-3.5 h-3.5 mt-0.5 text-red-400 shrink-0" />{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {result.analysis.specific_improvements.length > 0 && (
                <div className="bg-[#171717]/80 backdrop-blur-xl border border-cyber-yellow/30 rounded-[32px] p-6 space-y-3 shadow-2xl">
                  <h3 className="text-xs font-mono font-bold text-cyber-yellow flex items-center gap-2 uppercase tracking-wider"><TrendingUp className="w-4 h-4" /> Coaching Tips</h3>
                  <ul className="space-y-1.5">
                    {result.analysis.specific_improvements.map((tip, i) => (
                      <li key={i} className="text-sm text-white/80 flex items-start gap-2"><Lightbulb className="w-3.5 h-3.5 mt-0.5 text-cyber-yellow shrink-0" />{tip}</li>
                    ))}
                  </ul>
                </div>
              )}

              {result.analysis.suggested_revised_opening && (
                <div className="bg-[#171717]/80 backdrop-blur-xl border border-white/10 rounded-[32px] p-6 space-y-2 shadow-2xl">
                  <h3 className="text-xs font-mono font-bold text-cyber-yellow uppercase tracking-wider">Suggested Opening Hook</h3>
                  <p className="text-sm text-white/90 italic leading-relaxed bg-[#0A0A0A] p-4 rounded-2xl border border-white/10">{`"${result.analysis.suggested_revised_opening}"`}</p>
                </div>
              )}

              {result.analysis.suggested_revised_closing && (
                <div className="bg-[#171717]/80 backdrop-blur-xl border border-white/10 rounded-[32px] p-6 space-y-2 shadow-2xl">
                  <h3 className="text-xs font-mono font-bold text-cyber-yellow uppercase tracking-wider">Suggested Closing</h3>
                  <p className="text-sm text-white/90 italic leading-relaxed bg-[#0A0A0A] p-4 rounded-2xl border border-white/10">{`"${result.analysis.suggested_revised_closing}"`}</p>
                </div>
              )}

              <button onClick={handleReset} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full border border-white/20 hover:border-cyber-yellow hover:bg-cyber-yellow hover:text-black text-white transition-all font-black text-sm active:scale-95 shadow-lg">
                <RotateCcw className="w-4 h-4" />
                <span>Try Again</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {toastXp !== null && <XPToast xp={toastXp} onDone={() => setToastXp(null)} />}
        </AnimatePresence>
      </div>
    </div>
  );
}
