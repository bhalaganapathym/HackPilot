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
    <div className="space-y-8 pb-16 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-accent-coral/10 text-accent-coral text-xs font-semibold">
            <Swords size={13} />
            <span>5-Round Concept Arena</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
            Idea Duel
          </h1>
          <p className="text-sm text-text-muted max-w-2xl">
            Pit two project concepts head-to-head in structured AI sparring rounds. Expose architectural trade-offs, technical risks, and judge hurdles — strictly with no winner declared.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!duelResult && (
            <button
              type="button"
              onClick={handleLoadSample}
              className="px-3 py-1.5 rounded-xl border border-border text-xs font-medium text-text-muted hover:text-text-primary hover:bg-fill transition-colors flex items-center gap-1.5"
            >
              <Sparkles size={13} className="text-accent-amber" />
              <span>Load Sample Duel</span>
            </button>
          )}
          {duelResult && (
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-1.5 rounded-xl border border-border text-xs font-medium text-text-muted hover:text-text-primary hover:bg-fill transition-colors flex items-center gap-1.5"
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
            <div className="p-5 rounded-2xl bg-surface border border-border space-y-4 shadow-card">
              <div className="flex items-center gap-2 border-b border-border pb-3">
                <div className="w-7 h-7 rounded-lg bg-accent-blue/10 text-accent-blue font-bold text-xs flex items-center justify-center font-mono">
                  A
                </div>
                <h3 className="text-sm font-bold text-text-primary">Idea A</h3>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-text-tertiary block mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={ideaA.title}
                    onChange={(e) => setIdeaA({ ...ideaA, title: e.target.value })}
                    placeholder="e.g. EcoCampus Smart Bins"
                    className="w-full px-3 py-2 rounded-xl bg-bg border border-border text-sm text-text-primary focus:outline-none focus:border-accent-blue"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-text-tertiary block mb-1">
                    Description *
                  </label>
                  <textarea
                    rows={4}
                    value={ideaA.description}
                    onChange={(e) => setIdeaA({ ...ideaA, description: e.target.value })}
                    placeholder="How does Idea A work? What core problem does it solve?"
                    className="w-full px-3 py-2 rounded-xl bg-bg border border-border text-xs text-text-primary focus:outline-none focus:border-accent-blue resize-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-text-tertiary block mb-1">
                    Tech Stack (Optional)
                  </label>
                  <input
                    type="text"
                    value={ideaA.tech_stack}
                    onChange={(e) => setIdeaA({ ...ideaA, tech_stack: e.target.value })}
                    placeholder="e.g. Raspberry Pi, AWS IoT Core, FastAPI"
                    className="w-full px-3 py-2 rounded-xl bg-bg border border-border text-xs text-text-primary focus:outline-none focus:border-accent-blue"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-text-tertiary block mb-1">
                    Target Audience (Optional)
                  </label>
                  <input
                    type="text"
                    value={ideaA.target_users}
                    onChange={(e) => setIdeaA({ ...ideaA, target_users: e.target.value })}
                    placeholder="e.g. Campus facility directors"
                    className="w-full px-3 py-2 rounded-xl bg-bg border border-border text-xs text-text-primary focus:outline-none focus:border-accent-blue"
                  />
                </div>
              </div>
            </div>

            {/* Idea B Card */}
            <div className="p-5 rounded-2xl bg-surface border border-border space-y-4 shadow-card">
              <div className="flex items-center gap-2 border-b border-border pb-3">
                <div className="w-7 h-7 rounded-lg bg-accent-coral/10 text-accent-coral font-bold text-xs flex items-center justify-center font-mono">
                  B
                </div>
                <h3 className="text-sm font-bold text-text-primary">Idea B</h3>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-text-tertiary block mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={ideaB.title}
                    onChange={(e) => setIdeaB({ ...ideaB, title: e.target.value })}
                    placeholder="e.g. Campus PowerGrid Optimizer"
                    className="w-full px-3 py-2 rounded-xl bg-bg border border-border text-sm text-text-primary focus:outline-none focus:border-accent-coral"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-text-tertiary block mb-1">
                    Description *
                  </label>
                  <textarea
                    rows={4}
                    value={ideaB.description}
                    onChange={(e) => setIdeaB({ ...ideaB, description: e.target.value })}
                    placeholder="How does Idea B solve the problem differently?"
                    className="w-full px-3 py-2 rounded-xl bg-bg border border-border text-xs text-text-primary focus:outline-none focus:border-accent-coral resize-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-text-tertiary block mb-1">
                    Tech Stack (Optional)
                  </label>
                  <input
                    type="text"
                    value={ideaB.tech_stack}
                    onChange={(e) => setIdeaB({ ...ideaB, tech_stack: e.target.value })}
                    placeholder="e.g. FastAPI, Amazon Bedrock, DynamoDB"
                    className="w-full px-3 py-2 rounded-xl bg-bg border border-border text-xs text-text-primary focus:outline-none focus:border-accent-coral"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-text-tertiary block mb-1">
                    Target Audience (Optional)
                  </label>
                  <input
                    type="text"
                    value={ideaB.target_users}
                    onChange={(e) => setIdeaB({ ...ideaB, target_users: e.target.value })}
                    placeholder="e.g. Sustainability coordinators"
                    className="w-full px-3 py-2 rounded-xl bg-bg border border-border text-xs text-text-primary focus:outline-none focus:border-accent-coral"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Optional Problem Statement */}
          <div className="p-4 rounded-2xl bg-surface border border-border space-y-2">
            <label className="text-xs font-semibold text-text-muted flex items-center gap-1.5">
              <Layers size={14} className="text-accent-violet" />
              <span>Overarching Problem Statement (Optional context for both ideas)</span>
            </label>
            <input
              type="text"
              value={problemStatement}
              onChange={(e) => setProblemStatement(e.target.value)}
              placeholder="Paste the shared hackathon challenge track or problem prompt here..."
              className="w-full px-3 py-2 rounded-xl bg-bg border border-border text-xs text-text-primary focus:outline-none focus:border-accent-violet"
            />
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-accent-coral/10 border border-accent-coral/30 text-xs text-accent-coral flex items-center gap-2">
              <AlertTriangle size={15} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Submit Action */}
          <div className="flex justify-center pt-2">
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleStartDuel}
              disabled={loading}
              className="h-12 px-8 rounded-2xl bg-accent-coral text-white font-semibold text-sm shadow-md hover:bg-accent-coral/90 transition-all flex items-center gap-2 disabled:opacity-50"
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
          <div className="flex items-center justify-center gap-3 text-accent-coral font-mono text-sm font-semibold">
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
          <div className="p-3.5 rounded-2xl bg-accent-blue/10 border border-accent-blue/20 flex items-start gap-3 text-xs text-text-muted">
            <Info size={16} className="text-accent-blue shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-text-primary">Reasoning Assistant Mode: </span>
              HackPilot highlights trade-offs, evidence gaps, and judge friction rather than declaring a winner. Use this intelligence to de-risk your final architectural choice.
            </div>
          </div>

          {/* Quick Idea Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-surface border border-accent-blue/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-accent-blue">IDEA A</span>
                <span className="text-[11px] text-text-tertiary">{duelResult.analysis.idea_a.strengths.length} Strengths · {duelResult.analysis.idea_a.risks.length} Risks</span>
              </div>
              <h3 className="text-base font-bold text-text-primary">{ideaA.title}</h3>
              <div className="space-y-1">
                <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Key Signals:</p>
                <div className="flex flex-wrap gap-1.5">
                  {duelResult.analysis.idea_a.differentiation_signals.map((sig, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-md bg-accent-blue/10 text-accent-blue text-[11px]">
                      {sig}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-surface border border-accent-coral/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-accent-coral">IDEA B</span>
                <span className="text-[11px] text-text-tertiary">{duelResult.analysis.idea_b.strengths.length} Strengths · {duelResult.analysis.idea_b.risks.length} Risks</span>
              </div>
              <h3 className="text-base font-bold text-text-primary">{ideaB.title}</h3>
              <div className="space-y-1">
                <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Key Signals:</p>
                <div className="flex flex-wrap gap-1.5">
                  {duelResult.analysis.idea_b.differentiation_signals.map((sig, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-md bg-accent-coral/10 text-accent-coral text-[11px]">
                      {sig}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-border text-xs font-semibold">
            <button
              onClick={() => setActiveTab("rounds")}
              className={`pb-3 px-4 border-b-2 transition-colors ${activeTab === "rounds" ? "border-accent-blue text-text-primary" : "border-transparent text-text-muted"}`}
            >
              4-Dimension Trade-Off Matrix
            </button>
            <button
              onClick={() => setActiveTab("questions")}
              className={`pb-3 px-4 border-b-2 transition-colors ${activeTab === "questions" ? "border-accent-violet text-text-primary" : "border-transparent text-text-muted"}`}
            >
              Round 5: Judge Interrogation Questions
            </button>
            <button
              onClick={() => setActiveTab("shared")}
              className={`pb-3 px-4 border-b-2 transition-colors ${activeTab === "shared" ? "border-accent-green text-text-primary" : "border-transparent text-text-muted"}`}
            >
              Shared Risks & Elevating Opportunities
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
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${activeRound === item.id ? "bg-accent-blue/15 text-accent-blue border border-accent-blue/30" : "bg-fill text-text-muted border border-border hover:text-text-primary"}`}
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
                    <div className="p-4 rounded-2xl bg-surface border border-border space-y-3">
                      <div className="flex items-center gap-2 text-accent-amber font-semibold text-xs uppercase tracking-wider">
                        <Lightbulb size={15} />
                        <span>Key Architectural Trade-Offs</span>
                      </div>
                      <ul className="space-y-2">
                        {currentData.trade_offs.map((item, idx) => (
                          <li key={idx} className="text-xs text-text-muted flex items-start gap-2">
                            <span className="text-accent-amber font-bold">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Evidence Gaps Card */}
                    <div className="p-4 rounded-2xl bg-surface border border-border space-y-3">
                      <div className="flex items-center gap-2 text-accent-blue font-semibold text-xs uppercase tracking-wider">
                        <Sparkles size={15} />
                        <span>Stronger Evidence Needed</span>
                      </div>
                      <ul className="space-y-2">
                        {currentData.stronger_evidence_needed.map((item, idx) => (
                          <li key={idx} className="text-xs text-text-muted flex items-start gap-2">
                            <span className="text-accent-blue font-bold">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Primary Vulnerabilities Card */}
                    <div className="p-4 rounded-2xl bg-surface border border-border space-y-3">
                      <div className="flex items-center gap-2 text-accent-coral font-semibold text-xs uppercase tracking-wider">
                        <ShieldAlert size={15} />
                        <span>Primary Vulnerabilities & Failure Points</span>
                      </div>
                      <ul className="space-y-2">
                        {currentData.primary_risks.map((item, idx) => (
                          <li key={idx} className="text-xs text-text-muted flex items-start gap-2">
                            <span className="text-accent-coral font-bold">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Area Requiring Validation */}
                    <div className="p-4 rounded-2xl bg-surface border border-border space-y-3">
                      <div className="flex items-center gap-2 text-accent-violet font-semibold text-xs uppercase tracking-wider">
                        <TrendingUp size={15} />
                        <span>Area Requiring Sprint Validation</span>
                      </div>
                      <ul className="space-y-2">
                        {currentData.area_requiring_validation.map((item, idx) => (
                          <li key={idx} className="text-xs text-text-muted flex items-start gap-2">
                            <span className="text-accent-violet font-bold">•</span>
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
              <div className="p-5 rounded-2xl bg-surface border border-accent-blue/30 space-y-3">
                <div className="flex items-center gap-2 text-accent-blue font-bold text-xs uppercase tracking-wider">
                  <HelpCircle size={15} />
                  <span>Anticipated Judge Questions for {ideaA.title}</span>
                </div>
                <div className="space-y-2.5">
                  {duelResult.analysis.idea_a.judge_questions.map((q, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-bg border border-border text-xs text-text-primary leading-relaxed">
                      <span className="font-mono font-bold text-accent-blue mr-2">Q{idx + 1}:</span>
                      {q}
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-surface border border-accent-coral/30 space-y-3">
                <div className="flex items-center gap-2 text-accent-coral font-bold text-xs uppercase tracking-wider">
                  <HelpCircle size={15} />
                  <span>Anticipated Judge Questions for {ideaB.title}</span>
                </div>
                <div className="space-y-2.5">
                  {duelResult.analysis.idea_b.judge_questions.map((q, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-bg border border-border text-xs text-text-primary leading-relaxed">
                      <span className="font-mono font-bold text-accent-coral mr-2">Q{idx + 1}:</span>
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
              <div className="p-5 rounded-2xl bg-surface border border-border space-y-3">
                <div className="flex items-center gap-2 text-accent-amber font-bold text-xs uppercase tracking-wider">
                  <AlertTriangle size={15} />
                  <span>Shared Blindspots (Risks Confronting Both Concepts)</span>
                </div>
                <ul className="space-y-2">
                  {duelResult.analysis.shared_risks.map((risk, idx) => (
                    <li key={idx} className="text-xs text-text-muted flex items-start gap-2">
                      <span className="text-accent-amber font-bold">⚠️</span>
                      <span>{risk}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-5 rounded-2xl bg-surface border border-accent-green/30 space-y-3">
                <div className="flex items-center gap-2 text-accent-green font-bold text-xs uppercase tracking-wider">
                  <CheckCircle2 size={15} />
                  <span>Strategic Elevation Opportunities (Best of Both Worlds)</span>
                </div>
                <ul className="space-y-2">
                  {duelResult.analysis.improvement_opportunities.map((opp, idx) => (
                    <li key={idx} className="text-xs text-text-muted flex items-start gap-2">
                      <span className="text-accent-green font-bold">✓</span>
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
