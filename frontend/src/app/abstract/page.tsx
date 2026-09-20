"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  ArrowRight,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Check,
  AlertCircle,
  Send,
  Layers
} from "lucide-react";
import { api, AbstractAnalysisResponse } from "@/lib/api";
import { DEMO_ABSTRACT_INITIAL, DEMO_ABSTRACT_IMPROVED } from "@/lib/demoData";
import { sounds } from "@/lib/sounds";
import { RadialScoreDial } from "@/components/common/RadialScoreDial";
import { Expander } from "@/components/common/Expander";
import { Sparkline } from "@/components/common/Sparkline";
import { AIThinkingPanel } from "@/components/common/AIThinkingPanel";
import { XPToast } from "@/components/common/XPToast";
import { useGsapEntrance } from "@/lib/animations";

export default function AbstractAnalyzerPage() {
  const containerRef = useGsapEntrance<HTMLDivElement>(".gsap-fade-in", 0.04);
  const [abstractText, setAbstractText] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentThought, setCurrentThought] = useState("");
  const [allThoughts, setAllThoughts] = useState<string[]>([]);
  const [analysis, setAnalysis] = useState<AbstractAnalysisResponse | null>(null);
  const [history, setHistory] = useState<{ id: string; score: number; date: string }[]>([]);
  const [completedQuests, setCompletedQuests] = useState<Set<string>>(new Set());
  const [toastXp, setToastXp] = useState<number | null>(null);
  const [levelUp, setLevelUp] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Formal Submission to Organizer State
  const [projectTitle, setProjectTitle] = useState("HackPilot AI Hackathon Copilot");
  const [teamName, setTeamName] = useState("Team HackPilot");
  const [submitting, setSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  const handleSubmitProject = async () => {
    if (!abstractText.trim()) return;
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const sub = await api.createSubmission({
        title: projectTitle || "Hackathon Project",
        team_name: teamName || "Team HackPilot",
        abstract: abstractText,
      });
      setSubmittedId(sub.id);
      sounds.playXP();
      setToastXp(100);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create submission.";
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const wordCount = abstractText.trim() ? abstractText.trim().split(/\s+/).length : 0;

  // Handle Analysis
  const handleAnalyze = async (textToAnalyze?: string, prevId?: string) => {
    const text = textToAnalyze || abstractText;
    if (text.trim().length < 15) {
      setErrorMessage("Please enter at least 15 characters to analyze your abstract.");
      return;
    }

    setErrorMessage(null);
    setLoading(true);
    setCurrentThought("Initializing evaluation pipeline...");
    setAllThoughts(["Scanning abstract syntax and structure..."]);

    const jobId = `job-${Date.now()}`;
    // Start SSE stream narration
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
      const response = await api.analyzeAbstract({
        abstract: text,
        previous_analysis_id: prevId || (analysis ? analysis.id : undefined),
      });

      setAnalysis(response);
      setHistory((prev) => [
        ...prev,
        { id: response.id, score: response.overall_score, date: new Date().toLocaleTimeString() }
      ]);

      if (response.gamification?.xp_gained) {
        sounds.playXP();
        setToastXp(response.gamification.xp_gained);
        if (response.gamification.level_up) {
          sounds.playLevelUp();
          setLevelUp(true);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to analyze abstract.";
      setErrorMessage(msg);
    } finally {
      unsubscribe();
      setLoading(false);
    }
  };

  // 1-Click "Improve with suggested fixes" before/after demo
  const handleImproveDemo = () => {
    setAbstractText(DEMO_ABSTRACT_IMPROVED);
    handleAnalyze(DEMO_ABSTRACT_IMPROVED, analysis?.id);
  };

  // Mark Quest as fixed
  const handleCompleteQuest = async (questId: string, xpReward: number) => {
    try {
      await api.completeQuest(questId);
      setCompletedQuests((prev) => new Set(prev).add(questId));
      sounds.playXP();
      setToastXp(xpReward);
    } catch {
      // Optimistic completion
      setCompletedQuests((prev) => new Set(prev).add(questId));
      sounds.playXP();
      setToastXp(xpReward);
    }
  };

  return (
    <div ref={containerRef} className="max-w-[1200px] w-full mx-auto px-4 sm:px-8 py-8 space-y-10">
      {/* Top Banner / Theme Header */}
      <div className="gsap-fade-in space-y-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-mono font-bold text-cyber-yellow uppercase tracking-widest">
          <FileText size={14} />
          <span>Abstract Diagnostic Engine</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white leading-tight">
          Turn abstract weaknesses into quests.
        </h1>
        <p className="text-sm sm:text-base text-zinc-400 max-w-2xl leading-relaxed">
          Judges spend 3 minutes reviewing. Test your abstract against high-impact heuristics, complete fixable quests to earn XP, and watch your score delta jump.
        </p>
      </div>

      {/* Editor & Step 1 */}
      <div className="gsap-fade-in rounded-[32px] bg-void-charcoal/80 border border-white/10 p-7 sm:p-8 shadow-2xl backdrop-blur-xl space-y-5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">
            Project Abstract
          </label>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-zinc-500">
              {wordCount} words
            </span>
            <button
              type="button"
              onClick={() => {
                setAbstractText(DEMO_ABSTRACT_INITIAL);
                setErrorMessage(null);
              }}
              className="text-xs font-bold text-cyber-yellow hover:underline focus-visible:outline-none"
            >
              Load Sample Data
            </button>
          </div>
        </div>

        <textarea
          rows={5}
          value={abstractText}
          onChange={(e) => setAbstractText(e.target.value)}
          placeholder="Paste your project abstract here... (e.g. problem statement, architecture, target users, and impact)"
          className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-zinc-500 text-sm leading-relaxed focus:bg-white/10 focus:outline-none focus:border-cyber-yellow transition-all resize-y"
        />

        {errorMessage && (
          <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-500/10 p-3 rounded-2xl border border-rose-500/20">
            <AlertCircle size={14} />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          {/* Primary Action Button */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleAnalyze()}
            disabled={loading}
            className="h-12 px-8 rounded-full bg-cyber-yellow text-black font-extrabold text-sm shadow-yellow-glow hover:bg-cyber-yellow-hover disabled:opacity-50 transition-all flex items-center gap-2 focus-visible:outline-none"
          >
            <span>{loading ? "Analyzing Pipeline..." : "Analyze Abstract"}</span>
            <ArrowRight size={16} />
          </motion.button>

          {/* Secondary Action: Before/After Demo Button */}
          {(analysis || abstractText) && (
            <motion.button
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleImproveDemo}
              disabled={loading}
              className="h-12 px-6 rounded-full bg-white/5 hover:bg-white/10 text-white font-bold text-sm transition-all border border-white/15 flex items-center gap-2 focus-visible:outline-none active:scale-95"
              title="One-click demo: loads an improved abstract with metrics and demonstrates score jump ~48 to ~86"
            >
              <RotateCcw size={15} className="text-cyber-yellow" />
              <span>Improve with Suggested Fixes (Demo)</span>
            </motion.button>
          )}
        </div>
      </div>

      {/* AI Streaming Narration Panel */}
      <AIThinkingPanel
        currentThought={currentThought}
        allThoughts={allThoughts}
        isThinking={loading}
      />

      {/* Step 2: Essential Results */}
      <AnimatePresence>
        {analysis && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            {/* Essential Card: Score Dial + One-Sentence Verdict */}
            <div className="rounded-[32px] bg-void-charcoal/85 border border-white/10 p-7 sm:p-8 shadow-2xl backdrop-blur-xl flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex flex-col items-center md:items-start text-center md:text-left gap-3 max-w-lg">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono uppercase tracking-widest text-zinc-400 font-bold">
                    Jury Verdict
                  </span>
                  {analysis.score_delta !== null && analysis.score_delta !== undefined && (
                    <span
                      className={`text-xs font-mono font-bold px-3 py-0.5 rounded-full border ${
                        analysis.score_delta >= 0
                          ? "bg-cyber-yellow text-black border-cyber-yellow"
                          : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                      }`}
                    >
                      {analysis.score_delta > 0 ? `+${analysis.score_delta} pts delta` : `${analysis.score_delta} pts`}
                    </span>
                  )}
                </div>

                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  {analysis.one_sentence_verdict}
                </h2>

                <p className="text-xs text-zinc-400">
                  {analysis.strengths[0] || "Clear problem context identified."}
                </p>
              </div>

              {/* Radial Dial */}
              <div className="shrink-0">
                <RadialScoreDial
                  score={analysis.overall_score}
                  delta={analysis.score_delta}
                  showVerdict
                  size={152}
                />
              </div>
            </div>

            {/* Submit to Organizer Panel */}
            <div className="rounded-[32px] border border-white/15 bg-void-charcoal/80 p-6 sm:p-8 shadow-2xl space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Send size={15} className="text-cyber-yellow" />
                <span>Submit Project to Organizer Dashboard</span>
              </div>

              {submittedId ? (
                <div className="flex items-center gap-2 text-sm text-cyber-yellow font-bold p-4 bg-cyber-yellow/10 rounded-2xl border border-cyber-yellow/20">
                  <Layers size={16} />
                  <span>Submitted! ID: <span className="font-mono text-xs text-white">{submittedId.slice(0, 8)}…</span> — visible in organizer console.</span>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-zinc-400 font-bold block mb-1.5 uppercase tracking-wider">Project Title</label>
                      <input
                        type="text"
                        value={projectTitle}
                        onChange={e => setProjectTitle(e.target.value)}
                        placeholder="My Hackathon Project"
                        className="w-full px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-cyber-yellow"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-400 font-bold block mb-1.5 uppercase tracking-wider">Team Name</label>
                      <input
                        type="text"
                        value={teamName}
                        onChange={e => setTeamName(e.target.value)}
                        placeholder="Team HackPilot"
                        className="w-full px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-cyber-yellow"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleSubmitProject}
                    disabled={submitting || !abstractText.trim()}
                    className="w-full py-3 rounded-full bg-cyber-yellow text-black font-extrabold text-sm flex items-center justify-center gap-2 hover:bg-cyber-yellow-hover shadow-yellow-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                  >
                    {submitting ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                        Submitting…
                      </span>
                    ) : (
                      <><Send size={14} /> Submit Abstract to Organizer</>
                    )}
                  </button>
                  <p className="text-[11px] text-zinc-400 text-center font-mono">
                    Creates an authoritative entry in the organizer dashboard, synced to AWS DynamoDB.
                  </p>
                </div>
              )}
            </div>

            {/* Top 3 Actionable Quests */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-white tracking-tight">
                    Top Action Quests
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Resolve these specific weaknesses to earn XP and maximize jury rating.
                  </p>
                </div>
                <span className="text-xs font-mono text-zinc-400 font-bold">
                  {analysis.weaknesses.length} Quests Identified
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {analysis.weaknesses.slice(0, 3).map((quest) => {
                  const isDone = completedQuests.has(quest.id);
                  return (
                    <div
                      key={quest.id}
                      className={`rounded-[32px] p-6 border transition-all flex flex-col justify-between gap-5 ${
                        isDone
                          ? "bg-cyber-yellow/5 border-cyber-yellow/30 opacity-85"
                          : "bg-void-charcoal/80 border-white/10 hover:border-cyber-yellow/50 shadow-xl"
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-cyber-yellow flex items-center gap-1">
                            <Sparkles size={12} className="fill-cyber-yellow" />
                            +{quest.xp_reward} XP
                          </span>
                          {isDone && (
                            <span className="flex items-center gap-1 text-xs font-bold text-cyber-yellow">
                              <Check size={13} /> Fixed
                            </span>
                          )}
                        </div>

                        <h4 className="text-base font-bold text-white leading-snug">
                          {quest.title}
                        </h4>

                        <p className="text-xs text-zinc-400 leading-relaxed">
                          {quest.why_it_matters}
                        </p>

                        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-xs text-zinc-300 font-mono leading-relaxed">
                          <span className="text-cyber-yellow font-bold">Fix: </span>
                          {quest.suggested_fix}
                        </div>
                      </div>

                      {!isDone ? (
                        <button
                          type="button"
                          onClick={() => handleCompleteQuest(quest.id, quest.xp_reward)}
                          className="w-full py-2.5 rounded-full bg-cyber-yellow text-black hover:bg-cyber-yellow-hover font-bold text-xs transition-all flex items-center justify-center gap-2 active:scale-95 shadow-md"
                        >
                          <CheckCircle2 size={14} />
                          <span>Mark Fixed (+{quest.xp_reward} XP)</span>
                        </button>
                      ) : (
                        <div className="w-full py-2 text-center text-xs font-bold text-cyber-yellow bg-cyber-yellow/10 rounded-full border border-cyber-yellow/20">
                          Quest Resolved
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Progressive Disclosure Sections: Metrics, Evidence, History */}
            <div className="space-y-3 pt-2">
              {/* All 5 Evaluation Metrics */}
              <Expander title="All 5 Evaluation Metrics (Rubric Breakdown)" badge="5 Dimensions">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-2">
                  {Object.entries(analysis.scores).map(([key, item]) => (
                    <div key={key} className="p-4 rounded-2xl bg-white/5 border border-white/10">
                      <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest capitalize">
                        {key.replace("_", " ")}
                      </div>
                      <div className="text-2xl font-mono font-black text-cyber-yellow my-1">
                        {item.score}<span className="text-xs text-zinc-500 font-normal">/10</span>
                      </div>
                      <div className="text-xs text-zinc-400 truncate">
                        {item.verdict}
                      </div>
                    </div>
                  ))}
                </div>
              </Expander>

              {/* Why This Score? Evidence Citations */}
              <Expander title="Why this score? (Cited Textual Evidence)" badge="Text Quotes">
                <div className="space-y-2 pt-2 text-xs">
                  {Object.entries(analysis.scores).map(([key, item]) => (
                    <div key={key} className="space-y-1">
                      <span className="font-bold text-white capitalize">
                        {key.replace("_", " ")}:
                      </span>
                      <ul className="list-disc list-inside text-zinc-400 font-mono space-y-0.5 ml-1">
                        {item.evidence.map((ev, i) => (
                          <li key={i}>{ev}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </Expander>

              {/* Attempt History & Progression Sparkline */}
              {history.length > 1 && (
                <Expander title="Revision Attempt History" badge={`${history.length} attempts`}>
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-white">
                        Score Progression
                      </div>
                      <div className="text-xs text-zinc-400 font-mono">
                        Initial: {history[0].score}/100 → Latest: {analysis.overall_score}/100
                      </div>
                    </div>
                    <Sparkline
                      data={history.map((h) => h.score)}
                      width={220}
                      height={40}
                      color="#FDE047"
                    />
                  </div>
                </Expander>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <XPToast xp={toastXp} levelUp={levelUp} onDone={() => setToastXp(null)} />
    </div>
  );
}
