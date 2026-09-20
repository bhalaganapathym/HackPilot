import asyncio
import hashlib
import random
import re
from typing import TypeVar, Type, AsyncGenerator, List, Dict, Any
from pydantic import BaseModel, ValidationError

from app.ai.base import AIProvider
from app.schemas.abstract import (
    AbstractAnalysisOutput,
    ScoresDict,
    DimensionScore,
    QuestSchema,
)
from app.schemas.problem import (
    ProblemExplainOutput,
    ProblemRequirements,
    ProblemClarifyingQuestion,
    ProblemAskOutput,
)
from app.schemas.redteam import (
    AttackVector,
    IntensityType,
    SeverityType,
)

T = TypeVar("T", bound=BaseModel)

class MockProvider(AIProvider):
    """Deterministic, input-aware Mock AI Provider.
    
    Generates intelligent heuristic-driven analyses seeded by SHA-256
    hash of the input text, simulating 300-1200ms latency.
    """

    def _get_seeded_random(self, text: str) -> random.Random:
        seed_int = int(hashlib.sha256(text.encode("utf-8")).hexdigest()[:8], 16)
        return random.Random(seed_int)

    async def _simulate_latency(self, rng: random.Random):
        delay = rng.uniform(0.3, 0.8) # 300ms to 800ms
        await asyncio.sleep(delay)

    async def generate_json(
        self,
        feature: str,
        system_prompt: str,
        user_text: str,
        schema: Type[T]
    ) -> T:
        rng = self._get_seeded_random(f"{feature}:{user_text}")
        await self._simulate_latency(rng)

        # Retry once on validation failure logic
        last_error = None
        for attempt in range(2):
            try:
                if feature == "abstract_analyzer":
                    raw_dict = self._analyze_abstract(user_text, rng)
                elif feature == "problem_explainer":
                    raw_dict = self._explain_problem(user_text, rng)
                elif feature == "problem_qa":
                    # user_text expected in format "statement|||question"
                    parts = user_text.split("|||")
                    statement = parts[0]
                    question = parts[1] if len(parts) > 1 else ""
                    raw_dict = self._answer_question(statement, question, rng)
                elif feature == "red_team_attacks":
                    # user_text expected in format "intensity|||idea"
                    parts = user_text.split("|||")
                    intensity = parts[0] if len(parts) > 1 else "fair"
                    idea = parts[1] if len(parts) > 1 else user_text
                    raw_dict = self._generate_attacks(idea, intensity, rng)
                elif feature == "red_team_defend":
                    # user_text expected in format "attack_data|||defense"
                    parts = user_text.split("|||")
                    attack_context = parts[0]
                    defense = parts[1] if len(parts) > 1 else ""
                    raw_dict = {
                        "attack_id": "mock-attack-1",
                        "rating": 8,
                        "feedback": "Strong mitigation strategy demonstrating defense-in-depth.",
                        "mitigation_points": ["Multi-sig authentication", "Automated anomaly failover"],
                        "hp_change": 5,
                    }
                elif feature == "cluster_naming":
                    raw_dict = {"domain_label": "Developer Tools & AI Infrastructure"}
                elif feature == "cluster_dossier":
                    raw_dict = {
                        "common_theme": "Projects in this cluster focus on developer velocity and automation.",
                        "differentiators": [
                            "Diverse architectural approaches ranging from AST transforms to neural static analysis.",
                            "Varied integration points across the development lifecycle.",
                        ],
                        "dossier_text": "Projects in this cluster focus on developer velocity and automation. The key differentiator is the architectural balance between client-side intelligence and cloud backend processing."
                    }
                elif feature == "judge_dossier":
                    raw_dict = {
                        "one_sentence_summary": "An automated AI hackathon co-pilot providing multi-dimensional pitch analysis and intelligent judging dossier generation.",
                        "overall_score": 84,
                        "rubric": [
                            {
                                "name": "Problem-Solution Fit & Relevance",
                                "score": 9,
                                "weight": 0.20,
                                "evidence": ["real-time hackathon co-pilot", "optimize pitches"],
                                "evaluation": "Directly targets hackathon participant anxiety and organizer fatigue with high contextual alignment."
                            },
                            {
                                "name": "Technical Depth & Feasibility",
                                "score": 8,
                                "weight": 0.25,
                                "evidence": ["FastAPI and React", "AWS Titan Text Embeddings V2"],
                                "evaluation": "Solid full-stack architecture leveraging production AWS Bedrock Foundation Models and Scikit-learn."
                            },
                            {
                                "name": "Novelty & Differentiation",
                                "score": 9,
                                "weight": 0.20,
                                "evidence": ["two-sided hackathon intelligence", "anti-burnout allocation"],
                                "evaluation": "Distinct two-sided approach providing value to both hackathon builders and organizer panels."
                            },
                            {
                                "name": "Architecture & Engineering Rigor",
                                "score": 8,
                                "weight": 0.20,
                                "evidence": ["dual persistence", "DynamoDB single-table"],
                                "evaluation": "Clean decoupled repository layer with automated fallback from SQLite to DynamoDB."
                            },
                            {
                                "name": "Real-World Impact & Viability",
                                "score": 8,
                                "weight": 0.15,
                                "evidence": ["reducing judging latency", "automated evaluation pipeline"],
                                "evaluation": "Immediate utility in large-scale hackathons, reducing organizer bottleneck and judge fatigue."
                            }
                        ],
                        "standout_strengths": [
                            "Two-sided platform serving both participant preparation and organizer judging workflows.",
                            "Evidence-backed evaluation with direct excerpt citation.",
                            "Deterministic fallback mode paired with live Bedrock Nova Pro integration."
                        ],
                        "critical_risks": [
                            "Reliance on Bedrock API quotas during high-concurrency hackathon judging surges.",
                            "Need for domain-specific rubric customization across diverse hackathon themes."
                        ],
                        "differentiating_factors": [
                            "Combines participant pitch refinement with automated organizer intelligence.",
                            "Provides actionable quest gamification rather than generic advisory text."
                        ],
                        "judge_questions": [
                            {
                                "question": "How do you handle API throttling or latency spikes when 200 participants submit within the final 10 minutes of the hackathon?",
                                "intent": "Probe architectural resilience and async ingestion queueing under peak load.",
                                "expected_signals": [
                                    "Mentions non-blocking BackgroundTasks and decoupled embedding workers.",
                                    "Understands token caching and rate-limiting fallbacks."
                                ],
                                "red_flags": [
                                    "Assumes synchronous API calls will scale linearly.",
                                    "No plan for handling Bedrock 429 TooManyRequests exceptions."
                                ]
                            },
                            {
                                "question": "How do you prevent hallucinations when extracting evidence quotes from participant abstracts?",
                                "intent": "Verify grounding mechanisms and schema constraint adherence in LLM outputs.",
                                "expected_signals": [
                                    "References strict JSON schema validation and prompt-level grounding constraints.",
                                    "String matching verification between citations and original submission text."
                                ],
                                "red_flags": [
                                    "Claims LLMs inherently never invent text when citing."
                                ]
                            }
                        ]
                    }
                elif feature == "judge_simulator_start":
                    raw_dict = {
                        "opening_question": "How does your architecture handle sudden concurrent submission surges without hitting Bedrock rate limits or dropping telemetry?",
                        "question_intent": "Assess cloud scalability, async queueing, and rate limit resilience."
                    }
                elif feature == "judge_simulator_respond":
                    # Check if final round from user text
                    is_concluded = "final round (round 3)" in user_text
                    raw_dict = {
                        "score": 8,
                        "feedback": "Strong architectural response referencing non-blocking background workers and token bucket rate limiters. Good understanding of failure recovery.",
                        "mitigation_points": [
                            "Be ready to mention specific AWS CloudWatch metrics you monitor during demo day.",
                            "Quantify your maximum sustained transactions per second."
                        ],
                        "followup_question": "What is your fallback degradation strategy if DynamoDB write throughput exceeds provisioned limits?" if not is_concluded else None,
                        "is_concluded": is_concluded,
                        "final_verdict": "Demonstrates strong technical command of distributed systems and AWS serverless boundaries. Ready for live panel demo day." if is_concluded else None,
                        "composite_score": 88 if is_concluded else None,
                    }
                else:
                    raise ValueError(f"Unknown feature: {feature}")

                return schema.model_validate(raw_dict)
            except ValidationError as ve:
                last_error = ve
                continue

        raise RuntimeError(f"Failed to generate valid output for {feature}: {last_error}")

    async def stream_text(
        self,
        job_id: str,
        feature: str,
        user_text: str
    ) -> AsyncGenerator[str, None]:
        """Stream token-by-token 'thinking' text narration for the AI Thinking Panel."""
        rng = self._get_seeded_random(f"stream:{feature}:{user_text}")
        
        narrations = {
            "abstract_analyzer": [
                "Scanning abstract structure and sentence pacing...",
                "Evaluating problem definition vs buzzword density...",
                "Detecting tech stack feasibility and quantifiable metrics...",
                "Formulating weakness quests and cited scoring evidence...",
                "Finalizing dimension scores and delta calculations..."
            ],
            "problem_explainer": [
                "Dissecting problem statement syntax...",
                "Extracting mandatory technical requirements...",
                "Identifying hidden jury evaluation criteria...",
                "Uncovering architectural ambiguities and edge cases...",
                "Synthesizing plain-English translation and clarifying questions..."
            ],
            "red_team": [
                "Scanning architecture for single points of failure...",
                "Stress-testing scalability under peak concurrency...",
                "Auditing attack vectors across 7 vulnerability domains...",
                "Calibrating attack severity based on project intensity...",
                "Priming the arena for defensive rebuttals..."
            ]
        }

        tokens = narrations.get(feature, [
            "Analyzing submission...",
            "Consulting evaluation heuristics...",
            "Synthesizing structured verdict..."
        ])

        for phrase in tokens:
            words = phrase.split(" ")
            for word in words:
                yield word + " "
                await asyncio.sleep(rng.uniform(0.04, 0.09))
            yield "\n"
            await asyncio.sleep(rng.uniform(0.1, 0.2))

    # --- Heuristic Implementations ---

    def _analyze_abstract(self, text: str, rng: random.Random) -> Dict[str, Any]:
        words = text.split()
        word_count = len(words)
        sentences = [s.strip() for s in re.split(r'[.!?]+', text) if s.strip()]
        avg_sentence_len = word_count / max(len(sentences), 1)

        lower_text = text.lower()

        # Buzzword density check
        buzzwords = ["revolutionary", "ai-powered", "seamless", "cutting-edge", "game-changing", "disruptive", "next-gen", "ultra"]
        found_buzzwords = [b for b in buzzwords if b in lower_text]
        buzzword_penalty = min(len(found_buzzwords) * 2, 4)

        # Keyword categories
        has_problem = any(w in lower_text for w in ["problem", "challenge", "struggle", "pain", "lack", "inefficient", "issue", "friction"])
        has_solution = any(w in lower_text for w in ["solution", "platform", "system", "tool", "app", "service", "engine", "hackpilot"])
        has_user = any(w in lower_text for w in ["user", "customer", "participant", "developer", "student", "organizer", "team", "audience"])
        has_tech = any(w in lower_text for w in ["api", "fastapi", "react", "next.js", "sqlite", "python", "aws", "docker", "llm", "bedrock", "architecture", "database"])
        has_metrics = any(re.search(r'\b(\d+%|\d+x|\$\d+|\d+\s*(ms|seconds|minutes|hours|users))\b', lower_text) is not None for _ in [1]) or any(w in lower_text for w in ["reduce", "increase", "improve", "save", "metric"])
        has_diff = any(w in lower_text for w in ["unlike", "different", "novel", "first", "alternative", "competitive", "advantage", "unique"])

        # Clarity (0-10)
        clarity_score = 6
        clarity_evidence = []
        if avg_sentence_len > 25:
            clarity_score -= 2
        elif 10 <= avg_sentence_len <= 20:
            clarity_score += 2
        if buzzword_penalty > 0:
            clarity_score = max(3, clarity_score - 1)
            clarity_evidence.append(f"Buzzword usage detected: {', '.join(found_buzzwords[:2])}")
        if sentences:
            clarity_evidence.append(f'"{sentences[0][:60]}..." sets the initial tone')
        clarity_score = max(2, min(10, clarity_score + rng.randint(-1, 1)))

        # Completeness (0-10)
        comp_count = sum([has_problem, has_solution, has_user, has_tech, has_metrics])
        completeness_score = max(3, min(10, int((comp_count / 5.0) * 8) + 2))
        completeness_evidence = []
        if has_problem:
            completeness_evidence.append("Identifies clear problem context")
        if has_tech:
            completeness_evidence.append("Mentions explicit technology components")
        if not has_user:
            completeness_evidence.append("Target persona is not explicitly specified")

        # Structure (0-10)
        structure_score = 7
        structure_evidence = []
        if len(sentences) >= 4:
            structure_score += 2
            structure_evidence.append(f"Balanced structure with {len(sentences)} distinct sentences")
        elif len(sentences) <= 2:
            structure_score -= 3
            structure_evidence.append("Abstract is too brief or lacks paragraph transitions")
        structure_score = max(2, min(10, structure_score))

        # Technical Depth (0-10)
        tech_score = 5
        tech_evidence = []
        if has_tech:
            tech_score += 3
            matched_tech = [t for t in ["fastapi", "react", "next.js", "sqlite", "python", "aws", "docker", "llm", "bedrock"] if t in lower_text]
            if matched_tech:
                tech_evidence.append(f"Specifies architecture stack: {', '.join(matched_tech[:3])}")
            else:
                tech_evidence.append("Mentions architectural concepts")
        else:
            tech_score -= 2
            tech_evidence.append("No technical stack, APIs, or database architecture stated")
        tech_score = max(1, min(10, tech_score + rng.randint(-1, 1)))

        # Impact (0-10)
        impact_score = 5
        impact_evidence = []
        if has_metrics:
            impact_score += 3
            impact_evidence.append("Quantifies target impact or efficiency gains")
        else:
            impact_score -= 2
            impact_evidence.append("Lacks quantifiable benchmarks or measurable outcomes")
        if has_diff:
            impact_score += 1
            impact_evidence.append("Articulates competitive differentiation")
        impact_score = max(1, min(10, impact_score + rng.randint(-1, 1)))

        # Overall Score (0-100)
        overall = int((clarity_score + completeness_score + structure_score + tech_score + impact_score) * 2)
        overall = max(15, min(98, overall))

        # Strengths
        strengths = []
        if has_problem and sentences:
            strengths.append(f'Clear problem anchor: "{sentences[0][:70]}"')
        if has_tech:
            strengths.append("Concrete technical specifications ground the implementation feasibility.")
        if structure_score >= 7:
            strengths.append("Logical narrative flow from problem diagnosis to solution.")
        if not strengths:
            strengths.append("Addresses a relevant hackathon domain challenge.")

        # Weaknesses as Quests
        weaknesses: List[Dict[str, Any]] = []
        quest_counter = 1

        if not has_user:
            weaknesses.append({
                "id": f"quest-{quest_counter}",
                "title": "Define Your Primary User Persona",
                "why_it_matters": "Judges evaluate who feels the pain immediately. Vague audiences dilute product-market fit.",
                "suggested_fix": 'Add an explicit target user sentence (e.g., "Designed specifically for hackathon organizers managing 500+ participants").',
                "xp_reward": 50,
                "completed": False
            })
            quest_counter += 1

        if not has_metrics:
            weaknesses.append({
                "id": f"quest-{quest_counter}",
                "title": "Quantify Impact with Concrete Metrics",
                "why_it_matters": "Abstract claims like 'saves time' sound generic. Judges reward measurable deltas (e.g., 'cuts triage time by 40%').",
                "suggested_fix": "Replace subjective adjectives with a measurable percentage, latency target, or time saved.",
                "xp_reward": 60,
                "completed": False
            })
            quest_counter += 1

        if found_buzzwords:
            weaknesses.append({
                "id": f"quest-{quest_counter}",
                "title": "Cut Buzzword Fluff for Technical Substance",
                "why_it_matters": f"Phrases like '{found_buzzwords[0]}' trigger skepticism from technical jury members.",
                "suggested_fix": f"Replace '{found_buzzwords[0]}' with the actual mechanism (e.g., 'event-driven pipeline' instead of 'seamless AI').",
                "xp_reward": 45,
                "completed": False
            })
            quest_counter += 1

        if not has_tech:
            weaknesses.append({
                "id": f"quest-{quest_counter}",
                "title": "Specify Your Core Architecture & Stack",
                "why_it_matters": "Hackathon judges must verify feasibility in 48 hours. A black-box pitch risks disqualification.",
                "suggested_fix": "Name your framework, database, and any AI/cloud APIs powering the core engine.",
                "xp_reward": 55,
                "completed": False
            })
            quest_counter += 1

        if len(weaknesses) < 2:
            weaknesses.append({
                "id": f"quest-{quest_counter}",
                "title": "Sharpen Competitive Differentiation",
                "why_it_matters": "Judges will ask: 'Why couldn't an existing tool or ChatGPT wrapper do this?'",
                "suggested_fix": "Add a crisp contrast sentence explaining your unique moat or specialized workflow.",
                "xp_reward": 50,
                "completed": False
            })

        # Verdict
        if overall >= 80:
            verdict = "High-impact, well-architected abstract with clear problem definition and feasible execution."
        elif overall >= 60:
            verdict = "Solid foundation with clear intent, but requires concrete user personas and quantified metrics."
        else:
            verdict = "Promising concept that currently reads too generic; anchor it with technical specifics and measurable outcomes."

        return {
            "overall_score": overall,
            "scores": {
                "clarity": {"score": clarity_score, "evidence": clarity_evidence or ["Sentence flow is readable."], "verdict": "Clear narrative progression"},
                "completeness": {"score": completeness_score, "evidence": completeness_evidence or ["Covers basic criteria."], "verdict": "Functional coverage"},
                "structure": {"score": structure_score, "evidence": structure_evidence or ["Structured in logical blocks."], "verdict": "Logical organization"},
                "technical_depth": {"score": tech_score, "evidence": tech_evidence or ["Technical elements present."], "verdict": "Architecture depth"},
                "impact": {"score": impact_score, "evidence": impact_evidence or ["Demonstrates domain relevance."], "verdict": "Projected outcome"}
            },
            "strengths": strengths,
            "weaknesses": weaknesses,
            "one_sentence_verdict": verdict
        }

    def _explain_problem(self, text: str, rng: random.Random) -> Dict[str, Any]:
        sentences = [s.strip() for s in re.split(r'[.!?\n]+', text) if len(s.strip()) > 10]
        lower = text.lower()

        # Extract requirements
        must_haves = []
        should_haves = []
        for s in sentences:
            s_low = s.lower()
            if any(k in s_low for k in ["must", "require", "mandatory", "need to", "essential", "have to"]):
                must_haves.append(s)
            elif any(k in s_low for k in ["should", "could", "bonus", "prefer", "ideally", "recommend"]):
                should_haves.append(s)

        if not must_haves and sentences:
            must_haves.append(f"Deliver a functioning prototype solving: {sentences[0]}")
            if len(sentences) > 1:
                must_haves.append(f"Address core workflow: {sentences[1]}")
        if not should_haves:
            should_haves.append("Provide intuitive onboarding and low-latency interaction.")
            should_haves.append("Include exportable analytics or telemetry for jury review.")

        # Constraints
        constraints = []
        if any(w in lower for w in ["time", "hour", "deadline", "48h", "24h"]):
            constraints.append("Strict 24-48 hour hackathon sprint timeline for working MVP.")
        if any(w in lower for w in ["privacy", "gdpr", "security", "pii"]):
            constraints.append("Zero PII leaks; local or encrypted data handling.")
        if any(w in lower for w in ["offline", "no internet", "airgap"]):
            constraints.append("Must support offline or degraded network operation.")
        if not constraints:
            constraints.append("Must be demo-ready with clean reproducible test cases.")
            constraints.append("Must operate reliably without private third-party credentials.")

        # Hidden evaluation criteria
        hidden_criteria = [
            "Cold-start latency: Judges test demos live and lose patience after 5 seconds.",
            "Edge-case grace: How gracefully the system handles malformed or empty inputs.",
            "Two-sided viability: Proving both end-user value and administrative or business observability."
        ]

        # Clarifying questions
        clarifying_questions = [
            {
                "question": "What is the expected behavior when external AI APIs experience rate limits or network timeout?",
                "intent": "Verify offline resilience and graceful degradation architecture."
            },
            {
                "question": "Are there specific sample datasets or schemas the jury will use during evaluation?",
                "intent": "Ensure schema compatibility with organizer evaluation scripts."
            },
            {
                "question": "Is multi-tenant user authentication required for Phase 1, or is anonymous session state acceptable?",
                "intent": "Scope MVP effort strictly toward core differentiator features."
            },
            {
                "question": "What constitutes a 'complete' submission: working UI, automated tests, or live deployed URL?",
                "intent": "Prioritize final sprint deliverables according to official rubric weightings."
            },
            {
                "question": "How will novelty be weighted against technical execution rigor?",
                "intent": "Balance experimental features against robust core error handling."
            }
        ]

        # Ambiguities
        ambiguities = []
        if "data" in lower and not any(w in lower for w in ["schema", "format", "json", "csv"]):
            ambiguities.append("Input data schema is unspecified (JSON, CSV, or unstructured text).")
        if "real-time" in lower and not any(w in lower for w in ["ms", "millisecond", "websocket", "sse"]):
            ambiguities.append("'Real-time' SLA is not quantitatively defined (sub-second vs sub-minute).")
        if not ambiguities:
            ambiguities.append("Evaluation weighting across novelty vs UX polish is left unquantified.")

        summary = f"This challenge requires building a reliable solution that addresses '{sentences[0] if sentences else text[:80]}'. Winning teams will focus on rock-solid core execution, clear demo flow, and transparent system state."

        return {
            "plain_english_summary": summary,
            "requirements": {
                "must_have": must_haves[:5],
                "should_have": should_haves[:4]
            },
            "constraints": constraints,
            "hidden_criteria": hidden_criteria,
            "clarifying_questions": clarifying_questions,
            "ambiguities": ambiguities
        }

    def _answer_question(self, statement: str, question: str, rng: random.Random) -> Dict[str, Any]:
        q_words = set(re.findall(r'\w+', question.lower()))
        # Filter stop words
        stop_words = {"what", "is", "the", "are", "how", "can", "we", "does", "in", "to", "for", "a", "an", "do", "of", "and"}
        keywords = [w for w in q_words if w not in stop_words and len(w) > 2]

        sentences = [s.strip() for s in re.split(r'[.!?\n]+', statement) if len(s.strip()) > 8]
        matched_sentences = []

        for s in sentences:
            s_lower = s.lower()
            overlap = sum(1 for kw in keywords if kw in s_lower)
            if overlap > 0:
                matched_sentences.append((overlap, s))

        matched_sentences.sort(key=lambda x: x[0], reverse=True)

        if matched_sentences and matched_sentences[0][0] >= 1:
            best_match = matched_sentences[0][1]
            return {
                "question": question,
                "answer": f"Based directly on the problem statement: {best_match}",
                "is_covered": True,
                "cited_phrases": [best_match]
            }
        else:
            return {
                "question": question,
                "answer": "The problem statement does not explicitly specify this detail. We recommend confirming this requirement with organizers during office hours or adopting a flexible configuration default.",
                "is_covered": False,
                "cited_phrases": []
            }

    def _generate_attacks(self, idea: str, intensity: str, rng: random.Random) -> Dict[str, Any]:
        idea_lower = idea.lower()
        
        # Domain attacks tailored to keywords
        candidate_attacks = [
            {
                "domain": "Technical Failure",
                "title": "Cascading Async Pipeline Collapse",
                "scenario": "If the upstream inference provider throttles requests or spikes to 8s latency, your background worker queue backs up and locks the entire UI session.",
                "typical_mitigation": "Implement client-side optimistic updates, circuit breakers, and deterministic fallback models."
            },
            {
                "domain": "Scalability & Latency",
                "title": "Cold-Start Concurrency Bottleneck",
                "scenario": "When 50 judges open projects simultaneously at the demo expo, unoptimized database queries and un-cached LLM prompts cause timeout cascades.",
                "typical_mitigation": "Add in-memory SQLite/Redis result caching, connection pooling, and pre-computed demo snapshots."
            },
            {
                "domain": "Privacy & Security",
                "title": "Prompt Injection & PII Leakage",
                "scenario": "A malicious user enters markdown containing prompt jailbreaks, causing the co-pilot to leak underlying judge rubrics and other team submissions.",
                "typical_mitigation": "Strict input sanitization, separate system instructions, and schema-constrained Pydantic serialization."
            },
            {
                "domain": "Market & Competition",
                "title": "Platform Commodity Vulnerability",
                "scenario": "An incumbent platform like GitHub Copilot or Devpost releases a built-in feedback tab, rendering standalone submission tools obsolete.",
                "typical_mitigation": "Focus on the two-sided organizer balancing algorithm and interactive gamified quest loops."
            },
            {
                "domain": "24-48h Feasibility",
                "title": "Scope Creep Death Spiral",
                "scenario": "Attempting to build live video processing, multi-persona voice simulators, and full AWS infrastructure in 36 hours leaves the core co-pilot half-baked.",
                "typical_mitigation": "Strict Phase 1 scoping: polish the three core text tools and mock engine to perfection first."
            },
            {
                "domain": "Edge Cases & Bad Inputs",
                "title": "Garbage Input Invalidation",
                "scenario": "A participant pastes a 3-word abstract or 10,000 characters of gibberish, causing unhandled parsing exceptions.",
                "typical_mitigation": "Validate inputs with minimum length, regex token checks, and graceful guidance states."
            },
            {
                "domain": "Ethics, Bias & Trust",
                "title": "Scoring Hallucination Disparity",
                "scenario": "The AI judge penalizes non-native English speakers for grammatical cadence rather than technical novelty and architecture.",
                "typical_mitigation": "Anchor scoring on structural completeness, technical keywords, and cited textual evidence rather than prose style."
            }
        ]

        # Keyword tailoring
        if "camera" in idea_lower or "video" in idea_lower:
            candidate_attacks.insert(0, {
                "domain": "Privacy & Security",
                "title": "Biometric Video Stream Exposure",
                "scenario": "Streaming live video feeds over unencrypted sockets exposes participant faces and confidential team pitch material.",
                "typical_mitigation": "Process frames locally via WebAssembly or enforce short-lived signed S3 upload URLs."
            })
        if "real-time" in idea_lower or "voice" in idea_lower:
            candidate_attacks.insert(0, {
                "domain": "Scalability & Latency",
                "title": "Websocket Buffer Overrun Under Jitter",
                "scenario": "Real-time audio packet drops cause severe desynchronization and robotic audio artifacts during live judge judging.",
                "typical_mitigation": "Adaptive bitrate streaming and text-based fallback synchronization."
            })

        # Intensity mix
        intensity_map = {
            "friendly": (5, ["low", "low", "medium", "medium", "high"]),
            "fair": (6, ["low", "medium", "medium", "high", "high", "critical"]),
            "ruthless": (7, ["medium", "high", "high", "critical", "critical", "critical", "high"])
        }
        count, severities = intensity_map.get(intensity, (6, ["low", "medium", "high", "critical", "medium", "high"]))

        selected = candidate_attacks[:count]
        attacks = []
        for i, atk in enumerate(selected):
            sev = severities[i] if i < len(severities) else "medium"
            attacks.append({
                "id": f"atk-{i+1}",
                "domain": atk["domain"],
                "title": atk["title"],
                "severity": sev,
                "scenario": atk["scenario"],
                "typical_mitigation": atk["typical_mitigation"]
            })

        battle_id = hashlib.sha256(f"battle:{idea}:{intensity}".encode()).hexdigest()[:12]
        return {
            "battle_id": f"battle-{battle_id}",
            "attacks": attacks,
            "initial_hp": 100,
            "intensity": intensity
        }

    def _evaluate_defense(self, attack_context: str, defense: str, rng: random.Random) -> Dict[str, Any]:
        defense_lower = defense.lower()
        defense_words = len(defense.split())

        # Rating heuristics
        has_mitigation = any(w in defense_lower for w in ["mitigat", "fallback", "cache", "sanitiz", "circuit", "queue", "isolat", "encrypt", "validat"])
        has_specifics = any(w in defense_lower for w in ["fastapi", "sqlite", "redis", "pydantic", "docker", "token", "sha", "sse", "rate limit"])
        is_dismissive = any(w in defense_lower for w in ["not a problem", "wont happen", "who cares", "easy fix", "trivial"])

        rating = 5
        if defense_words >= 25:
            rating += 2
        elif defense_words < 10:
            rating -= 2

        if has_mitigation:
            rating += 2
        if has_specifics:
            rating += 1
        if is_dismissive:
            rating = max(1, rating - 3)

        rating = max(1, min(10, rating + rng.randint(-1, 1)))

        # HP change calculation
        if rating >= 8:
            hp_change = 20
            feedback = "Exceptional defense. You articulated concrete architectural safeguards and demonstrated mature risk awareness."
        elif rating >= 5:
            hp_change = 10
            feedback = "Solid rebuttal. You acknowledged the attack vector and proposed a workable mitigation, though deeper architectural specifics would strengthen it."
        else:
            hp_change = 0
            feedback = "Defense is too generic or misses the core technical vulnerability. Be specific about fallbacks, schemas, or rate limiting."

        mitigation_points = [
            "Implement defensive input validation and explicit timeout bounds.",
            "Establish graceful degradation paths with local offline caches."
        ]

        return {
            "attack_id": attack_context[:10],
            "rating": rating,
            "feedback": feedback,
            "mitigation_points": mitigation_points,
            "hp_change": hp_change
        }
