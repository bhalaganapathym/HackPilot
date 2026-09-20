"""
Phase C — K-Means Clustering + Differentiation Dossier

Clusters all embedded submissions into domain groups using sklearn K-Means,
assigns each submission a domain_cluster label (via Nova Pro), then generates
a Differentiation Dossier for each cluster that highlights what makes each
project unique within the cluster.
"""

import json
import logging
import re
from typing import List, Dict, Any, Optional

import numpy as np
from sklearn.cluster import KMeans
from sqlmodel import Session, select

from app.models.submission import Submission
from app.ai.registry import get_provider

logger = logging.getLogger("hackpilot.clustering")

# ── Tuning constants ─────────────────────────────────────────────────────────
MIN_SUBMISSIONS_TO_CLUSTER = 3   # Need at least 3 to form meaningful groups
MAX_K = 6                        # Never create more than 6 clusters
MIN_K = 2                        # Minimum 2 clusters


def _pick_k(n: int) -> int:
    """Heuristic: sqrt(n/2) capped at MAX_K, minimum MIN_K."""
    if n < MIN_SUBMISSIONS_TO_CLUSTER:
        return 1
    k = max(MIN_K, min(MAX_K, round((n / 2) ** 0.5)))
    return k


from pydantic import BaseModel, Field

class ClusterNameOutput(BaseModel):
    domain_label: str = Field(..., description="A concise 3-5 word domain label for the cluster")

class ClusterDossierOutput(BaseModel):
    common_theme: str = Field(..., description="1-2 sentences on what all projects in this cluster have in common")
    differentiators: List[str] = Field(..., description="Key differentiators across the projects")
    dossier_text: str = Field(..., description="A cohesive 150-200 word briefing on project differences and strengths")


_DOMAIN_LABEL_SYSTEM = """
You are a senior hackathon organizer and domain taxonomist.
Analyze the provided list of project titles and determine the single most accurate, professional,
and concise domain label (3-5 words) that categorizes them.
Examples: "Developer Tooling & DevOps", "Climate & Renewable Energy", "Wearable HealthTech & Diagnostics",
"Financial Risk & Fraud Detection", "Cybersecurity & Identity".
""".strip()

_DOSSIER_SYSTEM = """
You are an expert hackathon judge preparing a Differentiation Dossier for an organizer panel.
Compare the projects in the provided cluster. Highlight what they share in common, what fundamentally
distinguishes each project from the others, and where the novel architectural approaches lie.
""".strip()


async def _name_cluster(titles: List[str]) -> str:
    """Ask Bedrock to assign a structured domain label to a cluster."""
    try:
        provider = get_provider()
        user_input = "Project titles in this cluster:\n" + "\n".join(f"- {t}" for t in titles)
        result = await provider.generate_json(
            feature="cluster_naming",
            system_prompt=_DOMAIN_LABEL_SYSTEM,
            user_text=user_input,
            schema=ClusterNameOutput
        )
        label = result.domain_label.strip()
        label = re.sub(r'^["\']|["\']$|[.!?]$', "", label).strip()
        return label if label else "General Technology"
    except Exception as exc:
        logger.warning("_name_cluster failed: %s", exc)
        return "General Technology"


async def _generate_dossier(cluster_name: str, projects: List[Dict[str, str]]) -> str:
    """Generate a structured differentiation dossier for a cluster."""
    try:
        provider = get_provider()
        projects_text = f"Cluster Domain: {cluster_name}\n\nProjects in this cluster:\n" + "\n\n".join(
            f"**{p['title']}** (Team: {p.get('team', 'Unknown')})\nAbstract: {p['abstract']}"
            for p in projects
        )
        result = await provider.generate_json(
            feature="cluster_dossier",
            system_prompt=_DOSSIER_SYSTEM,
            user_text=projects_text,
            schema=ClusterDossierOutput
        )
        return result.dossier_text.strip()
    except Exception as exc:
        logger.warning("_generate_dossier failed for %s: %s", cluster_name, exc)
        return f"Projects in {cluster_name} address overlapping technical challenges with distinct architectural approaches."



async def run_clustering(session: Session) -> Dict[str, Any]:
    """
    Full clustering pipeline:
      1. Load all submissions with embedding_status='done'
      2. Stack embeddings into numpy matrix
      3. K-Means with k = _pick_k(n)
      4. Name each cluster via Nova Pro
      5. Persist domain_cluster to SQLite for each submission
      6. Generate a Differentiation Dossier per cluster
      7. Return the full cluster manifest

    Returns:
      {
        "k": int,
        "clusters": [
          {
            "id": 0,
            "name": "AI Developer Tooling",
            "count": 5,
            "dossier": "...",
            "submissions": [{"id", "title", "team_name", "score"}]
          }, ...
        ],
        "unembedded_count": int
      }
    """
    all_subs = session.exec(select(Submission)).all()
    embedded = [s for s in all_subs if s.embedding_status == "done" and s.embedding_json]
    unembedded_count = len(all_subs) - len(embedded)

    logger.info(
        "run_clustering | embedded=%d, unembedded=%d",
        len(embedded), unembedded_count
    )

    if len(embedded) < MIN_SUBMISSIONS_TO_CLUSTER:
        # Not enough data — return each submission as its own group
        clusters_out = []
        for sub in embedded:
            scores = json.loads(sub.latest_scores) if sub.latest_scores else {}
            clusters_out.append({
                "id": 0,
                "name": "General",
                "count": 1,
                "dossier": "Not enough submissions yet to generate a differentiation dossier.",
                "submissions": [{
                    "id": sub.id,
                    "title": sub.title,
                    "team_name": sub.team_name or "Unknown",
                    "score": scores.get("overall"),
                    "domain_cluster": "General",
                }]
            })
        # Assign all to "General"
        for sub in embedded:
            sub.domain_cluster = "General"
            session.add(sub)
        session.commit()
        return {"k": 1, "clusters": clusters_out, "unembedded_count": unembedded_count}

    # ── Build embedding matrix ────────────────────────────────────────────────
    k = _pick_k(len(embedded))
    vectors = np.array([json.loads(s.embedding_json) for s in embedded], dtype=np.float32)

    # ── K-Means ───────────────────────────────────────────────────────────────
    kmeans = KMeans(n_clusters=k, random_state=42, n_init="auto")
    labels = kmeans.fit_predict(vectors)

    logger.info("run_clustering | k=%d | label distribution=%s", k, dict(zip(*np.unique(labels, return_counts=True))))

    # ── Group submissions by cluster ──────────────────────────────────────────
    cluster_map: Dict[int, List[Submission]] = {i: [] for i in range(k)}
    for sub, label in zip(embedded, labels):
        cluster_map[int(label)].append(sub)

    # ── Name clusters + persist + generate dossiers (sequentially to avoid rate limits)
    clusters_out = []
    for cluster_id, subs in cluster_map.items():
        titles = [s.title for s in subs]
        cluster_name = await _name_cluster(titles)

        # Persist cluster name to SQLite
        for sub in subs:
            sub.domain_cluster = cluster_name
            session.add(sub)
        session.commit()

        # Build dossier input
        projects_for_dossier = []
        submissions_meta = []
        for sub in subs:
            scores = json.loads(sub.latest_scores) if sub.latest_scores else {}
            projects_for_dossier.append({
                "title": sub.title,
                "team": sub.team_name or "Unknown",
                "abstract": (sub.abstract or "")[:600],
            })
            submissions_meta.append({
                "id": sub.id,
                "title": sub.title,
                "team_name": sub.team_name or "Unknown",
                "score": scores.get("overall"),
                "domain_cluster": cluster_name,
            })

        dossier = await _generate_dossier(cluster_name, projects_for_dossier)

        clusters_out.append({
            "id": cluster_id,
            "name": cluster_name,
            "count": len(subs),
            "dossier": dossier,
            "submissions": submissions_meta,
        })

    clusters_out.sort(key=lambda c: c["count"], reverse=True)

    logger.info(
        "run_clustering | DONE | k=%d | clusters=%s",
        k, [f'{c["name"]}({c["count"]})' for c in clusters_out]
    )

    return {
        "k": k,
        "clusters": clusters_out,
        "unembedded_count": unembedded_count,
    }
