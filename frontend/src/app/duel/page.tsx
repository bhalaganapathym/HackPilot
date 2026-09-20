"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Swords,
  Layers,
  ShieldAlert,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  Sparkles,
  HelpCircle,
  TrendingUp,
  RotateCcw,
  Info
} from "lucide-react";
import { api, DuelResponse, DuelRequest } from "@/lib/api";
import { XPToast } from "@/components/common/XPToast";
import { AIThinkingPanel } from "@/components/common/AIThinkingPanel";
import { sounds } from "@/lib/sounds";

const SAMPLE_IDEA_A = {
  title: "EcoCampus Smart Bins",
  description: "IoT-connected campus waste receptacles with optical sorting sensors to classify recyclable materials at point-of-deposit, notifying facility managers when bins reach 80% capacity.",
  tech_stack: "Raspberry Pi, AWS IoT Core, FastAPI, React",
  target_users: "University facility directors and environmentally conscious students"
};

const SAMPLE_IDEA_B = {
  title: "Campus PowerGrid Optimizer",
  description: "Predictive energy load balancing software using building occupancy sensors and weather forecast telemetry to automatically curtail HVAC and lighting during peak utility tariff hours.",
  tech_stack: "FastAPI, Amazon Bedrock, DynamoDB, Next.js",
  target_users: "Campus sustainability coordinators and municipal energy managers"
};

export default function IdeaDuelPage() {
  const [ideaA, setIdeaA] = useState({ title: "", description: "", tech_stack: "", target_users: "" });
  const [ideaB, setIdeaB] = useState({ title: "", description: "", tech_stack: "", target_users: "" });
  const [problemStatement, setProblemStatement] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [duelResult, setDuelResult] = useState<DuelResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastXp, setToastXp] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"rounds" | "shared" | "questions">("rounds");
  const [activeRound, setActiveRound] = useState<"problem" | "differentiation" | "tech" | "impact">("problem");

  const handleLoadSample = () => {
    setIdeaA(SAMPLE_IDEA_A);
    setIdeaB(SAMPLE_IDEA_B);
    setProblemStatement("Campuses generate excessive utility waste and landfill footprint due to lack of automated monitoring and telemetry.");
    setErrorMessage(null);
    sounds.playClick();
  };

  const handleStartDuel = async () => {
    if (!ideaA.title.trim() || ideaA.description.trim().length < 10) {
      setErrorMessage("Please enter a valid title and description (at least 10 chars) for Idea A.");
      return;
    }
    if (!ideaB.title.trim() || ideaB.description.trim().length < 10) {
      setErrorMessage("Please enter a valid title and description (at least 10 chars) for Idea B.");
      return;
    }

    setErrorMessage(null);
    setLoading(true);
    sounds.playLevelUp();

    try {
      const payload: DuelRequest = {
        idea_a: {
          title: ideaA.title.trim(),
          description: ideaA.description.trim(),
          tech_stack: ideaA.tech_stack.trim() || undefined,
          target_users: ideaA.target_users.trim() || undefined,
        },
        idea_b: {
          title: ideaB.title.trim(),
          description: ideaB.description.trim(),
          tech_stack: ideaB.tech_stack.trim() || undefined,
          target_users: ideaB.target_users.trim() || undefined,
        },
        problem_statement: problemStatement.trim() || undefined,
      };

      const resp = await api.analyzeDuel(payload);
      setDuelResult(resp);
      sounds.playSuccess();

      if (resp.gamification?.xp_gained) {
        setToastXp(resp.gamification.xp_gained);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to analyze idea duel. Please try again.";
      setErrorMessage(msg);
      sounds.playHit();
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setDuelResult(null);
    setErrorMessage(null);
    sounds.playClick();
  };

  return (
    <div className="space-y-8 pb-16 max-w-[1200px] mx-auto px-4 sm:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyber-yellow/10 border border-cyber-yellow/30 text-cyber-yellow text-xs font-mono font-bold tracking-wide">
            <Swords size={13} />
            <span>5-Round Concept Arena</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white">
            Idea Duel
          </h1>
          <p className="text-sm text-white/60 max-w-2xl leading-relaxed">
            Pit two project concepts head-to-head in structured AI sparring rounds. Expose architectural trade-offs, technical risks, and judge hurdles — strictly with no winner declared.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!duelResult && (
            <button
              type="button"
              onClick={handleLoadSample}
              className="px-4 py-2 rounded-full border border-white/15 text-xs font-semibold text-white/80 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2 active:scale-95"
            >
              <Sparkles size={13} className="text-cyber-yellow" />
              <span>Load Sample Duel</span>
            </button>
          )}
          {duelResult && (
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 rounded-full border border-white/15 text-xs font-semibold text-white/80 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2 active:scale-95"
            >
              <RotateCcw size={13} />
              <span>New Duel</span>
            </button>
          )}
        </div>
      </div>

      {/* Input Arena (Split Columns) */}
      {!duelResult && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Idea A Card */}
            <div className="p-6 rounded-[32px] bg-[#171717]/80 backdrop-blur-xl border border-white/10 space-y-5 shadow-2xl">
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <div className="w-8 h-8 rounded-full bg-cyber-yellow text-black font-black text-xs flex items-center justify-center font-mono shadow-md shadow-cyber-yellow/20">
                  A
                </div>
                <h3 className="text-base font-bold text-white">Idea A</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-white/50 block mb-1.5 font-bold">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={ideaA.title}
                    onChange={(e) => setIdeaA({ ...ideaA, title: e.target.value })}
                    placeholder="e.g. EcoCampus Smart Bins"
                    className="w-full px-4 py-2.5 rounded-2xl bg-[#0A0A0A] border border-white/10 text-sm text-white focus:outline-none focus:border-cyber-yellow/50 transition-colors"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-white/50 block mb-1.5 font-bold">
                    Description *
                  </label>
                  <textarea
                    rows={4}
                    value={ideaA.description}
                    onChange={(e) => setIdeaA({ ...ideaA, description: e.target.value })}
                    placeholder="How does Idea A work? What core problem does it solve?"
                    className="w-full px-4 py-2.5 rounded-2xl bg-[#0A0A0A] border border-white/10 text-xs text-white focus:outline-none focus:border-cyber-yellow/50 resize-none transition-colors"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-white/50 block mb-1.5 font-bold">
                    Tech Stack (Optional)
                  </label>
                  <input
                    type="text"
                    value={ideaA.tech_stack}
                    onChange={(e) => setIdeaA({ ...ideaA, tech_stack: e.target.value })}
                    placeholder="e.g. Raspberry Pi, AWS IoT Core, FastAPI"
                    className="w-full px-4 py-2.5 rounded-2xl bg-[#0A0A0A] border border-white/10 text-xs text-white focus:outline-none focus:border-cyber-yellow/50 transition-colors"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-white/50 block mb-1.5 font-bold">
                    Target Audience (Optional)
                  </label>
                  <input
                    type="text"
                    value={ideaA.target_users}
                    onChange={(e) => setIdeaA({ ...ideaA, target_users: e.target.value })}
                    placeholder="e.g. Campus facility directors"
                    className="w-full px-4 py-2.5 rounded-2xl bg-[#0A0A0A] border border-white/10 text-xs text-white focus:outline-none focus:border-cyber-yellow/50 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Idea B Card */}
            <div className="p-6 rounded-[32px] bg-[#171717]/80 backdrop-blur-xl border border-white/10 space-y-5 shadow-2xl">
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <div className="w-8 h-8 rounded-full bg-white/10 text-white font-black text-xs flex items-center justify-center font-mono border border-white/20">
                  B
                </div>
                <h3 className="text-base font-bold text-white">Idea B</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-white/50 block mb-1.5 font-bold">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={ideaB.title}
                    onChange={(e) => setIdeaB({ ...ideaB, title: e.target.value })}
                    placeholder="e.g. Campus PowerGrid Optimizer"
                    className="w-full px-4 py-2.5 rounded-2xl bg-[#0A0A0A] border border-white/10 text-sm text-white focus:outline-none focus:border-cyber-yellow/50 transition-colors"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-white/50 block mb-1.5 font-bold">
                    Description *
                  </label>
                  <textarea
                    rows={4}
                    value={ideaB.description}
                    onChange={(e) => setIdeaB({ ...ideaB, description: e.target.value })}
                    placeholder="How does Idea B solve the problem differently?"
                    className="w-full px-4 py-2.5 rounded-2xl bg-[#0A0A0A] border border-white/10 text-xs text-white focus:outline-none focus:border-cyber-yellow/50 resize-none transition-colors"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-white/50 block mb-1.5 font-bold">
                    Tech Stack (Optional)
                  </label>
                  <input
                    type="text"
                    value={ideaB.tech_stack}
                    onChange={(e) => setIdeaB({ ...ideaB, tech_stack: e.target.value })}
                    placeholder="e.g. FastAPI, Amazon Bedrock, DynamoDB"
                    className="w-full px-4 py-2.5 rounded-2xl bg-[#0A0A0A] border border-white/10 text-xs text-white focus:outline-none focus:border-cyber-yellow/50 transition-colors"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-white/50 block mb-1.5 font-bold">
                    Target Audience (Optional)
                  </label>
                  <input
                    type="text"
                    value={ideaB.target_users}
                    onChange={(e) => setIdeaB({ ...ideaB, target_users: e.target.value })}
                    placeholder="e.g. Sustainability coordinators"
                    className="w-full px-4 py-2.5 rounded-2xl bg-[#0A0A0A] border border-white/10 text-xs text-white focus:outline-none focus:border-cyber-yellow/50 transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Optional Problem Statement */}
          <div className="p-5 rounded-[32px] bg-[#171717]/80 backdrop-blur-xl border border-white/10 space-y-2.5 shadow-2xl">
            <label className="text-xs font-semibold text-white/70 flex items-center gap-2">
              <Layers size={14} className="text-cyber-yellow" />
              <span>Overarching Problem Statement (Optional context for both ideas)</span>
            </label>
            <input
              type="text"
              value={problemStatement}
              onChange={(e) => setProblemStatement(e.target.value)}
              placeholder="Paste the shared hackathon challenge track or problem prompt here..."
              className="w-full px-4 py-2.5 rounded-2xl bg-[#0A0A0A] border border-white/10 text-xs text-white focus:outline-none focus:border-cyber-yellow/50 transition-colors"
            />
          </div>

          {errorMessage && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center gap-2">
              <AlertTriangle size={15} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Submit Action */}
          <div className="flex justify-center pt-4">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleStartDuel}
              disabled={loading}
              className="h-12 px-8 rounded-full bg-cyber-yellow text-black font-black text-sm shadow-xl shadow-cyber-yellow/20 hover:bg-cyber-yellow/90 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-40"
            >
              <Swords size={16} />
              <span>{loading ? "Simulating Duel Rounds..." : "Launch Idea Duel (5 Rounds)"}</span>
            </motion.button>
          </div>
        </div>
      )}

      {/* Loading Animation */}
      {loading && (
        <div className="py-12 space-y-4">
          <div className="flex items-center justify-center gap-3 text-cyber-yellow font-mono text-sm font-bold">
            <Swords className="animate-bounce" size={20} />
            <span>AI Venture Strategist Sparring Rounds in Progress...</span>
          </div>
          <AIThinkingPanel
            currentThought="Synthesizing architectural trade-offs without picking a winner..."
            allThoughts={[
              "Extracting problem space boundaries for Concept A and Concept B...",
              "Benchmarking technical feasibility against 48h hackathon sprint constraints...",
              "Synthesizing architectural trade-offs without picking a winner...",
              "Formulating adversarial judge challenge questions..."
            ]}
            isThinking={true}
          />
        </div>
      )}

      {/* Results View */}
      {duelResult && (
        <div className="space-y-6">
          {/* Neutral Diagnostic Notice */}
          <div className="p-4 rounded-[24px] bg-cyber-yellow/10 border border-cyber-yellow/25 flex items-start gap-3 text-xs text-white/80">
            <Info size={16} className="text-cyber-yellow shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-cyber-yellow">Reasoning Assistant Mode: </span>
              HackPilot highlights trade-offs, evidence gaps, and judge friction rather than declaring a winner. Use this intelligence to de-risk your final architectural choice.
            </div>
          </div>

          {/* Quick Idea Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-6 rounded-[32px] bg-[#171717]/80 backdrop-blur-xl border border-white/10 space-y-3 shadow-2xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-black text-cyber-yellow px-2.5 py-0.5 rounded-full bg-cyber-yellow/10 border border-cyber-yellow/30">IDEA A</span>
                <span className="text-[11px] text-white/50">{duelResult.analysis.idea_a.strengths.length} Strengths · {duelResult.analysis.idea_a.risks.length} Risks</span>
              </div>
              <h3 className="text-lg font-bold text-white">{ideaA.title}</h3>
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold text-white/50 uppercase tracking-wider font-mono">Key Signals:</p>
                <div className="flex flex-wrap gap-1.5">
                  {duelResult.analysis.idea_a.differentiation_signals.map((sig, i) => (
                    <span key={i} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/80 text-[11px]">
                      {sig}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 rounded-[32px] bg-[#171717]/80 backdrop-blur-xl border border-white/10 space-y-3 shadow-2xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-black text-white px-2.5 py-0.5 rounded-full bg-white/10 border border-white/20">IDEA B</span>
                <span className="text-[11px] text-white/50">{duelResult.analysis.idea_b.strengths.length} Strengths · {duelResult.analysis.idea_b.risks.length} Risks</span>
              </div>
              <h3 className="text-lg font-bold text-white">{ideaB.title}</h3>
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold text-white/50 uppercase tracking-wider font-mono">Key Signals:</p>
                <div className="flex flex-wrap gap-1.5">
                  {duelResult.analysis.idea_b.differentiation_signals.map((sig, i) => (
                    <span key={i} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/80 text-[11px]">
                      {sig}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex flex-wrap gap-2 p-1.5 rounded-full bg-[#171717] border border-white/10 w-fit text-xs font-bold">
            <button
              onClick={() => setActiveTab("rounds")}
              className={`px-4 py-2 rounded-full transition-all ${activeTab === "rounds" ? "bg-cyber-yellow text-black shadow-md shadow-cyber-yellow/20" : "text-white/60 hover:text-white"}`}
            >
              4-Dimension Trade-Off Matrix
            </button>
            <button
              onClick={() => setActiveTab("questions")}
              className={`px-4 py-2 rounded-full transition-all ${activeTab === "questions" ? "bg-cyber-yellow text-black shadow-md shadow-cyber-yellow/20" : "text-white/60 hover:text-white"}`}
            >
              Round 5: Judge Interrogation Questions
            </button>
            <button
              onClick={() => setActiveTab("shared")}
              className={`px-4 py-2 rounded-full transition-all ${activeTab === "shared" ? "bg-cyber-yellow text-black shadow-md shadow-cyber-yellow/20" : "text-white/60 hover:text-white"}`}
            >
              Shared Risks & Opportunities
            </button>
          </div>

          {/* TAB 1: 4-Dimension Rounds */}
          {activeTab === "rounds" && (
            <div className="space-y-4">
              {/* Dimension Selector Pills */}
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "problem", label: "Round 1: Problem Strength" },
                  { id: "differentiation", label: "Round 2: Differentiation & Moat" },
                  { id: "tech", label: "Round 3: Technical Feasibility" },
                  { id: "impact", label: "Round 4: Measurable Impact" },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveRound(item.id as "problem" | "differentiation" | "tech" | "impact")}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${activeRound === item.id ? "bg-cyber-yellow/20 text-cyber-yellow border border-cyber-yellow/40" : "bg-[#171717] text-white/50 border border-white/10 hover:text-white"}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Active Dimension Details */}
              {(() => {
                const comp = duelResult.analysis.comparison;
                const dimensionMap = {
                  problem: comp.problem_strength,
                  differentiation: comp.differentiation,
                  tech: comp.technical_feasibility,
                  impact: comp.impact,
                };
                const currentData = dimensionMap[activeRound];

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Trade-Offs Card */}
                    <div className="p-5 rounded-[28px] bg-[#171717]/80 backdrop-blur-xl border border-white/10 space-y-3 shadow-xl">
                      <div className="flex items-center gap-2 text-cyber-yellow font-bold text-xs uppercase tracking-wider font-mono">
                        <Lightbulb size={15} />
                        <span>Key Architectural Trade-Offs</span>
                      </div>
                      <ul className="space-y-2">
                        {currentData.trade_offs.map((item, idx) => (
                          <li key={idx} className="text-xs text-white/70 flex items-start gap-2">
                            <span className="text-cyber-yellow font-bold">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Evidence Gaps Card */}
                    <div className="p-5 rounded-[28px] bg-[#171717]/80 backdrop-blur-xl border border-white/10 space-y-3 shadow-xl">
                      <div className="flex items-center gap-2 text-white font-bold text-xs uppercase tracking-wider font-mono">
                        <Sparkles size={15} className="text-cyber-yellow" />
                        <span>Stronger Evidence Needed</span>
                      </div>
                      <ul className="space-y-2">
                        {currentData.stronger_evidence_needed.map((item, idx) => (
                          <li key={idx} className="text-xs text-white/70 flex items-start gap-2">
                            <span className="text-cyber-yellow font-bold">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Primary Vulnerabilities Card */}
                    <div className="p-5 rounded-[28px] bg-[#171717]/80 backdrop-blur-xl border border-white/10 space-y-3 shadow-xl">
                      <div className="flex items-center gap-2 text-red-400 font-bold text-xs uppercase tracking-wider font-mono">
                        <ShieldAlert size={15} />
                        <span>Primary Vulnerabilities & Failure Points</span>
                      </div>
                      <ul className="space-y-2">
                        {currentData.primary_risks.map((item, idx) => (
                          <li key={idx} className="text-xs text-white/70 flex items-start gap-2">
                            <span className="text-red-400 font-bold">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Area Requiring Validation */}
                    <div className="p-5 rounded-[28px] bg-[#171717]/80 backdrop-blur-xl border border-white/10 space-y-3 shadow-xl">
                      <div className="flex items-center gap-2 text-cyber-yellow font-bold text-xs uppercase tracking-wider font-mono">
                        <TrendingUp size={15} />
                        <span>Area Requiring Sprint Validation</span>
                      </div>
                      <ul className="space-y-2">
                        {currentData.area_requiring_validation.map((item, idx) => (
                          <li key={idx} className="text-xs text-white/70 flex items-start gap-2">
                            <span className="text-cyber-yellow font-bold">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* TAB 2: Judge Challenge Questions */}
          {activeTab === "questions" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 rounded-[32px] bg-[#171717]/80 backdrop-blur-xl border border-white/10 space-y-4 shadow-2xl">
                <div className="flex items-center gap-2 text-cyber-yellow font-bold text-xs uppercase tracking-wider font-mono">
                  <HelpCircle size={15} />
                  <span>Anticipated Judge Questions for {ideaA.title}</span>
                </div>
                <div className="space-y-2.5">
                  {duelResult.analysis.idea_a.judge_questions.map((q, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-[#0A0A0A] border border-white/10 text-xs text-white leading-relaxed">
                      <span className="font-mono font-bold text-cyber-yellow mr-2">Q{idx + 1}:</span>
                      {q}
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 rounded-[32px] bg-[#171717]/80 backdrop-blur-xl border border-white/10 space-y-4 shadow-2xl">
                <div className="flex items-center gap-2 text-white font-bold text-xs uppercase tracking-wider font-mono">
                  <HelpCircle size={15} className="text-cyber-yellow" />
                  <span>Anticipated Judge Questions for {ideaB.title}</span>
                </div>
                <div className="space-y-2.5">
                  {duelResult.analysis.idea_b.judge_questions.map((q, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-[#0A0A0A] border border-white/10 text-xs text-white leading-relaxed">
                      <span className="font-mono font-bold text-white/60 mr-2">Q{idx + 1}:</span>
                      {q}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Shared Risks & Opportunities */}
          {activeTab === "shared" && (
            <div className="space-y-4">
              <div className="p-6 rounded-[32px] bg-[#171717]/80 backdrop-blur-xl border border-white/10 space-y-4 shadow-2xl">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider font-mono">
                  <AlertTriangle size={15} />
                  <span>Shared Blindspots (Risks Confronting Both Concepts)</span>
                </div>
                <ul className="space-y-2.5">
                  {duelResult.analysis.shared_risks.map((risk, idx) => (
                    <li key={idx} className="text-xs text-white/70 flex items-start gap-2">
                      <span className="text-amber-400 font-bold">⚠️</span>
                      <span>{risk}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-6 rounded-[32px] bg-[#171717]/80 backdrop-blur-xl border border-white/10 space-y-4 shadow-2xl">
                <div className="flex items-center gap-2 text-cyber-yellow font-bold text-xs uppercase tracking-wider font-mono">
                  <CheckCircle2 size={15} />
                  <span>Strategic Elevation Opportunities (Best of Both Worlds)</span>
                </div>
                <ul className="space-y-2.5">
                  {duelResult.analysis.improvement_opportunities.map((opp, idx) => (
                    <li key={idx} className="text-xs text-white/70 flex items-start gap-2">
                      <span className="text-cyber-yellow font-bold">✓</span>
                      <span>{opp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      <XPToast xp={toastXp} onDone={() => setToastXp(null)} />
    </div>
  );
}
