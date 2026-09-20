"use client";

import React, { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  HelpCircle,
  BarChart2,
  Layers,
  TrendingUp,
} from "lucide-react";
import { api, PitchDeckResponse, SlideAnalysis, EvidenceGap } from "@/lib/api";
import { XPToast } from "@/components/common/XPToast";
import { AIThinkingPanel } from "@/components/common/AIThinkingPanel";
import { sounds } from "@/lib/sounds";

type Phase = "IDLE" | "ANALYZING" | "RESULTS";

const STATUS_COLORS: Record<string, string> = {
  "evidence gap": "bg-red-500/10 text-red-400 border border-red-500/30",
  "needs clarification": "bg-cyber-yellow/10 text-cyber-yellow border border-cyber-yellow/30",
  "insufficient information": "bg-amber-400/10 text-amber-400 border border-amber-400/30",
};

function getStatusColor(status: string): string {
  const key = status.toLowerCase();
  for (const [k, v] of Object.entries(STATUS_COLORS)) {
    if (key.includes(k)) return v;
  }
  return "bg-white/5 text-white/70 border border-white/10";
}

function SlideCard({ slide }: { slide: SlideAnalysis }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-white/10 rounded-2xl overflow-hidden bg-[#0A0A0A]/60">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 bg-[#171717]/80 hover:bg-white/5 transition-all text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono font-bold text-cyber-yellow w-7">#{slide.slide_number}</span>
          <span className="text-sm font-bold text-white">{slide.slide_title}</span>
          <span className="text-xs text-white/50 italic hidden sm:inline">{slide.purpose}</span>
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-white/50 shrink-0" /> : <ChevronRight className="w-4 h-4 text-white/50 shrink-0" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 py-4 bg-[#0A0A0A] space-y-3.5 border-t border-white/10">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-mono font-bold text-white/50 uppercase mb-1">Clarity</p>
                  <p className="text-sm text-white/80 leading-relaxed">{slide.clarity}</p>
                </div>
                <div>
                  <p className="text-xs font-mono font-bold text-white/50 uppercase mb-1">Information Density</p>
                  <p className="text-sm text-white/80 leading-relaxed">{slide.information_density}</p>
                </div>
              </div>
              {slide.missing_information && (
                <div className="flex items-start gap-2 text-xs text-red-400 p-3 bg-red-500/10 rounded-xl border border-red-500/20">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
                  <span>{slide.missing_information}</span>
                </div>
              )}
              {slide.improvement_suggestions.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-mono font-bold text-cyber-yellow uppercase tracking-wider">Improvements</p>
                  <ul className="space-y-1">
                    {slide.improvement_suggestions.map((s, i) => (
                      <li key={i} className="text-xs text-white/70 flex items-start gap-2">
                        <Lightbulb className="w-3.5 h-3.5 mt-0.5 text-cyber-yellow shrink-0" /><span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {slide.potential_judge_questions.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-mono font-bold text-white uppercase tracking-wider">Likely Judge Questions</p>
                  <ul className="space-y-1">
                    {slide.potential_judge_questions.map((q, i) => (
                      <li key={i} className="text-xs text-white/70 flex items-start gap-2">
                        <HelpCircle className="w-3.5 h-3.5 mt-0.5 text-cyber-yellow shrink-0" /><span>{q}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EvidenceTable({ gaps }: { gaps: EvidenceGap[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10">
      <table className="w-full text-sm">
        <thead className="bg-[#171717] border-b border-white/10">
          <tr>
            <th className="px-4 py-3 text-left text-white/60 font-mono text-xs uppercase font-bold">Claim</th>
            <th className="px-4 py-3 text-left text-white/60 font-mono text-xs uppercase font-bold">Evidence Found</th>
            <th className="px-4 py-3 text-left text-white/60 font-mono text-xs uppercase font-bold">Status</th>
            <th className="px-4 py-3 text-left text-white/60 font-mono text-xs uppercase font-bold">Recommendation</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10 bg-[#0A0A0A]">
          {gaps.map((g, i) => (
            <tr key={i} className="hover:bg-white/5 transition-colors">
              <td className="px-4 py-3 text-white font-medium">{g.claim}</td>
              <td className="px-4 py-3 text-white/60 text-xs">{g.evidence_found}</td>
              <td className="px-4 py-3">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${getStatusColor(g.status)}`}>
                  {g.status}
                </span>
              </td>
              <td className="px-4 py-3 text-white/70 text-xs">{g.recommendation}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PitchDeckPage() {
  const [phase, setPhase] = useState<Phase>("IDLE");
  const [result, setResult] = useState<PitchDeckResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastXp, setToastXp] = useState<number | null>(null);
  const [currentThought, setCurrentThought] = useState("");
  const [allThoughts, setAllThoughts] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activeQuestionTab, setActiveQuestionTab] = useState<string>("technical");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setErrorMessage("Only PDF files are supported.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage(`File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 10 MB.`);
      return;
    }
    setErrorMessage(null);
    setSelectedFile(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    setPhase("ANALYZING");
    setCurrentThought("Extracting slide text from your pitch deck...");
    setAllThoughts(["Parsing PDF structure and narrative flow...", "Running AI analysis across all slides..."]);

    const jobId = `job-pitchdeck-${Date.now()}`;
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
      const formData = new FormData();
      formData.append("file", selectedFile);
      const res = await api.uploadAndAnalyzePitchDeck(formData);
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
      const msg = err instanceof Error ? err.message : "Analysis failed";
      setErrorMessage(msg);
      setPhase("IDLE");
    } finally {
      unsubscribe();
    }
  };

  const handleReset = () => {
    setPhase("IDLE");
    setResult(null);
    setSelectedFile(null);
    setErrorMessage(null);
    setCurrentThought("");
    setAllThoughts([]);
  };

  const categoryScores = result?.analysis?.category_scores;
  const questionCategories = result
    ? (Object.keys(result.analysis.judge_questions) as Array<keyof typeof result.analysis.judge_questions>)
    : [];

  return (
    <div className="space-y-8 pb-16 max-w-[1200px] mx-auto px-4 sm:px-8 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyber-yellow/10 border border-cyber-yellow/30 text-cyber-yellow text-xs font-mono font-bold tracking-wide mx-auto">
            <FileText size={13} />
            <span>Deck De-Risking Scanner</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white">
            Pitch Deck Analyzer
          </h1>
          <p className="text-white/60 text-sm max-w-2xl mx-auto leading-relaxed">
            Upload your PDF pitch deck for AI-powered slide analysis, evidence gap detection, judge Q&A prep, and recommendations.
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {phase === "IDLE" && (
            <motion.div key="idle" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-[32px] p-12 flex flex-col items-center gap-4 cursor-pointer transition-all ${
                  dragOver
                    ? "border-cyber-yellow bg-cyber-yellow/10"
                    : selectedFile
                    ? "border-cyber-yellow bg-cyber-yellow/5"
                    : "border-white/10 bg-[#171717]/80 hover:border-cyber-yellow/40 hover:bg-[#171717]"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                />
                {selectedFile ? (
                  <>
                    <CheckCircle2 className="w-12 h-12 text-cyber-yellow" />
                    <div className="text-center">
                      <p className="font-bold text-cyber-yellow">{selectedFile.name}</p>
                      <p className="text-xs text-white/50 mt-1 font-mono">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB — Click to change</p>
                    </div>
                  </>
                ) : (
                  <>
                    <Upload className="w-12 h-12 text-white/40" />
                    <div className="text-center">
                      <p className="font-bold text-white">Drop your PDF here or click to browse</p>
                      <p className="text-xs text-white/40 mt-1 font-mono">PDF only · Max 10 MB</p>
                    </div>
                  </>
                )}
              </div>

              {errorMessage && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-2xl px-4 py-3 text-red-400 text-xs flex items-center gap-2">{errorMessage}</div>
              )}

              <button
                onClick={handleAnalyze}
                disabled={!selectedFile}
                className="w-full flex items-center justify-center gap-3 py-4 rounded-full font-black text-base bg-cyber-yellow hover:bg-cyber-yellow/90 active:scale-95 text-black transition-all shadow-xl shadow-cyber-yellow/20 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Layers className="w-5 h-5" />
                <span>Analyze Pitch Deck</span>
              </button>
            </motion.div>
          )}

          {phase === "ANALYZING" && (
            <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-8">
              <AIThinkingPanel currentThought={currentThought} allThoughts={allThoughts} isThinking={true} />
            </motion.div>
          )}

          {phase === "RESULTS" && result && (
            <motion.div key="results" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

              {/* Hero summary */}
              <div className="bg-cyber-yellow/10 border border-cyber-yellow/30 rounded-[32px] p-6 sm:p-8 space-y-4 shadow-2xl">
                <div className="flex items-center gap-3">
                  <FileText className="w-6 h-6 text-cyber-yellow" />
                  <h2 className="text-2xl font-black text-cyber-yellow">Analysis Complete</h2>
                  <span className="text-white/50 text-xs font-mono ml-1">· {result.page_count} slides</span>
                  {result.gamification?.xp_gained ? (
                    <span className="ml-auto text-white font-mono font-bold text-sm">+{result.gamification.xp_gained} XP</span>
                  ) : null}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="bg-[#0A0A0A]/60 p-4 rounded-2xl border border-white/10">
                    <p className="text-xs text-cyber-yellow font-mono uppercase font-bold mb-1">Problem</p>
                    <p className="text-white/80 leading-relaxed">{result.analysis.problem_summary}</p>
                  </div>
                  <div className="bg-[#0A0A0A]/60 p-4 rounded-2xl border border-white/10">
                    <p className="text-xs text-cyber-yellow font-mono uppercase font-bold mb-1">Solution</p>
                    <p className="text-white/80 leading-relaxed">{result.analysis.solution_summary}</p>
                  </div>
                  <div className="bg-[#0A0A0A]/60 p-4 rounded-2xl border border-white/10">
                    <p className="text-xs text-cyber-yellow font-mono uppercase font-bold mb-1">AWS Usage</p>
                    <p className="text-white/80 leading-relaxed">{result.analysis.aws_usage_summary}</p>
                  </div>
                  <div className="bg-[#0A0A0A]/60 p-4 rounded-2xl border border-white/10">
                    <p className="text-xs text-cyber-yellow font-mono uppercase font-bold mb-1">Presentation Quality</p>
                    <p className="text-white/80 leading-relaxed">{result.analysis.presentation_quality}</p>
                  </div>
                </div>
              </div>

              {/* Category Scores */}
              {categoryScores && (
                <div className="bg-[#171717]/80 backdrop-blur-xl border border-white/10 rounded-[32px] p-6 space-y-4 shadow-2xl">
                  <h3 className="text-xs font-mono font-bold text-cyber-yellow uppercase tracking-wide flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-cyber-yellow" /> Category Scores (0-100)
                  </h3>
                  {Object.entries(categoryScores).map(([key, val]) => {
                    const score = typeof val === "number" ? val : 0;
                    return (
                      <div key={key} className="space-y-1.5">
                        <div className="flex justify-between text-sm">
                          <span className="text-white/80 capitalize">{key.replace(/_/g, " ")}</span>
                          <span className={`font-mono font-bold ${score >= 70 ? "text-cyber-yellow" : score >= 50 ? "text-amber-400" : "text-red-400"}`}>{score}</span>
                        </div>
                        <div className="h-2 bg-[#0A0A0A] rounded-full overflow-hidden border border-white/10">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${score}%` }} transition={{ duration: 0.8 }} className={`h-full rounded-full ${score >= 70 ? "bg-cyber-yellow" : score >= 50 ? "bg-amber-400" : "bg-red-500"}`} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Slide Breakdown */}
              {result.analysis.slide_analyses.length > 0 && (
                <div className="bg-[#171717]/80 backdrop-blur-xl border border-white/10 rounded-[32px] p-6 space-y-4 shadow-2xl">
                  <h3 className="text-xs font-mono font-bold text-cyber-yellow uppercase tracking-wide flex items-center gap-2">
                    <Layers className="w-4 h-4 text-cyber-yellow" /> Slide Breakdown ({result.analysis.slide_analyses.length} slides)
                  </h3>
                  <div className="space-y-2.5">
                    {result.analysis.slide_analyses.map((slide) => (
                      <SlideCard key={slide.slide_number} slide={slide} />
                    ))}
                  </div>
                </div>
              )}

              {/* Evidence Gaps */}
              {result.analysis.evidence_gaps.length > 0 && (
                <div className="bg-[#171717]/80 backdrop-blur-xl border border-white/10 rounded-[32px] p-6 space-y-4 shadow-2xl">
                  <h3 className="text-xs font-mono font-bold text-cyber-yellow uppercase tracking-wide flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-cyber-yellow" /> Evidence Gaps ({result.analysis.evidence_gaps.length})
                  </h3>
                  <EvidenceTable gaps={result.analysis.evidence_gaps} />
                </div>
              )}

              {/* Judge Questions */}
              {questionCategories.length > 0 && (
                <div className="bg-[#171717]/80 backdrop-blur-xl border border-white/10 rounded-[32px] p-6 space-y-4 shadow-2xl">
                  <h3 className="text-xs font-mono font-bold text-cyber-yellow uppercase tracking-wide flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-cyber-yellow" /> Likely Judge Questions
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {questionCategories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setActiveQuestionTab(cat)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-mono font-bold border transition-all active:scale-95 ${
                          activeQuestionTab === cat
                            ? "bg-cyber-yellow text-black border-cyber-yellow shadow-md shadow-cyber-yellow/20"
                            : "bg-[#0A0A0A] border-white/10 text-white/60 hover:text-white"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                  <ul className="space-y-2.5">
                    {(result.analysis.judge_questions[activeQuestionTab as keyof typeof result.analysis.judge_questions] ?? []).map((q: string, i: number) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-white/80 p-4 rounded-2xl bg-[#0A0A0A] border border-white/10">
                        <HelpCircle className="w-4 h-4 mt-0.5 shrink-0 text-cyber-yellow" />
                        <span>{q}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              <div className="bg-[#171717]/80 backdrop-blur-xl border border-white/10 rounded-[32px] p-6 space-y-4 shadow-2xl">
                <h3 className="text-xs font-mono font-bold text-cyber-yellow uppercase tracking-wide flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-cyber-yellow" /> Prioritized Recommendations
                </h3>
                {[
                  { key: "high_priority", label: "High Priority", color: "text-red-400", border: "border-red-500/30", bg: "bg-red-500/10" },
                  { key: "medium_priority", label: "Medium Priority", color: "text-cyber-yellow", border: "border-cyber-yellow/30", bg: "bg-cyber-yellow/10" },
                  { key: "low_priority", label: "Low Priority", color: "text-white/80", border: "border-white/20", bg: "bg-white/5" },
                ].map(({ key, label, color, border, bg }) => {
                  const items = result.analysis.recommendations[key as keyof typeof result.analysis.recommendations] ?? [];
                  if (items.length === 0) return null;
                  return (
                    <div key={key} className={`border ${border} ${bg} rounded-2xl p-4 space-y-2`}>
                      <p className={`text-xs font-mono font-bold uppercase tracking-wide ${color}`}>{label}</p>
                      <ul className="space-y-1">
                        {items.map((item: string, i: number) => (
                          <li key={i} className="text-sm text-white/80 flex items-start gap-2">
                            <ChevronRight className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${color}`} /><span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>

              <button onClick={handleReset} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full border border-white/20 hover:border-cyber-yellow hover:bg-cyber-yellow hover:text-black text-white transition-all font-black text-sm active:scale-95 shadow-lg">
                <RotateCcw className="w-4 h-4" />
                <span>Analyze Another Deck</span>
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
