"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Gavel,
  Shield,
  Briefcase,
  Cpu,
  Send,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Award,
  CheckCircle2,
  Loader2,
  FileText,
  MessageSquare,
  AlertCircle,
  type LucideIcon,
} from "lucide-react";
import {
  api,
  Submission,
  JudgePersonaType,
  JudgeDialogueTurn,
  SimulatorSessionStartResponse,
  SimulatorRespondResponse,
} from "@/lib/api";
import { useGsapEntrance } from "@/lib/animations";
import { sounds } from "@/lib/sounds";
import { XPToast } from "@/components/common/XPToast";

const PERSONAS: {
  key: JudgePersonaType;
  name: string;
  title: string;
  icon: LucideIcon;
  color: string;
  bgLight: string;
  borderLight: string;
  description: string;
  focus: string;
}[] = [
  {
    key: "architect",
    name: "Dr. Aris",
    title: "Principal Systems Architect & AWS AI Lead",
    icon: Cpu,
    color: "text-accent-blue",
    bgLight: "bg-accent-blue/10",
    borderLight: "border-accent-blue/30",
    description: "Probes distributed concurrency, cloud failure recovery, latency bottlenecks, and AWS architecture rigor.",
    focus: "Cloud Architecture, Concurrency & Failure Boundaries",
  },
  {
    key: "investor",
    name: "Sarah K.",
    title: "Venture Partner & Product Strategist",
    icon: Briefcase,
    color: "text-accent-violet",
    bgLight: "bg-accent-violet/10",
    borderLight: "border-accent-violet/30",
    description: "Probes market defensibility, unit economics, customer acquisition velocity, and competitive moats.",
    focus: "Business Viability, Moats & Market Timing",
  },
  {
    key: "domain_expert",
    name: "Marcus T.",
    title: "Security & Domain Integrity Specialist",
    icon: Shield,
    color: "text-accent-coral",
    bgLight: "bg-accent-coral/10",
    borderLight: "border-accent-coral/30",
    description: "Probes data compliance, privacy leakage, operational edge cases, and adversarial threat vectors.",
    focus: "Security Posture, Compliance & Threat Modeling",
  },
];

export default function JudgeSimulatorPage() {
  const containerRef = useGsapEntrance({ stagger: 0.08 });
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSubId, setSelectedSubId] = useState<string>("");
  const [title, setTitle] = useState("HackPilot Mission Control");
  const [abstract, setAbstract] = useState(
    "A two-sided hackathon co-pilot built with FastAPI and Next.js that turns hackathon friction into a game, with real-time pitch refinement and automated organizer intelligence."
  );
  const [problemStatement, setProblemStatement] = useState(
    "Hackathon teams struggle with pitch readiness and organizer panels experience judging fatigue."
  );

  const [selectedPersona, setSelectedPersona] = useState<JudgePersonaType>("architect");
  const [session, setSession] = useState<SimulatorSessionStartResponse | null>(null);
  const [history, setHistory] = useState<JudgeDialogueTurn[]>([]);
  const [currentDefense, setCurrentDefense] = useState("");
  const [lastResponse, setLastResponse] = useState<SimulatorRespondResponse | null>(null);

  const [startingSession, setStartingSession] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [toastXp, setToastXp] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.getSubmissions()
      .then((subs) => {
        setSubmissions(subs);
        if (subs.length > 0) {
          setSelectedSubId(subs[0].id);
          setTitle(subs[0].title);
          if (subs[0].abstract) setAbstract(subs[0].abstract);
          if (subs[0].problem_statement) setProblemStatement(subs[0].problem_statement);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, session, evaluating]);

  const handleSelectSubmission = (subId: string) => {
    setSelectedSubId(subId);
    const found = submissions.find((s) => s.id === subId);
    if (found) {
      setTitle(found.title);
      if (found.abstract) setAbstract(found.abstract);
      if (found.problem_statement) setProblemStatement(found.problem_statement);
    }
  };

  const handleStartTrial = async () => {
    setStartingSession(true);
    setErrorMessage(null);
    setHistory([]);
    setLastResponse(null);
    setCurrentDefense("");

    try {
      sounds.playClick();
      const res = await api.startJudgeSession({
        submission_id: selectedSubId || undefined,
        title,
        abstract,
        problem_statement: problemStatement,
        persona: selectedPersona,
      });

      setSession(res);
      setHistory([
        {
          turn_index: 1,
          speaker: "judge",
          content: res.opening_question,
        },
      ]);
      sounds.playSuccess();
    } catch (err: unknown) {
      console.error(err);
      setErrorMessage(err instanceof Error ? err.message : "Failed to start judge session.");
    } finally {
      setStartingSession(false);
    }
  };

  const handleSubmitDefense = async () => {
    if (!session || !currentDefense.trim() || evaluating) return;

    const answerText = currentDefense.trim();
    setCurrentDefense("");
    setEvaluating(true);

    const updatedHistory: JudgeDialogueTurn[] = [
      ...history,
      {
        turn_index: history.length + 1,
        speaker: "participant",
        content: answerText,
      },
    ];
    setHistory(updatedHistory);

    try {
      sounds.playClick();
      const res = await api.respondJudgeSession({
        session_id: session.session_id,
        persona: selectedPersona,
        answer: answerText,
        history: updatedHistory,
        abstract_context: `Title: ${title}\nAbstract: ${abstract}`,
      });

      setLastResponse(res);
      if (res.xp_awarded) {
        sounds.playXP();
        setToastXp(res.xp_awarded);
      }

      // Add feedback and next question (if not concluded)
      const nextTurns: JudgeDialogueTurn[] = [
        ...updatedHistory,
      ];

      // Attach feedback to last participant turn
      const lastPartTurn = nextTurns[nextTurns.length - 1];
      if (lastPartTurn) {
        lastPartTurn.score = res.score;
        lastPartTurn.feedback = res.feedback;
      }

      if (!res.is_concluded && res.followup_question) {
        nextTurns.push({
          turn_index: nextTurns.length + 1,
          speaker: "judge",
          content: res.followup_question,
        });
      }

      setHistory(nextTurns);
    } catch (err) {
      console.error(err);
    } finally {
      setEvaluating(false);
    }
  };

  const handleReset = () => {
    setSession(null);
    setHistory([]);
    setLastResponse(null);
    setCurrentDefense("");
  };

  const currentPersonaObj = PERSONAS.find((p) => p.key === selectedPersona) || PERSONAS[0];
  const participantTurns = history.filter((t) => t.speaker === "participant").length;
  const currentRound = Math.min(3, participantTurns + 1);

  return (
    <div ref={containerRef} className="space-y-10 pb-16 max-w-5xl mx-auto px-4 sm:px-8 py-8">
      {/* Header Banner */}
      <div className="gsap-fade-in text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 text-xs font-mono font-bold text-cyber-yellow uppercase tracking-widest">
          <Gavel size={14} />
          <span>AI Judge Simulator · Demo Day Rehearsal Arena</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white leading-tight">
          Practice against a real hackathon judge.
        </h1>
        <p className="text-sm sm:text-base text-zinc-400 max-w-xl mx-auto leading-relaxed">
          Rehearse live Q&amp;A under pressure. Select a judge archetype, defend your technical decisions, and earn XP with real-time feedback.
        </p>
      </div>

      {!session ? (
        /* Configuration Screen */
        <div className="space-y-8 gsap-fade-in">
          {/* Step 1: Select or customize project */}
          <div className="rounded-[32px] bg-void-charcoal/80 border border-white/10 p-7 sm:p-8 shadow-2xl backdrop-blur-xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-black text-white text-sm">
                <FileText size={17} className="text-cyber-yellow" />
                <span>Step 1: Choose Your Project Pitch</span>
              </div>
              {submissions.length > 0 && (
                <span className="text-xs text-zinc-400 font-mono">
                  {submissions.length} submitted projects available
                </span>
              )}
            </div>

            {submissions.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Load from Submissions</label>
                <select
                  value={selectedSubId}
                  onChange={(e) => handleSelectSubmission(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-cyber-yellow"
                >
                  {submissions.map((s) => (
                    <option key={s.id} value={s.id} className="bg-void-charcoal text-white">
                      {s.title} ({s.team_name || "Team HackPilot"})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-4 pt-1">
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">Project Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-cyber-yellow"
                  placeholder="e.g. HackPilot Mission Control"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">Project Abstract</label>
                <textarea
                  rows={3}
                  value={abstract}
                  onChange={(e) => setAbstract(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-cyber-yellow resize-none"
                  placeholder="Paste your hackathon abstract..."
                />
              </div>
            </div>
          </div>

          {/* Step 2: Choose Judge Persona */}
          <div className="rounded-[32px] bg-void-charcoal/80 border border-white/10 p-7 sm:p-8 shadow-2xl backdrop-blur-xl space-y-5">
            <div className="flex items-center gap-2 font-black text-white text-sm">
              <Gavel size={17} className="text-cyber-yellow" />
              <span>Step 2: Choose Your AI Judge Archetype</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {PERSONAS.map((p) => {
                const Icon = p.icon;
                const isSelected = selectedPersona === p.key;
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => {
                      setSelectedPersona(p.key);
                      sounds.playClick();
                    }}
                    className={`text-left p-6 rounded-[32px] border transition-all flex flex-col justify-between gap-4 ${
                      isSelected
                        ? "bg-cyber-yellow/10 border-cyber-yellow shadow-yellow-glow ring-2 ring-cyber-yellow/40"
                        : "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10"
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className={`p-3 rounded-2xl ${isSelected ? "bg-cyber-yellow text-black" : "bg-white/10 text-cyber-yellow"}`}>
                          <Icon size={20} />
                        </div>
                        {isSelected && (
                          <CheckCircle2 size={18} className="text-cyber-yellow" />
                        )}
                      </div>
                      <div>
                        <div className="font-extrabold text-base text-white">{p.name}</div>
                        <div className="text-[11px] text-zinc-400 font-mono mt-0.5">{p.title}</div>
                      </div>
                      <p className="text-xs text-zinc-300 leading-relaxed">
                        {p.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-white/10 text-[11px] font-mono text-zinc-400">
                      Focus: {p.focus}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Start CTA */}
          <div className="text-center pt-2 space-y-3">
            {errorMessage && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-xs max-w-md mx-auto flex items-center justify-center gap-2">
                <AlertCircle size={14} />
                <span>{errorMessage}</span>
              </div>
            )}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleStartTrial}
              disabled={startingSession || !title.trim() || !abstract.trim()}
              className="px-9 py-4 rounded-full bg-cyber-yellow text-black font-extrabold text-sm flex items-center justify-center gap-2.5 mx-auto hover:bg-cyber-yellow-hover transition-all shadow-yellow-glow disabled:opacity-50"
            >
              {startingSession ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Summoning {currentPersonaObj.name}...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Start 3-Round Cross-Examination with {currentPersonaObj.name}</span>
                  <ArrowRight size={15} />
                </>
              )}
            </motion.button>
          </div>
        </div>
      ) : (
        /* Active Cross-Examination Arena */
        <div className="space-y-6 gsap-fade-in">
          {/* Trial HUD Header */}
          <div className="rounded-[32px] bg-[#171717]/80 backdrop-blur-xl border border-white/10 p-6 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`p-3.5 rounded-2xl ${currentPersonaObj.bgLight} ${currentPersonaObj.color}`}>
                <currentPersonaObj.icon size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base text-white">{currentPersonaObj.name}</span>
                  <span className="text-xs font-mono px-3 py-1 rounded-full border border-white/10 bg-[#0A0A0A] text-white/60">
                    {currentPersonaObj.title.split("&")[0]}
                  </span>
                </div>
                <p className="text-xs text-white/50 truncate max-w-md mt-0.5">
                  Project: <span className="font-semibold text-white">{title}</span>
                </p>
              </div>
            </div>

            {/* Round Tracker */}
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-xs font-mono text-cyber-yellow font-bold uppercase tracking-wider">
                  {lastResponse?.is_concluded ? "Trial Concluded" : `Round ${currentRound} of 3`}
                </div>
                <div className="text-[11px] text-white/50 font-mono">
                  {3 - participantTurns > 0 ? `${3 - participantTurns} questions remaining` : "Debrief ready"}
                </div>
              </div>

              <button
                onClick={handleReset}
                className="p-2.5 rounded-full border border-white/10 hover:bg-white/10 text-white/60 hover:text-white transition-all text-xs flex items-center gap-1 active:scale-95"
                title="Restart simulation"
              >
                <RotateCcw size={14} />
              </button>
            </div>
          </div>

          {/* Dialogue Transcript */}
          <div className="rounded-[32px] bg-[#171717]/60 backdrop-blur-xl border border-white/10 p-6 shadow-2xl space-y-6 max-h-[600px] overflow-y-auto">
            {history.map((turn, idx) => {
              const isJudge = turn.speaker === "judge";
              return (
                <div
                  key={idx}
                  className={`flex flex-col gap-2 ${
                    isJudge ? "items-start" : "items-end"
                  }`}
                >
                  {/* Speaker Label */}
                  <div className="flex items-center gap-1.5 text-xs font-mono text-white/50">
                    {isJudge ? (
                      <>
                        <currentPersonaObj.icon size={13} className={currentPersonaObj.color} />
                        <span className="font-semibold text-white">{currentPersonaObj.name}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-cyber-yellow font-semibold">Your Defense</span>
                      </>
                    )}
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`p-4 rounded-2xl max-w-xl text-sm leading-relaxed ${
                      isJudge
                        ? "bg-[#262626]/80 border border-white/10 text-white"
                        : "bg-cyber-yellow/10 border border-cyber-yellow/30 text-white"
                    }`}
                  >
                    {turn.content}
                  </div>

                  {/* Rating & Feedback (if attached to participant turn) */}
                  {!isJudge && typeof turn.score === "number" && (
                    <div className="max-w-xl w-full p-4 rounded-2xl bg-[#0A0A0A] border border-cyber-yellow/30 shadow-lg space-y-2 mt-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-cyber-yellow uppercase tracking-wider">
                          <Award size={13} />
                          <span>Judge Feedback</span>
                        </div>
                        <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                          turn.score >= 8
                            ? "bg-cyber-yellow/20 text-cyber-yellow border-cyber-yellow/40"
                            : turn.score >= 6
                            ? "bg-amber-400/20 text-amber-400 border-amber-400/40"
                            : "bg-red-500/20 text-red-400 border-red-500/40"
                        }`}>
                          Rating: {turn.score} / 10
                        </span>
                      </div>
                      <p className="text-xs text-white/70 leading-relaxed">
                        {turn.feedback}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}

            {evaluating && (
              <div className="flex items-center gap-2 text-xs text-white/70 p-3 bg-white/5 border border-white/10 rounded-full w-fit">
                <Loader2 size={14} className="animate-spin text-cyber-yellow" />
                <span>{currentPersonaObj.name} is evaluating your defense...</span>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Final Verdict Card (if trial concluded) */}
          {lastResponse?.is_concluded && (
            <div className="rounded-[32px] bg-cyber-yellow/10 border border-cyber-yellow/30 p-6 shadow-2xl space-y-4 gsap-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award size={20} className="text-cyber-yellow" />
                  <h3 className="text-base font-bold text-white">
                    Cross-Examination Trial Concluded
                  </h3>
                </div>
                {typeof lastResponse.composite_score === "number" && (
                  <div className="text-right">
                    <span className="text-3xl font-mono font-black text-cyber-yellow">
                      {lastResponse.composite_score} / 100
                    </span>
                    <div className="text-[10px] font-mono text-white/50">Composite Grade</div>
                  </div>
                )}
              </div>

              {lastResponse.final_verdict && (
                <p className="text-sm text-white/90 leading-relaxed italic bg-[#0A0A0A]/60 p-4 rounded-2xl border border-white/10">
                  &ldquo;{lastResponse.final_verdict}&rdquo;
                </p>
              )}

              {lastResponse.mitigation_points && lastResponse.mitigation_points.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-xs font-mono font-bold text-cyber-yellow uppercase tracking-wider">
                    Key Demo Day Recommendations
                  </div>
                  <ul className="space-y-1 text-xs text-white/70">
                    {lastResponse.mitigation_points.map((pt, pIdx) => (
                      <li key={pIdx} className="flex items-start gap-1.5">
                        <span className="text-cyber-yellow font-bold">✓</span>
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  onClick={handleReset}
                  className="px-6 py-2.5 rounded-full bg-cyber-yellow text-black text-xs font-black hover:bg-cyber-yellow/90 active:scale-95 transition-all flex items-center gap-2 w-full sm:w-auto justify-center shadow-lg shadow-cyber-yellow/20"
                >
                  <RotateCcw size={13} />
                  <span>Challenge Another Judge Persona</span>
                </button>
                <Link
                  href="/organizer"
                  className="text-xs font-semibold text-cyber-yellow hover:underline flex items-center gap-1"
                >
                  <span>View Organizer Intelligence</span>
                  <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          )}

          {/* Defense Input Area (if not concluded) */}
          {!lastResponse?.is_concluded && (
            <div className="rounded-[32px] bg-[#171717]/80 backdrop-blur-xl border border-white/10 p-5 shadow-2xl space-y-3">
              <div className="flex items-center justify-between text-xs text-white/60">
                <span className="font-semibold text-white flex items-center gap-1.5">
                  <MessageSquare size={13} className="text-cyber-yellow" />
                  <span>Your Live Rebuttal / Defense</span>
                </span>
                <span className="font-mono text-[11px] text-white/40">
                  {currentDefense.length} characters
                </span>
              </div>

              <textarea
                rows={3}
                value={currentDefense}
                onChange={(e) => setCurrentDefense(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmitDefense();
                  }
                }}
                disabled={evaluating}
                className="w-full p-4 rounded-2xl bg-[#0A0A0A] border border-white/10 text-sm text-white focus:outline-none focus:border-cyber-yellow/50 resize-none transition-colors"
                placeholder="Explain your technical choice, architectural boundary, or trade-off to the judge..."
              />

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-white/40 hidden sm:inline">
                  Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/10 text-[10px] text-white/70">Enter</kbd> to submit
                </span>

                <button
                  onClick={handleSubmitDefense}
                  disabled={evaluating || !currentDefense.trim()}
                  className="px-6 py-2.5 rounded-full bg-cyber-yellow text-black text-xs font-black flex items-center gap-2 hover:bg-cyber-yellow/90 active:scale-95 transition-all shadow-lg shadow-cyber-yellow/20 disabled:opacity-40 disabled:cursor-not-allowed ml-auto"
                >
                  {evaluating ? (
                    <>
                      <Loader2 size={13} className="animate-spin text-black" />
                      <span>Evaluating...</span>
                    </>
                  ) : (
                    <>
                      <Send size={13} />
                      <span>Submit Defense to Judge</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Gamification XP Toast */}
      {toastXp !== null && (
        <XPToast
          xp={toastXp}
          onDone={() => setToastXp(null)}
        />
      )}
    </div>
  );
}
