"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  LayoutGrid,
  Layers,
  Users,
  ArrowRight,
  Info,
  RefreshCw,
  Sparkles,
  Clock,
  Loader2,
  Database,
  FileText,
  ChevronRight,
  CheckCircle2,
  X,
  AlertTriangle,
  HelpCircle,
  TrendingUp,
  ShieldAlert,
  Award,
} from "lucide-react";
import {
  api,
  Submission,
  ClusterManifest,
  ClusterItem,
  JudgeDossierResponse,
} from "@/lib/api";
import { useGsapEntrance } from "@/lib/animations";

function statusBadge(status: string) {
  const map: Record<string, { label: string; cls: string }> = {
    submitted: { label: "Submitted", cls: "text-accent-blue bg-accent-blue/10 border-accent-blue/20" },
    evaluated: { label: "Evaluated", cls: "text-accent-green bg-accent-green/10 border-accent-green/20" },
    draft: { label: "Draft", cls: "text-text-muted bg-fill border-border" },
  };
  const s = map[status] || map.submitted;
  return (
    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${s.cls}`}>
      {s.label}
    </span>
  );
}

const CLUSTER_COLORS = [
  "#0A84FF", // Blue
  "#30D158", // Green
  "#BF5AF2", // Purple
  "#FF9F0A", // Orange
  "#FF453A", // Red
  "#64D2FF", // Light Blue
];

export default function OrganizerDashboardPage() {
  const containerRef = useGsapEntrance({ stagger: 0.08 });
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Phase C: Clustering & Differentiation Dossier state
  const [clustering, setClustering] = useState(false);
  const [clusterManifest, setClusterManifest] = useState<ClusterManifest | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<ClusterItem | null>(null);
  const [clusterStatusMsg, setClusterStatusMsg] = useState<string>("");

  // Phase D: Judge Dossier modal state
  const [selectedDossierSubId, setSelectedDossierSubId] = useState<string | null>(null);
  const [dossierLoading, setDossierLoading] = useState(false);
  const [activeDossier, setActiveDossier] = useState<JudgeDossierResponse | null>(null);
  const [dossierError, setDossierError] = useState<string | null>(null);

  const fetchSubmissions = () => {
    setLoading(true);
    api.getSubmissions()
      .then(s => { setSubmissions(s); setLastRefresh(new Date()); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const handleRunClustering = async () => {
    try {
      setClustering(true);
      setClusterStatusMsg("Running Amazon Titan Embeddings V2 & K-Means clustering...");
      const manifest = await api.getClusters();
      setClusterManifest(manifest);
      if (manifest.clusters && manifest.clusters.length > 0) {
        setSelectedCluster(manifest.clusters[0]);
      }
      setClusterStatusMsg(`Clustered into ${manifest.k} distinct domains with Bedrock Differentiation Dossiers.`);
      fetchSubmissions();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setClusterStatusMsg(`Clustering error: ${msg}`);
    } finally {
      setClustering(false);
    }
  };

  const handleOpenJudgeDossier = async (submissionId: string) => {
    setSelectedDossierSubId(submissionId);
    setDossierLoading(true);
    setDossierError(null);
    setActiveDossier(null);
    try {
      const dossier = await api.getJudgeDossier(submissionId);
      setActiveDossier(dossier);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setDossierError(`Failed to load judge dossier: ${msg}`);
    } finally {
      setDossierLoading(false);
    }
  };

  const handleRegenerateDossier = async () => {
    if (!selectedDossierSubId) return;
    setDossierLoading(true);
    setDossierError(null);
    try {
      const dossier = await api.generateJudgeDossier(selectedDossierSubId);
      setActiveDossier(dossier);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setDossierError(`Regeneration failed: ${msg}`);
    } finally {
      setDossierLoading(false);
    }
  };

  const judgeLoads = [
    { name: "Dr. Aris (AI Lead)", assigned: 10, capacity: 12, pct: 83, status: "Optimal" },
    { name: "Sarah K. (Product)", assigned: 11, capacity: 12, pct: 91, status: "Balanced" },
    { name: "Marcus T. (Security)", assigned: 9, capacity: 12, pct: 75, status: "Available" },
    { name: "Elena V. (Cloud Infra)", assigned: 10, capacity: 12, pct: 83, status: "Optimal" },
  ];

  return (
    <div ref={containerRef} className="space-y-10 pb-16">
      {/* Header Banner */}
      <div className="gsap-fade-in">
        <div className="flex items-center gap-2 text-xs font-mono font-semibold text-accent-violet uppercase tracking-wider mb-1">
          <LayoutGrid size={14} />
          <span>Organizer Mission Control · Phase C &amp; D Active</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-text-primary mb-2">
          Organizer Intelligence &amp; Judge Dossiers
        </h1>
        <p className="text-sm sm:text-base text-text-muted max-w-2xl">
          Real-time intake with Amazon Titan Text Embeddings V2, K-Means domain clustering, and Bedrock Nova Pro evidence-backed Judge Dossiers.
        </p>
      </div>

      {/* PHASE C: CLUSTERING & DIFFERENTIATION DOSSIER SECTION */}
      <div className="gsap-fade-in rounded-3xl bg-surface border border-accent-violet/30 p-6 shadow-card space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-accent-violet/10 text-accent-violet">
              <Layers size={18} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">
                Titan Semantic Clusters &amp; Differentiation Dossiers
              </h2>
              <p className="text-xs text-text-muted">
                Unsupervised semantic grouping using 512-d Titan vectors + automated judging briefs
              </p>
            </div>
          </div>
          <button
            onClick={handleRunClustering}
            disabled={clustering || submissions.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent-violet text-white text-sm font-semibold hover:bg-accent-violet/85 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-accent-violet/20 self-start sm:self-auto"
          >
            {clustering ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Clustering with Bedrock...</span>
              </>
            ) : (
              <>
                <Sparkles size={15} />
                <span>Run Titan &amp; K-Means Clustering</span>
              </>
            )}
          </button>
        </div>

        {clusterStatusMsg && (
          <div className="text-xs p-3 rounded-xl bg-fill border border-border flex items-center gap-2 text-text-muted">
            <Info size={14} className="text-accent-violet shrink-0" />
            <span>{clusterStatusMsg}</span>
          </div>
        )}

        {clusterManifest ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
            {/* Cluster Selector Tabs */}
            <div className="lg:col-span-4 space-y-2">
              <div className="text-xs font-mono font-medium text-text-muted uppercase tracking-wider mb-2">
                Discovered Domain Clusters ({clusterManifest.clusters.length})
              </div>
              <div className="space-y-2">
                {clusterManifest.clusters.map((c, idx) => {
                  const color = CLUSTER_COLORS[idx % CLUSTER_COLORS.length];
                  const isSelected = selectedCluster?.id === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCluster(c)}
                      className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        isSelected
                          ? "bg-fill border-accent-violet shadow-sm"
                          : "bg-surface border-border/70 hover:border-border hover:bg-fill/40"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-text-primary truncate">
                            {c.name}
                          </div>
                          <div className="text-xs text-text-muted">
                            {c.count} project{c.count === 1 ? "" : "s"}
                          </div>
                        </div>
                      </div>
                      <ChevronRight
                        size={15}
                        className={isSelected ? "text-accent-violet" : "text-text-muted"}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Cluster Differentiation Dossier & Projects */}
            <div className="lg:col-span-8 rounded-2xl bg-fill/40 border border-border p-5 space-y-5">
              {selectedCluster ? (
                <>
                  <div className="flex items-center justify-between pb-3 border-b border-border">
                    <div>
                      <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                        <span>{selectedCluster.name}</span>
                        <span className="text-xs font-mono font-normal px-2.5 py-0.5 rounded-full bg-accent-violet/10 text-accent-violet border border-accent-violet/20">
                          {selectedCluster.count} projects
                        </span>
                      </h3>
                      <p className="text-xs text-text-muted mt-0.5">
                        Domain cluster auto-labeled by Amazon Nova Pro
                      </p>
                    </div>
                  </div>

                  {/* Dossier Card */}
                  <div className="rounded-xl bg-surface border border-accent-violet/20 p-4 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-mono font-semibold text-accent-violet uppercase tracking-wider">
                      <FileText size={13} />
                      <span>Differentiation Dossier (AI Judge Brief)</span>
                    </div>
                    <p className="text-sm text-text-primary/90 leading-relaxed">
                      {selectedCluster.dossier}
                    </p>
                  </div>

                  {/* Projects in this Cluster */}
                  <div className="space-y-2">
                    <div className="text-xs font-mono font-medium text-text-muted uppercase tracking-wider">
                      Projects in this Cluster
                    </div>
                    <div className="space-y-2">
                      {selectedCluster.submissions.map((p) => (
                        <div
                          key={p.id}
                          className="p-3 rounded-xl bg-surface border border-border flex items-center justify-between gap-3 text-sm"
                        >
                          <div className="min-w-0">
                            <div className="font-semibold text-text-primary truncate">
                              {p.title}
                            </div>
                            <div className="text-xs text-text-muted font-mono">
                              {p.team_name}
                            </div>
                          </div>
                          <div className="flex items-center gap-2.5 shrink-0">
                            {typeof p.score === "number" && (
                              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-accent-green/10 text-accent-green border border-accent-green/20">
                                {p.score} pts
                              </span>
                            )}
                            <button
                              onClick={() => handleOpenJudgeDossier(p.id)}
                              className="px-2.5 py-1 rounded-lg bg-accent-violet/10 text-accent-violet hover:bg-accent-violet/20 text-xs font-medium transition-colors flex items-center gap-1"
                            >
                              <FileText size={12} />
                              <span>Judge Dossier</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-text-muted text-sm">
                  Select a cluster on the left to inspect its Differentiation Dossier.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative w-full h-56 rounded-2xl bg-fill/50 border border-border/70 overflow-hidden flex flex-col items-center justify-center p-6 text-center">
              <Sparkles size={28} className="text-accent-violet mb-2 animate-pulse" />
              <div className="text-sm font-semibold text-text-primary mb-1">
                Ready to Cluster {submissions.length} Submissions
              </div>
              <p className="text-xs text-text-muted max-w-md mb-4">
                Click &quot;Run Titan &amp; K-Means Clustering&quot; to invoke Amazon Titan V2 embeddings, Scikit-learn clustering, and generate Differentiation Dossiers for every domain.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* LIVE Submissions Table */}
      <div className="gsap-fade-in rounded-3xl bg-surface border border-border p-6 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database size={15} className="text-accent-green" />
            <h2 className="text-base font-semibold text-text-primary">Live Submissions Repository</h2>
            <span className="text-xs font-mono font-medium px-2.5 py-0.5 rounded-full bg-accent-green/10 text-accent-green border border-accent-green/20">
              {submissions.length} total
            </span>
          </div>
          <button
            onClick={fetchSubmissions}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors px-2.5 py-1 rounded-lg hover:bg-fill"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-text-muted gap-2 text-sm">
            <Loader2 size={16} className="animate-spin" />
            Loading submissions…
          </div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-10 space-y-2">
            <Clock size={20} className="mx-auto text-text-muted" />
            <p className="text-sm text-text-muted">No submissions yet. Participants submit via the Abstract Analyzer.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {submissions.map((s) => {
              const score = s.latest_scores?.overall;
              const dateStr = new Date(s.created_at).toLocaleString("en-IN", {
                day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
              });
              return (
                <div
                  key={s.id}
                  className="p-4 rounded-2xl bg-fill/50 border border-border/50 hover:border-border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-text-primary truncate">{s.title}</span>
                      {statusBadge(s.status || "submitted")}
                      {s.embedding_status === "done" && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-accent-violet/20 bg-accent-violet/10 text-accent-violet flex items-center gap-1">
                          <CheckCircle2 size={10} /> Titan Embedded
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-text-muted flex-wrap">
                      <span className="font-mono">{s.team_name || "Team HackPilot"}</span>
                      <span>·</span>
                      <span>{dateStr}</span>
                      {s.domain_cluster && (
                        <>
                          <span>·</span>
                          <span className="text-accent-violet font-medium">{s.domain_cluster}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    {typeof score === "number" ? (
                      <div className="text-center">
                        <div className={`text-lg font-mono font-bold ${score >= 70 ? "text-accent-green" : score >= 50 ? "text-accent-amber" : "text-accent-red"}`}>
                          {score}
                        </div>
                        <div className="text-[10px] text-text-muted">Score</div>
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="text-lg font-mono font-bold text-text-muted">—</div>
                        <div className="text-[10px] text-text-muted">No score</div>
                      </div>
                    )}
                    <button
                      onClick={() => handleOpenJudgeDossier(s.id)}
                      className="px-3 py-1.5 rounded-xl bg-accent-violet/10 text-accent-violet hover:bg-accent-violet/20 border border-accent-violet/20 text-xs font-semibold transition-all flex items-center gap-1.5"
                    >
                      <FileText size={13} />
                      <span>Judge Dossier</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="pt-2 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-text-muted">
          <span className="flex items-center gap-1">
            <Info size={12} />
            Last refreshed: {lastRefresh.toLocaleTimeString("en-IN")} · Dual-persisted (SQLite + AWS DynamoDB)
          </span>
          <Link
            href="/"
            className="text-accent-violet hover:underline font-medium inline-flex items-center gap-1"
          >
            <span>Return to Participant View</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      {/* Judge Load Balancing */}
      <div className="gsap-fade-in rounded-3xl bg-surface border border-border p-6 shadow-card space-y-4">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-text-primary flex items-center gap-1.5">
            <Users size={14} className="text-accent-violet" />
            <span>Judge Fatigue Balancer (Anti-Burnout Allocation)</span>
          </span>
          <span className="text-text-muted font-mono">Max 12/Judge</span>
        </div>

        <div className="space-y-2.5">
          {judgeLoads.map((j, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl bg-fill/50 border border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
            >
              <div className="flex items-center gap-2 min-w-44">
                <span className="font-medium text-text-primary">{j.name}</span>
              </div>

              <div className="flex-1 flex items-center gap-3">
                <div className="flex-1 h-2 bg-border/60 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${j.pct}%`,
                      backgroundColor: j.pct > 90 ? "var(--accent-amber)" : "var(--accent-green)",
                    }}
                  />
                </div>
                <span className="font-mono text-[11px] text-text-muted w-14 text-right">
                  {j.assigned}/{j.capacity} ({j.pct}%)
                </span>
              </div>

              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full border border-border bg-surface text-text-muted">
                {j.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* PHASE D: JUDGE DOSSIER MODAL / SLIDE-OVER */}
      {selectedDossierSubId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border border-border rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scale-up">
            {/* Modal Header */}
            <div className="p-6 border-b border-border flex items-center justify-between bg-fill/40">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-accent-violet/15 text-accent-violet">
                  <Award size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-text-primary">
                    Evidence-Backed Judge Dossier
                  </h2>
                  <p className="text-xs text-text-muted">
                    Official 1-Page Evaluation Packet · Powered by Amazon Nova Pro
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDossierSubId(null)}
                className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-fill transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {dossierLoading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3 text-text-muted">
                  <Loader2 size={32} className="animate-spin text-accent-violet" />
                  <p className="text-sm font-medium">Generating Evidence-Backed Judge Dossier via Bedrock...</p>
                  <p className="text-xs text-text-muted">Analyzing problem fit, technical depth, and extracting citations...</p>
                </div>
              ) : dossierError ? (
                <div className="p-4 rounded-2xl bg-accent-red/10 border border-accent-red/20 text-accent-red text-sm space-y-2">
                  <div className="font-semibold flex items-center gap-1.5">
                    <AlertTriangle size={16} /> Error
                  </div>
                  <p>{dossierError}</p>
                </div>
              ) : activeDossier ? (
                <div className="space-y-6">
                  {/* Summary & Score Header */}
                  <div className="p-5 rounded-2xl bg-fill/50 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="text-xs font-mono text-accent-violet uppercase tracking-wider">
                        {activeDossier.domain_cluster || "Hackathon Project"} · {activeDossier.team_name}
                      </div>
                      <h3 className="text-xl font-bold text-text-primary">
                        {activeDossier.title}
                      </h3>
                      <p className="text-sm text-text-primary/80 italic pt-1">
                        &ldquo;{activeDossier.one_sentence_summary}&rdquo;
                      </p>
                    </div>
                    <div className="flex sm:flex-col items-center justify-center p-3 rounded-2xl bg-surface border border-border shrink-0 min-w-28 text-center">
                      <div className={`text-3xl font-mono font-bold ${
                        activeDossier.overall_score >= 80 ? "text-accent-green" :
                        activeDossier.overall_score >= 60 ? "text-accent-amber" : "text-accent-red"
                      }`}>
                        {activeDossier.overall_score}
                      </div>
                      <div className="text-[11px] font-mono text-text-muted uppercase tracking-wider">
                        Composite Score
                      </div>
                    </div>
                  </div>

                  {/* 5-Criterion Evidence-Backed Rubric */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-mono font-semibold text-accent-violet uppercase tracking-wider">
                      <Award size={14} />
                      <span>5-Dimensional Evidence-Backed Rubric</span>
                    </div>

                    <div className="space-y-3">
                      {activeDossier.rubric.map((crit, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-2xl bg-fill/30 border border-border/70 space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-semibold text-sm text-text-primary flex items-center gap-2">
                              <span>{crit.name}</span>
                              <span className="text-[10px] font-mono text-text-muted">
                                ({Math.round(crit.weight * 100)}% weight)
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-bold text-accent-violet">
                                {crit.score} / 10
                              </span>
                            </div>
                          </div>

                          <div className="h-1.5 bg-border/60 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-accent-violet transition-all"
                              style={{ width: `${crit.score * 10}%` }}
                            />
                          </div>

                          {/* Cited Evidence */}
                          {crit.evidence && crit.evidence.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {crit.evidence.map((ev, evIdx) => (
                                <span
                                  key={evIdx}
                                  className="text-[11px] font-mono px-2 py-0.5 rounded-lg bg-surface border border-border text-text-primary/90 flex items-center gap-1"
                                >
                                  <span className="text-accent-violet">&ldquo;</span>
                                  <span>{ev}</span>
                                  <span className="text-accent-violet">&rdquo;</span>
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Judge Evaluation */}
                          <p className="text-xs text-text-muted leading-relaxed pt-0.5">
                            {crit.evaluation}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Strengths & Risks */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Strengths */}
                    <div className="p-4 rounded-2xl bg-accent-green/5 border border-accent-green/20 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-accent-green uppercase tracking-wider">
                        <TrendingUp size={13} />
                        <span>Standout Strengths</span>
                      </div>
                      <ul className="space-y-1.5">
                        {activeDossier.standout_strengths.map((str, idx) => (
                          <li key={idx} className="text-xs text-text-primary flex items-start gap-1.5">
                            <span className="text-accent-green">✓</span>
                            <span>{str}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Critical Risks */}
                    <div className="p-4 rounded-2xl bg-accent-amber/5 border border-accent-amber/20 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-accent-amber uppercase tracking-wider">
                        <ShieldAlert size={13} />
                        <span>Critical Risks &amp; Blindspots</span>
                      </div>
                      <ul className="space-y-1.5">
                        {activeDossier.critical_risks.map((risk, idx) => (
                          <li key={idx} className="text-xs text-text-primary flex items-start gap-1.5">
                            <span className="text-accent-amber">!</span>
                            <span>{risk}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Differentiating Factors */}
                  {activeDossier.differentiating_factors && activeDossier.differentiating_factors.length > 0 && (
                    <div className="p-4 rounded-2xl bg-accent-violet/5 border border-accent-violet/20 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-accent-violet uppercase tracking-wider">
                        <Layers size={13} />
                        <span>Cluster Differentiators</span>
                      </div>
                      <ul className="space-y-1 text-xs text-text-primary">
                        {activeDossier.differentiating_factors.map((df, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-accent-violet">◆</span>
                            <span>{df}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Live Demo Judge Questions */}
                  {activeDossier.judge_questions && activeDossier.judge_questions.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-xs font-mono font-semibold text-accent-violet uppercase tracking-wider">
                        <HelpCircle size={14} />
                        <span>Targeted Live Demo Questions (for Judges)</span>
                      </div>

                      <div className="space-y-3">
                        {activeDossier.judge_questions.map((q, idx) => (
                          <div
                            key={idx}
                            className="p-4 rounded-2xl bg-fill/40 border border-border space-y-2 text-xs"
                          >
                            <div className="font-semibold text-sm text-text-primary">
                              Q{idx + 1}: {q.question}
                            </div>
                            <div className="text-text-muted italic">
                              Intent: {q.intent}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                              <div className="p-2.5 rounded-xl bg-accent-green/5 border border-accent-green/15 text-[11px]">
                                <div className="font-semibold text-accent-green mb-1 flex items-center gap-1">
                                  <span>Green Flags</span>
                                </div>
                                <ul className="space-y-0.5 text-text-muted">
                                  {q.expected_signals.map((sig, sIdx) => (
                                    <li key={sIdx}>• {sig}</li>
                                  ))}
                                </ul>
                              </div>
                              <div className="p-2.5 rounded-xl bg-accent-red/5 border border-accent-red/15 text-[11px]">
                                <div className="font-semibold text-accent-red mb-1 flex items-center gap-1">
                                  <span>Red Flags</span>
                                </div>
                                <ul className="space-y-0.5 text-text-muted">
                                  {q.red_flags.map((rf, rIdx) => (
                                    <li key={rIdx}>• {rf}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border flex items-center justify-between bg-fill/30">
              <span className="text-xs text-text-muted font-mono">
                {activeDossier?.created_at ? `Evaluated: ${new Date(activeDossier.created_at).toLocaleTimeString()}` : ""}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRegenerateDossier}
                  disabled={dossierLoading}
                  className="px-3.5 py-2 rounded-xl bg-fill hover:bg-border text-text-primary text-xs font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw size={12} className={dossierLoading ? "animate-spin" : ""} />
                  <span>Regenerate with Bedrock</span>
                </button>
                <button
                  onClick={() => setSelectedDossierSubId(null)}
                  className="px-4 py-2 rounded-xl bg-accent-violet text-white text-xs font-semibold hover:bg-accent-violet/85 transition-colors"
                >
                  Close Dossier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
