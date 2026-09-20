// Typed API Client for HackPilot

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export interface ApiError {
  code: string;
  message: string;
}

export interface HealthResponse {
  status: string;
  provider: string;
  version: string;
  service: string;
}

export interface Quest {
  id: string;
  title: string;
  why_it_matters: string;
  suggested_fix: string;
  xp_reward: number;
  completed?: boolean;
}

export interface DimensionScore {
  score: number;
  evidence: string[];
  verdict: string;
}

export interface AbstractAnalysisResponse {
  id: string;
  overall_score: number;
  scores: {
    clarity: DimensionScore;
    completeness: DimensionScore;
    structure: DimensionScore;
    technical_depth: DimensionScore;
    impact: DimensionScore;
  };
  strengths: string[];
  weaknesses: Quest[];
  score_delta?: number;
  submission_id?: string;
  one_sentence_verdict: string;
  created_at: string;
}

export interface ProblemClarifyingQuestion {
  question: string;
  intent: string;
}

export interface ProblemExplainResponse {
  plain_english_summary: string;
  requirements: {
    must_have: string[];
    should_have: string[];
  };
  constraints: string[];
  hidden_criteria: string[];
  clarifying_questions: ProblemClarifyingQuestion[];
  ambiguities: string[];
}

export interface ProblemAskResponse {
  question: string;
  answer: string;
  is_covered: boolean;
  cited_phrases: string[];
}

export type RedTeamIntensity = "friendly" | "fair" | "ruthless";

export interface AttackVector {
  id: string;
  domain: string;
  title: string;
  severity: "low" | "medium" | "high" | "critical";
  scenario: string;
  typical_mitigation: string;
}

export interface RedTeamAttackResponse {
  battle_id: string;
  attacks: AttackVector[];
  initial_hp: number;
  intensity: RedTeamIntensity;
}

export interface RedTeamDefendResponse {
  attack_id: string;
  rating: number; // 0 to 10
  feedback: string;
  mitigation_points: string[];
  hp_change: number;
  current_hp: number;
  xp_result: GamificationResult;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  unlocked: boolean;
  unlocked_at?: string;
  icon: string;
}

export interface ProfileResponse {
  id: string;
  user_id?: string | null;
  level: number;
  total_xp: number;
  current_level_xp: number;
  next_level_xp: number;
  progress_percent: number;
  streak_days: number;
  badges: Badge[];
  quests_completed: number;
}

export interface GamificationResult {
  xp_gained: number;
  new_total: number;
  level_up: boolean;
  new_level?: number;
  badges_unlocked: Badge[];
}

export interface Submission {
  id: string;
  title: string;
  team_name?: string | null;
  problem_statement?: string | null;
  abstract: string;
  problem_statement_id?: string | null;
  status?: string;
  domain_cluster?: string | null;
  embedding_status?: string;
  similarity_status?: string;
  created_at: string;
  latest_scores?: Record<string, number>;
  latest_analysis_id?: string | null;
  user_id?: string | null;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorDetail = "An unexpected error occurred.";
    try {
      const data = await res.json();
      if (data.error && data.error.message) {
        errorDetail = data.error.message;
      } else if (data.detail) {
        errorDetail = typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail);
      }
    } catch {
      errorDetail = `Server responded with status ${res.status}: ${res.statusText}`;
    }
    throw new Error(errorDetail);
  }
  return res.json();
}

export interface ClusterSubmissionItem {
  id: string;
  title: string;
  team_name: string;
  score?: number | null;
  domain_cluster?: string | null;
}

export interface ClusterItem {
  id: number;
  name: string;
  count: number;
  dossier: string;
  submissions: ClusterSubmissionItem[];
}

export interface ClusterManifest {
  k: number;
  clusters: ClusterItem[];
  unembedded_count: number;
  embed_stats?: {
    total: number;
    succeeded: number;
    failed: number;
    skipped: number;
  };
}

export interface RubricCriterion {
  name: string;
  score: number;
  weight: number;
  evidence: string[];
  evaluation: string;
}

export interface JudgeQuestion {
  question: string;
  intent: string;
  expected_signals: string[];
  red_flags: string[];
}

export interface JudgeDossierResponse {
  submission_id: string;
  title: string;
  team_name: string;
  domain_cluster?: string | null;
  created_at: string;
  one_sentence_summary: string;
  overall_score: number;
  rubric: RubricCriterion[];
  standout_strengths: string[];
  critical_risks: string[];
  differentiating_factors: string[];
  judge_questions: JudgeQuestion[];
}

export interface OrganizerSubmissionItem {
  id: string;
  title: string;
  team_name: string;
  abstract_snippet: string;
  status: string;
  domain_cluster?: string | null;
  embedding_status?: string;
  similarity_status?: string;
  score?: number | null;
  has_judge_dossier?: boolean;
  created_at: string;
}

export type JudgePersonaType = "architect" | "investor" | "domain_expert";

export interface JudgeDialogueTurn {
  turn_index: number;
  speaker: "judge" | "participant";
  content: string;
  score?: number | null;
  feedback?: string | null;
}

export interface SimulatorSessionStartResponse {
  session_id: string;
  persona: JudgePersonaType;
  persona_name: string;
  persona_title: string;
  opening_question: string;
  question_intent: string;
  turn_index: number;
}

export interface SimulatorRespondResponse {
  session_id: string;
  turn_index: number;
  score: number;
  feedback: string;
  mitigation_points: string[];
  followup_question?: string | null;
  is_concluded: boolean;
  final_verdict?: string | null;
  composite_score?: number | null;
  xp_awarded: number;
  gamification?: GamificationResult | null;
}

export const api = {
  async getHealth(): Promise<HealthResponse> {
    const res = await fetch(`${API_BASE_URL}/health`);
    return handleResponse<HealthResponse>(res);
  },

  async analyzeAbstract(payload: {
    abstract: string;
    submission_id?: string;
    previous_analysis_id?: string;
  }): Promise<AbstractAnalysisResponse & { gamification?: GamificationResult }> {
    const res = await fetch(`${API_BASE_URL}/abstract/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async explainProblem(problem_statement: string): Promise<ProblemExplainResponse> {
    const res = await fetch(`${API_BASE_URL}/problem/explain`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ problem_statement }),
    });
    return handleResponse(res);
  },

  async askProblemQuestion(problem_statement: string, question: string): Promise<ProblemAskResponse> {
    const res = await fetch(`${API_BASE_URL}/problem/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ problem_statement, question }),
    });
    return handleResponse(res);
  },

  async redTeamAttack(idea: string, intensity: RedTeamIntensity = "fair"): Promise<RedTeamAttackResponse> {
    const res = await fetch(`${API_BASE_URL}/redteam/attack`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idea, intensity }),
    });
    return handleResponse(res);
  },

  async redTeamDefend(payload: {
    attack_id: string;
    defense: string;
    idea?: string;
    battle_id?: string;
    current_hp?: number;
  }): Promise<RedTeamDefendResponse> {
    const res = await fetch(`${API_BASE_URL}/redteam/defend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async getProfile(): Promise<ProfileResponse> {
    const res = await fetch(`${API_BASE_URL}/profile`);
    return handleResponse(res);
  },

  async completeQuest(quest_id: string): Promise<GamificationResult> {
    const res = await fetch(`${API_BASE_URL}/quests/${quest_id}/complete`, {
      method: "POST",
    });
    return handleResponse(res);
  },

  async getSubmissions(): Promise<Submission[]> {
    const res = await fetch(`${API_BASE_URL}/submissions`);
    return handleResponse(res);
  },

  async createSubmission(payload: {
    title: string;
    abstract: string;
    team_name?: string;
    problem_statement?: string;
    problem_statement_id?: string;
  }): Promise<Submission> {
    const res = await fetch(`${API_BASE_URL}/submissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async getClusters(): Promise<ClusterManifest> {
    const res = await fetch(`${API_BASE_URL}/organizer/clusters`);
    return handleResponse<ClusterManifest>(res);
  },

  async embedAllSubmissions(): Promise<{ message: string; stats: Record<string, unknown> }> {
    const res = await fetch(`${API_BASE_URL}/organizer/embed-all`, {
      method: "POST",
    });
    return handleResponse(res);
  },

  async getOrganizerSubmissions(): Promise<OrganizerSubmissionItem[]> {
    const res = await fetch(`${API_BASE_URL}/organizer/submissions`);
    return handleResponse<OrganizerSubmissionItem[]>(res);
  },

  async getJudgeDossier(submissionId: string): Promise<JudgeDossierResponse> {
    const res = await fetch(`${API_BASE_URL}/submissions/${submissionId}/judge-dossier`);
    return handleResponse<JudgeDossierResponse>(res);
  },

  async generateJudgeDossier(submissionId: string): Promise<JudgeDossierResponse> {
    const res = await fetch(`${API_BASE_URL}/submissions/${submissionId}/judge-dossier`, {
      method: "POST",
    });
    return handleResponse<JudgeDossierResponse>(res);
  },

  async startJudgeSession(payload: {
    submission_id?: string;
    title?: string;
    abstract?: string;
    problem_statement?: string;
    persona?: JudgePersonaType;
  }): Promise<SimulatorSessionStartResponse> {
    const res = await fetch(`${API_BASE_URL}/judge/session/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleResponse<SimulatorSessionStartResponse>(res);
  },

  async respondJudgeSession(payload: {
    session_id: string;
    persona?: JudgePersonaType;
    answer: string;
    history: JudgeDialogueTurn[];
    abstract_context?: string;
  }): Promise<SimulatorRespondResponse> {
    const res = await fetch(`${API_BASE_URL}/judge/session/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleResponse<SimulatorRespondResponse>(res);
  },

  subscribeStream(
    job_id: string,
    onToken: (token: string) => void,
    onComplete: () => void,
    onError: (err: unknown) => void
  ): () => void {
    const eventSource = new EventSource(`${API_BASE_URL}/stream/${job_id}`);
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.token) {
          onToken(data.token);
        }
        if (data.done) {
          eventSource.close();
          onComplete();
        }
      } catch {
        onToken(event.data);
      }
    };

    eventSource.onerror = (err) => {
      eventSource.close();
      onError(err);
    };

    return () => {
      eventSource.close();
    };
  },

  async analyzeDuel(payload: DuelRequest): Promise<DuelResponse> {
    const res = await fetch(`${API_BASE_URL}/duel/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleResponse<DuelResponse>(res);
  },

  async evaluateRapidFire(payload: RapidFireEvaluateRequest): Promise<RapidFireResponse> {
    const res = await fetch(`${API_BASE_URL}/rapid-fire/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleResponse<RapidFireResponse>(res);
  },

  async uploadAndAnalyzePitchDeck(formData: FormData): Promise<PitchDeckResponse> {
    const res = await fetch(`${API_BASE_URL}/pitch-deck/analyze`, {
      method: "POST",
      body: formData,
    });
    return handleResponse<PitchDeckResponse>(res);
  },

  async getPitchDeck(deckId: string): Promise<PitchDeckResponse> {
    const res = await fetch(`${API_BASE_URL}/pitch-deck/${deckId}`);
    return handleResponse<PitchDeckResponse>(res);
  },

  async getPitchDeckBySubmission(submissionId: string): Promise<PitchDeckResponse> {
    const res = await fetch(`${API_BASE_URL}/pitch-deck/submission/${submissionId}`);
    return handleResponse<PitchDeckResponse>(res);
  }
};

// ─── Idea Duel Types ─────────────────────────────────────────────────────────
export interface IdeaInput {
  title: string;
  description: string;
  tech_stack?: string;
  target_users?: string;
}

export interface DuelRequest {
  idea_a: IdeaInput;
  idea_b: IdeaInput;
  problem_statement?: string;
  submission_id?: string;
}

export interface IdeaEvaluation {
  strengths: string[];
  risks: string[];
  differentiation_signals: string[];
  judge_questions: string[];
}

export interface DimensionComparison {
  trade_offs: string[];
  stronger_evidence_needed: string[];
  primary_risks: string[];
  area_requiring_validation: string[];
}

export interface ComparisonSummary {
  problem_strength: DimensionComparison;
  differentiation: DimensionComparison;
  technical_feasibility: DimensionComparison;
  impact: DimensionComparison;
}

export interface DuelAnalysisOutput {
  idea_a: IdeaEvaluation;
  idea_b: IdeaEvaluation;
  comparison: ComparisonSummary;
  shared_risks: string[];
  improvement_opportunities: string[];
}

export interface DuelResponse {
  duel_id: string;
  analysis: DuelAnalysisOutput;
  gamification?: GamificationResult | null;
  created_at: string;
}

// ─── Rapid Fire Types ────────────────────────────────────────────────────────
export interface RapidFireEvaluateRequest {
  pitch_text: string;
  submission_id?: string;
  project_title?: string;
  abstract_context?: string;
  time_taken_seconds?: number;
}

export interface RapidFireScores {
  problem_clarity: number;
  solution_clarity: number;
  differentiation: number;
  technical_explanation: number;
  impact: number;
  conciseness: number;
  judge_readiness: number;
}

export interface RapidFireAnalysisOutput {
  scores: RapidFireScores;
  strengths: string[];
  weaknesses: string[];
  specific_improvements: string[];
  suggested_revised_opening: string;
  suggested_revised_closing: string;
}

export interface RapidFireResponse {
  session_id: string;
  pitch_text: string;
  time_taken_seconds: number;
  analysis: RapidFireAnalysisOutput;
  gamification?: GamificationResult | null;
  created_at: string;
}

// ─── Pitch Deck Analyzer Types ───────────────────────────────────────────────
export interface SlideAnalysis {
  slide_number: number;
  slide_title: string;
  purpose: string;
  clarity: string;
  problem_communication?: string | null;
  solution_communication?: string | null;
  technical_explanation?: string | null;
  information_density: string;
  missing_information?: string | null;
  potential_judge_questions: string[];
  improvement_suggestions: string[];
}

export interface EvidenceGap {
  claim: string;
  evidence_found: string;
  status: string;
  recommendation: string;
}

export interface CategorizedJudgeQuestions {
  technical: string[];
  product: string[];
  impact: string[];
  innovation: string[];
  aws: string[];
  feasibility: string[];
  scalability: string[];
}

export interface PrioritizedRecommendations {
  high_priority: string[];
  medium_priority: string[];
  low_priority: string[];
}

export interface DeckCategoryScores {
  problem_and_impact: number;
  innovation: number;
  technical_implementation: number;
  aws_usage: number;
  feasibility: number;
  presentation_readiness: number;
}

export interface DeckAnalysisOutput {
  slide_analyses: SlideAnalysis[];
  problem_summary: string;
  solution_summary: string;
  innovation_summary: string;
  technical_summary: string;
  aws_usage_summary: string;
  presentation_quality: string;
  evidence_gaps: EvidenceGap[];
  judge_questions: CategorizedJudgeQuestions;
  recommendations: PrioritizedRecommendations;
  category_scores: DeckCategoryScores;
}

export interface PitchDeckResponse {
  deck_id: string;
  submission_id?: string | null;
  file_name: string;
  s3_key: string;
  page_count: number;
  analysis: DeckAnalysisOutput;
  gamification?: GamificationResult | null;
  created_at: string;
}
