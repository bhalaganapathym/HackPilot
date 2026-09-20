"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HelpCircle,
  ArrowRight,
  MessageCircle,
  Send,
  AlertTriangle,
  Lightbulb,
  Check
} from "lucide-react";
import { api, ProblemExplainResponse } from "@/lib/api";
import { DEMO_PROBLEM_STATEMENT } from "@/lib/demoData";
import { sounds } from "@/lib/sounds";
import { Expander } from "@/components/common/Expander";
import { AIThinkingPanel } from "@/components/common/AIThinkingPanel";
import { XPToast } from "@/components/common/XPToast";
import { useGsapEntrance } from "@/lib/animations";

interface QnAMessage {
  question: string;
  answer: string;
  is_covered: boolean;
  cited_phrases: string[];
}

export default function ProblemExplainerPage() {
  const containerRef = useGsapEntrance<HTMLDivElement>(".gsap-fade-in", 0.04);
  const [problemText, setProblemText] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentThought, setCurrentThought] = useState("");
  const [allThoughts, setAllThoughts] = useState<string[]>([]);
  const [result, setResult] = useState<ProblemExplainResponse | null>(null);
  const [checkedRequirements, setCheckedRequirements] = useState<Set<number>>(new Set());

  // Q&A chat drawer
  const [showQa, setShowQa] = useState(false);
  const [questionInput, setQuestionInput] = useState("");
  const [qaHistory, setQaHistory] = useState<QnAMessage[]>([]);
  const [asking, setAsking] = useState(false);

  const [toastXp, setToastXp] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleExplain = async () => {
    if (problemText.trim().length < 15) {
      setErrorMessage("Please enter at least 15 characters to explain the problem statement.");
      return;
    }

    setErrorMessage(null);
    setLoading(true);
    setCurrentThought("Dissecting problem statement requirements...");
    setAllThoughts(["Extracting mandatory constraints and ambiguities..."]);

    const jobId = `job-problem-${Date.now()}`;
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
      const response = await api.explainProblem(problemText);
      setResult(response);
      sounds.playXP();
      setToastXp(30);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to explain problem statement.";
      setErrorMessage(msg);
    } finally {
      unsubscribe();
      setLoading(false);
    }
  };

  const handleAskQuestion = async (qText?: string) => {
    const q = qText || questionInput;
    if (!q.trim() || !problemText.trim()) return;

    setAsking(true);
    try {
      const res = await api.askProblemQuestion(problemText, q);
      setQaHistory((prev) => [
        ...prev,
        {
          question: q,
          answer: res.answer,
          is_covered: res.is_covered,
          cited_phrases: res.cited_phrases,
        },
      ]);
      setQuestionInput("");
      sounds.playXP();
      setToastXp(15);
    } catch {
      // Error handling fallback
    } finally {
      setAsking(false);
    }
  };

  const toggleReq = (idx: number) => {
    setCheckedRequirements((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  return (
    <div ref={containerRef} className="space-y-10 pb-16">
      {/* Top Banner / Theme Header */}
      <div className="gsap-fade-in">
        <div className="flex items-center gap-2 text-xs font-mono font-semibold text-accent-amber uppercase tracking-wider mb-1">
          <HelpCircle size={14} />
          <span>Problem Statement Explainer</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-text-primary mb-2">
          Decode what hackathon judges actually want.
        </h1>
        <p className="text-sm sm:text-base text-text-muted max-w-xl">
          Translate vague, jargon-heavy challenge statements into plain English, mandatory checklists, hidden evaluation traps, and an interactive Q&amp;A oracle.
        </p>
      </div>

      {/* Input Box */}
      <div className="gsap-fade-in rounded-3xl bg-surface border border-border p-6 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Challenge / Problem Statement
          </label>
          <button
            type="button"
            onClick={() => {
              setProblemText(DEMO_PROBLEM_STATEMENT);
              setErrorMessage(null);
            }}
            className="text-xs font-medium text-accent-amber hover:underline focus-visible:outline-none"
          >
            Load sample challenge
          </button>
        </div>

        <textarea
          rows={5}
          value={problemText}
          onChange={(e) => setProblemText(e.target.value)}
          placeholder="Paste hackathon challenge statement or prompt here..."
          className="w-full p-4 rounded-2xl bg-fill/50 border border-border/70 text-text-primary placeholder:text-text-tertiary text-sm leading-relaxed focus:bg-surface focus:outline-none focus:border-accent-amber transition-all resize-y"
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
            onClick={handleExplain}
            disabled={loading}
            className="h-11 px-6 rounded-2xl bg-accent-amber text-black font-semibold text-sm shadow-sm hover:bg-accent-amber/90 disabled:opacity-50 transition-all flex items-center gap-2 focus-visible:outline-none"
          >
            <span>{loading ? "Decoding Challenge..." : "Explain Problem"}</span>
            <ArrowRight size={15} />
          </motion.button>

          {result && (
            <button
              type="button"
              onClick={() => setShowQa(!showQa)}
              className="h-11 px-4 rounded-2xl bg-fill hover:bg-fill-hover text-text-primary text-xs font-medium transition-colors border border-border/60 flex items-center gap-1.5 focus-visible:outline-none"
            >
              <MessageCircle size={14} className="text-accent-amber" />
              <span>{showQa ? "Hide Q&A" : "Ask a Question"}</span>
            </button>
          )}
        </div>
      </div>

      {/* AI Thinking Narration */}
      <AIThinkingPanel
        currentThought={currentThought}
        allThoughts={allThoughts}
        isThinking={loading}
      />

      {/* Results Section */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            {/* Plain English Summary (Always Visible First) */}
            <div className="rounded-3xl bg-surface border border-border p-6 shadow-card space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono font-semibold text-accent-amber uppercase tracking-wider">
                <Lightbulb size={13} />
                <span>Plain English Translation</span>
              </div>
              <p className="text-base sm:text-lg font-medium text-text-primary leading-relaxed">
                {result.plain_english_summary}
              </p>
            </div>

            {/* Collapsible Sections (Requirements, Constraints, Hidden Criteria, Clarifying Qs) */}
            <div className="space-y-3">
              {/* Mandatory Checklist (Open by default) */}
              <Expander
                title="Requirements Checklist (Must-Have vs Should-Have)"
                badge={`${result.requirements.must_have.length} mandatory`}
                defaultOpen={true}
              >
                <div className="space-y-4 pt-2">
                  <div>
                    <span className="text-xs font-semibold text-text-primary block mb-2">
                      Mandatory Deliverables:
                    </span>
                    <div className="space-y-2">
                      {result.requirements.must_have.map((req, idx) => {
                        const isChecked = checkedRequirements.has(idx);
                        return (
                          <div
                            key={idx}
                            onClick={() => toggleReq(idx)}
                            className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-colors ${
                              isChecked
                                ? "bg-accent-green/5 border-accent-green/30 text-text-muted line-through"
                                : "bg-surface border-border hover:bg-fill/50 text-text-primary"
                            }`}
                          >
                            <div
                              className={`w-4 h-4 rounded-md border mt-0.5 flex items-center justify-center transition-colors ${
                                isChecked
                                  ? "bg-accent-green border-accent-green text-white"
                                  : "border-border"
                              }`}
                            >
                              {isChecked && <Check size={11} />}
                            </div>
                            <span className="text-xs leading-relaxed">{req}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {result.requirements.should_have.length > 0 && (
                    <div>
                      <span className="text-xs font-semibold text-text-primary block mb-2">
                        Bonus / Competitive Differentiators:
                      </span>
                      <ul className="space-y-1 text-xs text-text-muted list-disc list-inside">
                        {result.requirements.should_have.map((sh, idx) => (
                          <li key={idx}>{sh}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </Expander>

              {/* Constraints & Platform Restrictions */}
              <Expander title="Constraints & Platform Boundaries" badge={`${result.constraints.length} items`}>
                <div className="space-y-1.5 pt-2 text-xs text-text-muted">
                  {result.constraints.map((c, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-accent-coral font-bold">•</span>
                      <span>{c}</span>
                    </div>
                  ))}
                </div>
              </Expander>

              {/* Hidden Evaluation Criteria */}
              <Expander title="Hidden Evaluation Traps (What Judges Test)" badge="Jury secrets">
                <div className="space-y-2 pt-2 text-xs text-text-muted">
                  {result.hidden_criteria.map((h, i) => (
                    <div key={i} className="p-3 rounded-xl bg-fill/50 border border-border/50 text-text-primary flex items-start gap-2">
                      <span className="text-accent-amber font-bold">›</span>
                      <span>{h}</span>
                    </div>
                  ))}
                </div>
              </Expander>

              {/* 5 Clarifying Questions */}
              <Expander title="5 Sharp Clarifying Questions" badge="5 questions">
                <div className="space-y-3 pt-2">
                  {result.clarifying_questions.map((cq, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl bg-surface border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div>
                        <div className="text-xs font-semibold text-text-primary">
                          {i + 1}. {cq.question}
                        </div>
                        <div className="text-[11px] text-text-muted">
                          Intent: {cq.intent}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setShowQa(true);
                          handleAskQuestion(cq.question);
                        }}
                        className="text-xs font-medium text-accent-amber hover:underline shrink-0 text-left"
                      >
                        Ask Oracle →
                      </button>
                    </div>
                  ))}
                </div>
              </Expander>
            </div>

            {/* Interactive Q&A Chat Panel */}
            {showQa && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-3xl bg-surface border border-accent-amber/30 p-6 shadow-card space-y-4"
              >
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <MessageCircle size={15} className="text-accent-amber" />
                    <h3 className="text-sm font-semibold text-text-primary">
                      Problem Statement Oracle Q&amp;A
                    </h3>
                  </div>
                  <span className="text-[11px] text-text-muted">
                    Sentence-level keyword retrieval
                  </span>
                </div>

                {/* Messages history */}
                <div className="space-y-3 max-h-72 overflow-y-auto">
                  {qaHistory.length === 0 ? (
                    <div className="text-xs text-text-muted text-center py-4">
                      Ask any question about the problem statement boundaries, schemas, or requirements.
                    </div>
                  ) : (
                    qaHistory.map((item, idx) => (
                      <div key={idx} className="space-y-1.5 text-xs">
                        <div className="font-semibold text-text-primary flex items-center gap-1.5">
                          <span className="text-accent-amber">Q:</span>
                          <span>{item.question}</span>
                        </div>
                        <div
                          className={`p-3 rounded-xl border leading-relaxed ${
                            item.is_covered
                              ? "bg-fill border-border/70 text-text-primary"
                              : "bg-accent-amber/5 border-accent-amber/20 text-text-muted"
                          }`}
                        >
                          <p>{item.answer}</p>
                          {item.cited_phrases.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-border/40 font-mono text-[11px] text-text-muted">
                              Cited: &ldquo;{item.cited_phrases[0]}&rdquo;
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Question Input */}
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="text"
                    value={questionInput}
                    onChange={(e) => setQuestionInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAskQuestion()}
                    placeholder="Ask about constraints, prize criteria, or offline support..."
                    className="flex-1 px-4 py-2.5 rounded-xl bg-fill text-xs text-text-primary placeholder:text-text-tertiary border border-border focus:outline-none focus:border-accent-amber"
                  />
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleAskQuestion()}
                    disabled={asking || !questionInput.trim()}
                    className="h-9 px-4 rounded-xl bg-accent-amber text-black font-semibold text-xs disabled:opacity-50 flex items-center gap-1 focus-visible:outline-none"
                  >
                    <span>{asking ? "Checking..." : "Ask"}</span>
                    <Send size={12} />
                  </motion.button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <XPToast xp={toastXp} onDone={() => setToastXp(null)} />
    </div>
  );
}
