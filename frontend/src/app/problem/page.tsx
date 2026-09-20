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
    <div ref={containerRef} className="max-w-[1200px] w-full mx-auto px-4 sm:px-8 py-8 space-y-10">
      {/* Top Banner / Theme Header */}
      <div className="gsap-fade-in space-y-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-mono font-bold text-cyber-yellow uppercase tracking-widest">
          <HelpCircle size={14} />
          <span>Challenge Decoder Oracle</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white leading-tight">
          Decode what hackathon judges actually want.
        </h1>
        <p className="text-sm sm:text-base text-zinc-400 max-w-2xl leading-relaxed">
          Translate vague, jargon-heavy challenge statements into plain English, mandatory checklists, hidden evaluation traps, and an interactive Q&amp;A oracle.
        </p>
      </div>

      {/* Input Box */}
      <div className="gsap-fade-in rounded-[32px] bg-void-charcoal/80 border border-white/10 p-7 sm:p-8 shadow-2xl backdrop-blur-xl space-y-5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">
            Challenge / Problem Statement
          </label>
          <button
            type="button"
            onClick={() => {
              setProblemText(DEMO_PROBLEM_STATEMENT);
              setErrorMessage(null);
            }}
            className="text-xs font-bold text-cyber-yellow hover:underline focus-visible:outline-none"
          >
            Load Sample Challenge
          </button>
        </div>

        <textarea
          rows={5}
          value={problemText}
          onChange={(e) => setProblemText(e.target.value)}
          placeholder="Paste hackathon challenge statement or prompt here..."
          className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-zinc-500 text-sm leading-relaxed focus:bg-white/10 focus:outline-none focus:border-cyber-yellow transition-all resize-y"
        />

        {errorMessage && (
          <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-500/10 p-3 rounded-2xl border border-rose-500/20">
            <AlertTriangle size={14} />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleExplain}
            disabled={loading}
            className="h-12 px-8 rounded-full bg-cyber-yellow text-black font-extrabold text-sm shadow-yellow-glow hover:bg-cyber-yellow-hover disabled:opacity-50 transition-all flex items-center gap-2 focus-visible:outline-none"
          >
            <span>{loading ? "Decoding Challenge..." : "Explain Problem"}</span>
            <ArrowRight size={16} />
          </motion.button>

          {result && (
            <button
              type="button"
              onClick={() => setShowQa(!showQa)}
              className="h-12 px-6 rounded-full bg-white/5 hover:bg-white/10 text-white text-xs font-bold transition-all border border-white/15 flex items-center gap-2 focus-visible:outline-none active:scale-95"
            >
              <MessageCircle size={15} className="text-cyber-yellow" />
              <span>{showQa ? "Hide Q&A Oracle" : "Open Q&A Oracle"}</span>
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
            <div className="rounded-[32px] bg-void-charcoal/85 border border-white/10 p-7 sm:p-8 shadow-2xl backdrop-blur-xl space-y-3">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyber-yellow uppercase tracking-widest">
                <Lightbulb size={14} />
                <span>Plain English Translation</span>
              </div>
              <p className="text-lg sm:text-xl font-bold text-white leading-relaxed">
                {result.plain_english_summary}
              </p>
            </div>

            {/* Collapsible Sections (Requirements, Constraints, Hidden Criteria, Clarifying Qs) */}
            <div className="space-y-4">
              {/* Mandatory Checklist */}
              <Expander
                title="Requirements Checklist (Must-Have vs Should-Have)"
                badge={`${result.requirements.must_have.length} mandatory`}
                defaultOpen={true}
              >
                <div className="space-y-4 pt-2">
                  <div>
                    <span className="text-xs font-bold text-white uppercase tracking-wider block mb-3">
                      Mandatory Deliverables:
                    </span>
                    <div className="space-y-2.5">
                      {result.requirements.must_have.map((req, idx) => {
                        const isChecked = checkedRequirements.has(idx);
                        return (
                          <div
                            key={idx}
                            onClick={() => toggleReq(idx)}
                            className={`p-4 rounded-2xl border flex items-start gap-3.5 cursor-pointer transition-all ${
                              isChecked
                                ? "bg-cyber-yellow/5 border-cyber-yellow/30 text-zinc-500 line-through"
                                : "bg-white/5 border-white/10 hover:border-cyber-yellow/40 text-white"
                            }`}
                          >
                            <div
                              className={`w-5 h-5 rounded-full border mt-0.5 flex items-center justify-center transition-colors shrink-0 ${
                                isChecked
                                  ? "bg-cyber-yellow border-cyber-yellow text-black font-bold"
                                  : "border-white/20"
                              }`}
                            >
                              {isChecked && <Check size={12} />}
                            </div>
                            <span className="text-xs leading-relaxed font-medium">{req}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {result.requirements.should_have.length > 0 && (
                    <div className="pt-2">
                      <span className="text-xs font-bold text-cyber-yellow uppercase tracking-wider block mb-2">
                        Bonus / Competitive Differentiators:
                      </span>
                      <ul className="space-y-1.5 text-xs text-zinc-400 list-disc list-inside font-mono">
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
                <div className="space-y-2 pt-2 text-xs text-zinc-400 font-mono">
                  {result.constraints.map((c, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <span className="text-rose-400 font-bold">•</span>
                      <span>{c}</span>
                    </div>
                  ))}
                </div>
              </Expander>

              {/* Hidden Evaluation Criteria */}
              <Expander title="Hidden Evaluation Traps (What Judges Test)" badge="Jury secrets">
                <div className="space-y-2.5 pt-2 text-xs text-zinc-300">
                  {result.hidden_criteria.map((h, i) => (
                    <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/10 text-white flex items-start gap-3">
                      <span className="text-cyber-yellow font-black">›</span>
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
                      className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="text-xs font-bold text-white">
                          {i + 1}. {cq.question}
                        </div>
                        <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                          Intent: {cq.intent}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setShowQa(true);
                          handleAskQuestion(cq.question);
                        }}
                        className="text-xs font-bold text-cyber-yellow hover:underline shrink-0 text-left"
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
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-[32px] bg-void-charcoal/90 border border-white/15 p-7 shadow-2xl backdrop-blur-2xl space-y-5"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-2.5">
                    <MessageCircle size={17} className="text-cyber-yellow" />
                    <h3 className="text-base font-black text-white">
                      Problem Statement Oracle Q&amp;A
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-zinc-400">
                    Sentence-level keyword retrieval
                  </span>
                </div>

                {/* Messages history */}
                <div className="space-y-3.5 max-h-72 overflow-y-auto">
                  {qaHistory.length === 0 ? (
                    <div className="text-xs text-zinc-400 text-center py-6">
                      Ask any question about challenge boundaries, platform rules, or rubric criteria.
                    </div>
                  ) : (
                    qaHistory.map((item, idx) => (
                      <div key={idx} className="space-y-2 text-xs">
                        <div className="font-bold text-white flex items-center gap-2">
                          <span className="text-cyber-yellow">Q:</span>
                          <span>{item.question}</span>
                        </div>
                        <div
                          className={`p-4 rounded-2xl border leading-relaxed ${
                            item.is_covered
                              ? "bg-white/5 border-white/10 text-zinc-300"
                              : "bg-cyber-yellow/5 border-cyber-yellow/20 text-zinc-300"
                          }`}
                        >
                          <p>{item.answer}</p>
                          {item.cited_phrases.length > 0 && (
                            <div className="mt-2.5 pt-2.5 border-t border-white/10 font-mono text-[11px] text-cyber-yellow">
                              Cited: &ldquo;{item.cited_phrases[0]}&rdquo;
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Question Input */}
                <div className="flex items-center gap-3 pt-2">
                  <input
                    type="text"
                    value={questionInput}
                    onChange={(e) => setQuestionInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAskQuestion()}
                    placeholder="Ask about constraints, prize criteria, or offline support..."
                    className="flex-1 px-5 py-3 rounded-full bg-white/5 text-xs text-white placeholder:text-zinc-500 border border-white/10 focus:outline-none focus:border-cyber-yellow font-medium"
                  />
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleAskQuestion()}
                    disabled={asking || !questionInput.trim()}
                    className="h-11 px-6 rounded-full bg-cyber-yellow text-black font-extrabold text-xs disabled:opacity-50 flex items-center gap-1.5 focus-visible:outline-none shadow-md"
                  >
                    <span>{asking ? "Checking..." : "Ask"}</span>
                    <Send size={13} />
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
