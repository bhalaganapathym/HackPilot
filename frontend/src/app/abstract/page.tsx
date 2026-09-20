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
    <div ref={containerRef} className="space-y-10 pb-16">
      {/* Top Banner / Theme Header */}
      <div className="gsap-fade-in">
        <div className="flex items-center gap-2 text-xs font-mono font-semibold text-accent-blue uppercase tracking-wider mb-1">
          <FileText size={14} />
          <span>Abstract Analyzer</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-text-primary mb-2">
          Turn abstract weaknesses into quests.
        </h1>
        <p className="text-sm sm:text-base text-text-muted max-w-xl">
          Judges have 3 minutes. Test your abstract against real scoring heuristics, complete weakness quests to earn XP, and track your score delta.
        </p>
      </div>

      {/* Editor & Step 1 */}
      <div className="gsap-fade-in rounded-3xl bg-surface border border-border p-6 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Project Abstract
          </label>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-text-tertiary">
              {wordCount} words
            </span>
            <button
              type="button"
              onClick={() => {
                setAbstractText(DEMO_ABSTRACT_INITIAL);
                setErrorMessage(null);
              }}
              className="text-xs font-medium text-accent-blue hover:underline focus-visible:outline-none"
            >
              Load sample
            </button>
          </div>
        </div>

        <textarea
          rows={5}
          value={abstractText}
          onChange={(e) => setAbstractText(e.target.value)}
          placeholder="Paste your project abstract here... (e.g. problem statement, architecture, target users, and impact)"
          className="w-full p-4 rounded-2xl bg-fill/50 border border-border/70 text-text-primary placeholder:text-text-tertiary text-sm leading-relaxed focus:bg-surface focus:outline-none focus:border-accent-blue transition-all resize-y"
        />

        {errorMessage && (
          <div className="flex items-center gap-2 text-xs text-accent-coral bg-accent-coral/10 p-3 rounded-xl border border-accent-coral/20">
            <AlertCircle size={14} />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          {/* Primary Action Button */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => handleAnalyze()}
            disabled={loading}
            className="h-11 px-6 rounded-2xl bg-accent-blue text-white font-medium text-sm shadow-sm hover:bg-accent-blue/90 disabled:opacity-50 transition-all flex items-center gap-2 focus-visible:outline-none"
          >
            <span>{loading ? "Analyzing..." : "Analyze Abstract"}</span>
            <ArrowRight size={15} />
          </motion.button>

          {/* Secondary Action: Before/After Demo Button (Revealed after first analysis or sample loaded) */}
          {(analysis || abstractText) && (
            <motion.button
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleImproveDemo}
              disabled={loading}
              className="h-11 px-5 rounded-2xl bg-fill hover:bg-fill-hover text-text-primary font-medium text-sm transition-colors border border-border/60 flex items-center gap-2 focus-visible:outline-none"
              title="One-click demo: loads an improved abstract with metrics and demonstrates score jump ~48 to ~86"
            >
              <RotateCcw size={14} className="text-accent-blue" />
              <span>Improve with suggested fixes (Demo)</span>
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
            <div className="rounded-3xl bg-surface border border-border p-6 shadow-card flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex flex-col items-center md:items-start text-center md:text-left gap-2 max-w-lg">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono uppercase tracking-wider text-text-tertiary">
                    Jury Verdict
                  </span>
                  {analysis.score_delta !== null && analysis.score_delta !== undefined && (
                    <span
                      className={`text-xs font-mono font-semibold px-2 py-0.5 rounded-full border ${
                        analysis.score_delta >= 0
                          ? "bg-accent-green/10 text-accent-green border-accent-green/30"
                          : "bg-accent-coral/10 text-accent-coral border-accent-coral/30"
                      }`}
                    >
                      {analysis.score_delta > 0 ? `+${analysis.score_delta} pts delta` : `${analysis.score_delta} pts`}
                    </span>
                  )}
                </div>

                <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-text-primary">
                  {analysis.one_sentence_verdict}
                </h2>

                <p className="text-xs text-text-muted">
                  {analysis.strengths[0] || "Clear problem context identified."}
                </p>
              </div>

              {/* Radial Dial */}
              <div className="shrink-0">
                <RadialScoreDial
                  score={analysis.overall_score}
                  delta={analysis.score_delta}
                  showVerdict
                  size={144}
                />
              </div>
            </div>

            {/* Submit to Organizer Panel */}
            <div className="rounded-2xl border border-accent-violet/30 bg-surface p-5 space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                <Send size={14} className="text-accent-violet" />
                <span>Submit Project to Organizer</span>
              </div>

              {submittedId ? (
                <div className="flex items-center gap-2 text-sm text-accent-green font-medium p-3 bg-accent-green/10 rounded-xl border border-accent-green/20">
                  <Layers size={14} />
                  <span>Submitted! ID: <span className="font-mono text-xs">{submittedId.slice(0, 8)}…</span> — visible in organizer dashboard.</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-text-muted font-medium block mb-1">Project Title</label>
                      <input
                        type="text"
                        value={projectTitle}
                        onChange={e => setProjectTitle(e.target.value)}
                        placeholder="My Hackathon Project"
                        className="w-full px-3 py-2 rounded-xl bg-fill border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-violet/50"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-text-muted font-medium block mb-1">Team Name</label>
                      <input
                        type="text"
                        value={teamName}
                        onChange={e => setTeamName(e.target.value)}
                        placeholder="Team HackPilot"
                        className="w-full px-3 py-2 rounded-xl bg-fill border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-violet/50"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleSubmitProject}
                    disabled={submitting || !abstractText.trim()}
                    className="w-full py-2.5 rounded-xl bg-accent-violet text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-accent-violet/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <span className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Submitting…
                      </span>
                    ) : (
                      <><Send size={13} /> Submit Abstract to Organizer</>
                    )}
                  </button>
                  <p className="text-[11px] text-text-muted text-center">
                    Creates a live entry in the organizer dashboard, synced to AWS DynamoDB.
                  </p>
                </div>
              )}
            </div>

            {/* Top 3 Actionable Quests */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-text-primary">
                    Top Action Quests
                  </h3>
                  <p className="text-xs text-text-muted">
                    Resolve these specific weaknesses to earn XP and maximize jury rating.
                  </p>
                </div>
                <span className="text-xs font-mono text-text-tertiary">
                  {analysis.weaknesses.length} Quests Identified
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {analysis.weaknesses.slice(0, 3).map((quest) => {
                  const isDone = completedQuests.has(quest.id);
                  return (
                    <div
                      key={quest.id}
                      className={`rounded-2xl p-5 border transition-all flex flex-col justify-between gap-4 ${
                        isDone
                          ? "bg-accent-green/5 border-accent-green/30 opacity-80"
                          : "bg-surface border-border hover:border-accent-blue/40 shadow-sm"
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-mono font-semibold text-accent-green flex items-center gap-1">
                            <Sparkles size={11} />
                            +{quest.xp_reward} XP
                          </span>
                          {isDone && (
                            <span className="flex items-center gap-1 text-[11px] font-medium text-accent-green">
                              <Check size={12} /> Fixed
                            </span>
                          )}
                        </div>

                        <h4 className="text-sm font-semibold text-text-primary leading-snug">
                          {quest.title}
                        </h4>

                        <p className="text-xs text-text-muted leading-relaxed">
                          {quest.why_it_matters}
                        </p>

                        <div className="p-2.5 rounded-xl bg-fill/60 border border-border/40 text-[11px] text-text-primary font-mono leading-relaxed">
                          <span className="text-text-tertiary">Fix: </span>
                          {quest.suggested_fix}
                        </div>
                      </div>

                      {!isDone ? (
                        <button
                          type="button"
                          onClick={() => handleCompleteQuest(quest.id, quest.xp_reward)}
                          className="w-full py-2 rounded-xl bg-accent-green/10 text-accent-green border border-accent-green/20 hover:bg-accent-green/20 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 focus-visible:outline-none"
                        >
                          <CheckCircle2 size={13} />
                          <span>Mark Fixed (+{quest.xp_reward} XP)</span>
                        </button>
                      ) : (
                        <div className="w-full py-1.5 text-center text-xs font-medium text-accent-green bg-accent-green/10 rounded-xl">
                          Resolved
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
                    <div key={key} className="p-3 rounded-xl bg-fill border border-border/50">
                      <div className="text-[11px] font-medium text-text-muted uppercase tracking-wider capitalize">
                        {key.replace("_", " ")}
                      </div>
                      <div className="text-xl font-mono font-bold text-text-primary my-1">
                        {item.score}<span className="text-xs text-text-muted font-normal">/10</span>
                      </div>
                      <div className="text-[11px] text-text-muted truncate">
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
                      <span className="font-semibold text-text-primary capitalize">
                        {key.replace("_", " ")}:
                      </span>
                      <ul className="list-disc list-inside text-text-muted font-mono space-y-0.5 ml-1">
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
                      <div className="text-xs font-semibold text-text-primary">
                        Score Progression
                      </div>
                      <div className="text-xs text-text-muted">
                        Initial: {history[0].score}/100 → Latest: {analysis.overall_score}/100
                      </div>
                    </div>
                    <Sparkline
                      data={history.map((h) => h.score)}
                      width={220}
                      height={40}
                      color="var(--accent-blue)"
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
