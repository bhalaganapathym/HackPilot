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
  "evidence gap": "bg-red-900/40 text-red-300 border border-red-500/30",
  "needs clarification": "bg-yellow-900/40 text-yellow-300 border border-yellow-500/30",
  "insufficient information": "bg-orange-900/40 text-orange-300 border border-orange-500/30",
};

function getStatusColor(status: string): string {
  const key = status.toLowerCase();
  for (const [k, v] of Object.entries(STATUS_COLORS)) {
    if (key.includes(k)) return v;
  }
  return "bg-gray-800 text-gray-300 border border-gray-600";
}

function SlideCard({ slide }: { slide: SlideAnalysis }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-900 hover:bg-gray-800 transition text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-gray-500 w-6">#{slide.slide_number}</span>
          <span className="text-sm font-semibold text-gray-200">{slide.slide_title}</span>
          <span className="text-xs text-gray-500 italic hidden sm:inline">{slide.purpose}</span>
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-500 shrink-0" />}
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
            <div className="px-4 py-3 bg-gray-900/50 space-y-3 border-t border-gray-700">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-semibold text-gray-400 mb-1">Clarity</p>
                  <p className="text-sm text-gray-300">{slide.clarity}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 mb-1">Information Density</p>
                  <p className="text-sm text-gray-300">{slide.information_density}</p>
                </div>
              </div>
              {slide.missing_information && (
                <div className="flex items-start gap-2 text-sm text-red-300">
                  <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0 text-red-400" />
                  <span>{slide.missing_information}</span>
                </div>
              )}
              {slide.improvement_suggestions.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-yellow-400 uppercase tracking-wide">Improvements</p>
                  <ul className="space-y-0.5">
                    {slide.improvement_suggestions.map((s, i) => (
                      <li key={i} className="text-xs text-gray-400 flex items-start gap-1.5">
                        <Lightbulb className="w-3 h-3 mt-0.5 text-yellow-400 shrink-0" />{s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {slide.potential_judge_questions.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-purple-400 uppercase tracking-wide">Likely Judge Questions</p>
                  <ul className="space-y-0.5">
                    {slide.potential_judge_questions.map((q, i) => (
                      <li key={i} className="text-xs text-gray-400 flex items-start gap-1.5">
                        <HelpCircle className="w-3 h-3 mt-0.5 text-purple-400 shrink-0" />{q}
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
    <div className="overflow-x-auto rounded-xl border border-gray-700">
      <table className="w-full text-sm">
        <thead className="bg-gray-800">
          <tr>
            <th className="px-4 py-2 text-left text-gray-400 font-semibold">Claim</th>
            <th className="px-4 py-2 text-left text-gray-400 font-semibold">Evidence Found</th>
            <th className="px-4 py-2 text-left text-gray-400 font-semibold">Status</th>
            <th className="px-4 py-2 text-left text-gray-400 font-semibold">Recommendation</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {gaps.map((g, i) => (
            <tr key={i} className="bg-gray-900 hover:bg-gray-800/50 transition">
              <td className="px-4 py-2 text-gray-300">{g.claim}</td>
              <td className="px-4 py-2 text-gray-400 text-xs">{g.evidence_found}</td>
              <td className="px-4 py-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(g.status)}`}>
                  {g.status}
                </span>
              </td>
              <td className="px-4 py-2 text-gray-400 text-xs">{g.recommendation}</td>
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
    <div className="min-h-screen bg-gray-950 text-white px-4 py-10">
      <div className="max-w-4xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3">
            <FileText className="w-8 h-8 text-indigo-400" />
            <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent">
              Pitch Deck Analyzer
            </h1>
          </div>
          <p className="text-gray-400 text-sm">
            Upload your PDF pitch deck for AI-powered slide analysis, evidence gap detection, judge Q&A prep, and recommendations.
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {phase === "IDLE" && (
            <motion.div key="idle" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-5">
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-12 flex flex-col items-center gap-4 cursor-pointer transition-all ${
                  dragOver
                    ? "border-indigo-500 bg-indigo-900/10"
                    : selectedFile
                    ? "border-green-500 bg-green-900/10"
                    : "border-gray-700 bg-gray-900 hover:border-indigo-500 hover:bg-indigo-900/5"
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
                    <CheckCircle2 className="w-12 h-12 text-green-400" />
                    <div className="text-center">
                      <p className="font-semibold text-green-400">{selectedFile.name}</p>
                      <p className="text-sm text-gray-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB — Click to change</p>
                    </div>
                  </>
                ) : (
                  <>
                    <Upload className="w-12 h-12 text-gray-500" />
                    <div className="text-center">
                      <p className="font-semibold text-gray-300">Drop your PDF here or click to browse</p>
                      <p className="text-sm text-gray-500">PDF only · Max 10 MB</p>
                    </div>
                  </>
                )}
              </div>

              {errorMessage && (
                <div className="bg-red-900/30 border border-red-500/40 rounded-xl px-4 py-3 text-red-300 text-sm">{errorMessage}</div>
              )}

              <button
                onClick={handleAnalyze}
                disabled={!selectedFile}
                className="w-full flex items-center justify-center gap-3 py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Layers className="w-5 h-5" />
                Analyze Pitch Deck
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
              <div className="bg-gradient-to-br from-indigo-900/30 to-purple-900/20 border border-indigo-500/30 rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <FileText className="w-6 h-6 text-indigo-400" />
                  <h2 className="text-xl font-black text-indigo-300">Analysis Complete</h2>
                  <span className="text-gray-500 text-sm ml-1">· {result.page_count} slides</span>
                  {result.gamification?.xp_gained ? (
                    <span className="ml-auto text-green-400 font-bold text-sm">+{result.gamification.xp_gained} XP</span>
                  ) : null}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Problem</p>
                    <p className="text-gray-300">{result.analysis.problem_summary}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Solution</p>
                    <p className="text-gray-300">{result.analysis.solution_summary}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">AWS Usage</p>
                    <p className="text-gray-300">{result.analysis.aws_usage_summary}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Presentation Quality</p>
                    <p className="text-gray-300">{result.analysis.presentation_quality}</p>
                  </div>
                </div>
              </div>

              {/* Category Scores */}
              {categoryScores && (
                <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5 space-y-3">
                  <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wide flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-indigo-400" /> Category Scores (0-100)
                  </h3>
                  {Object.entries(categoryScores).map(([key, val]) => {
                    const score = typeof val === "number" ? val : 0;
                    return (
                      <div key={key} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-300 capitalize">{key.replace(/_/g, " ")}</span>
                          <span className={`font-bold ${score >= 70 ? "text-green-400" : score >= 50 ? "text-yellow-400" : "text-red-400"}`}>{score}</span>
                        </div>
                        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${score}%` }} transition={{ duration: 0.8 }} className={`h-full rounded-full ${score >= 70 ? "bg-green-500" : score >= 50 ? "bg-yellow-500" : "bg-red-500"}`} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Slide Breakdown */}
              {result.analysis.slide_analyses.length > 0 && (
                <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5 space-y-3">
                  <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wide flex items-center gap-2">
                    <Layers className="w-4 h-4 text-cyan-400" /> Slide Breakdown ({result.analysis.slide_analyses.length} slides)
                  </h3>
                  <div className="space-y-2">
                    {result.analysis.slide_analyses.map((slide) => (
                      <SlideCard key={slide.slide_number} slide={slide} />
                    ))}
                  </div>
                </div>
              )}

              {/* Evidence Gaps */}
              {result.analysis.evidence_gaps.length > 0 && (
                <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5 space-y-3">
                  <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wide flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-400" /> Evidence Gaps ({result.analysis.evidence_gaps.length})
                  </h3>
                  <EvidenceTable gaps={result.analysis.evidence_gaps} />
                </div>
              )}

              {/* Judge Questions */}
              {questionCategories.length > 0 && (
                <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5 space-y-4">
                  <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wide flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-purple-400" /> Likely Judge Questions
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {questionCategories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setActiveQuestionTab(cat)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${
                          activeQuestionTab === cat
                            ? "bg-purple-900/50 border-purple-500 text-purple-300"
                            : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                  <ul className="space-y-2">
                    {(result.analysis.judge_questions[activeQuestionTab as keyof typeof result.analysis.judge_questions] ?? []).map((q: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                        <HelpCircle className="w-4 h-4 mt-0.5 shrink-0 text-purple-400" />
                        {q}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wide flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-400" /> Prioritized Recommendations
                </h3>
                {[
                  { key: "high_priority", label: "High Priority", color: "text-red-400", border: "border-red-500/30", bg: "bg-red-900/10" },
                  { key: "medium_priority", label: "Medium Priority", color: "text-yellow-400", border: "border-yellow-500/30", bg: "bg-yellow-900/10" },
                  { key: "low_priority", label: "Low Priority", color: "text-green-400", border: "border-green-500/30", bg: "bg-green-900/10" },
                ].map(({ key, label, color, border, bg }) => {
                  const items = result.analysis.recommendations[key as keyof typeof result.analysis.recommendations] ?? [];
                  if (items.length === 0) return null;
                  return (
                    <div key={key} className={`border ${border} ${bg} rounded-xl p-4 space-y-2`}>
                      <p className={`text-xs font-bold uppercase tracking-wide ${color}`}>{label}</p>
                      <ul className="space-y-1">
                        {items.map((item: string, i: number) => (
                          <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                            <ChevronRight className={`w-3 h-3 mt-0.5 shrink-0 ${color}`} />{item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>

              <button onClick={handleReset} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-600 hover:border-indigo-500 text-gray-300 hover:text-indigo-400 transition font-semibold">
                <RotateCcw className="w-4 h-4" />
                Analyze Another Deck
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
