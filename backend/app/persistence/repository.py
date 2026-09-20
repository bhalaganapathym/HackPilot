"""
Persistence abstraction for HackPilot.

Provides unified interface for storage:
- SQLite (local development and SQLModel relational joins)
- DynamoDB (AWS cloud state on hackpilot-dev-submissions)

Single-table DynamoDB layout:
- pk: "SUBMISSION" | sk: "SUB#<id>"
- GSI/Attributes: title, team_name, abstract, latest_scores, status, domain_cluster, etc.
"""

from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
import json
import logging
from datetime import datetime

import boto3
from sqlmodel import Session, select

from app.models.submission import Submission, Analysis
from app.core.config import settings

logger = logging.getLogger("hackpilot.persistence")


class BaseSubmissionRepository(ABC):
    @abstractmethod
    def save_submission(self, submission: Submission) -> Submission:
        pass

    @abstractmethod
    def get_submissions(self, user_id: Optional[str] = None) -> List[Submission]:
        pass

    @abstractmethod
    def get_submission(self, submission_id: str) -> Optional[Submission]:
        pass


class SQLiteSubmissionRepository(BaseSubmissionRepository):
    def __init__(self, session: Session):
        self.session = session

    def save_submission(self, submission: Submission) -> Submission:
        self.session.add(submission)
        self.session.commit()
        self.session.refresh(submission)
        return submission

    def get_submissions(self, user_id: Optional[str] = None) -> List[Submission]:
        stmt = select(Submission)
        if user_id:
            stmt = stmt.where(Submission.user_id == user_id)
        stmt = stmt.order_by(Submission.created_at.desc())
        return list(self.session.exec(stmt).all())

    def get_submission(self, submission_id: str) -> Optional[Submission]:
        return self.session.get(Submission, submission_id)


class DynamoDBSubmissionRepository(BaseSubmissionRepository):
    """
    Amazon DynamoDB submission repository.
    Interacts with AWS DynamoDB table: settings.DYNAMODB_TABLE_NAME
    """
    def __init__(self):
        session = (
            boto3.Session(profile_name=settings.AWS_PROFILE, region_name=settings.AWS_REGION)
            if settings.AWS_PROFILE
            else boto3.Session(region_name=settings.AWS_REGION)
        )
        self.dynamodb = session.resource("dynamodb")
        self.table = self.dynamodb.Table(settings.DYNAMODB_TABLE_NAME)

    def save_submission(self, submission: Submission) -> Submission:
        try:
            item = {
                "pk": "SUBMISSION",
                "sk": f"SUB#{submission.id}",
                "id": submission.id,
                "title": submission.title,
                "team_name": submission.team_name or "Team HackPilot",
                "problem_statement": submission.problem_statement or "",
                "abstract": submission.abstract,
                "problem_statement_id": submission.problem_statement_id or "",
                "status": submission.status,
                "domain_cluster": submission.domain_cluster or "",
                "embedding_status": submission.embedding_status,
                "similarity_status": submission.similarity_status,
                "latest_scores": submission.latest_scores or "",
                "latest_analysis_id": submission.latest_analysis_id or "",
                "judge_dossier_json": submission.judge_dossier_json or "",
                "created_at": submission.created_at.isoformat(),
                "user_id": submission.user_id or "anonymous",
            }
            self.table.put_item(Item=item)
            logger.info("DynamoDB | PutItem successful for submission=%s", submission.id)
        except Exception as e:
            logger.warning("DynamoDB | Failed to sync submission to AWS: %s", str(e))
        return submission

    def get_submissions(self, user_id: Optional[str] = None) -> List[Submission]:
        try:
            response = self.table.query(
                KeyConditionExpression="pk = :pk",
                ExpressionAttributeValues={":pk": "SUBMISSION"}
            )
            items = response.get("Items", [])
            submissions = []
            for it in items:
                s = Submission(
                    id=it["id"],
                    title=it.get("title", ""),
                    team_name=it.get("team_name"),
                    problem_statement=it.get("problem_statement"),
                    abstract=it.get("abstract", ""),
                    problem_statement_id=it.get("problem_statement_id"),
                    status=it.get("status", "submitted"),
                    domain_cluster=it.get("domain_cluster"),
                    embedding_status=it.get("embedding_status", "pending"),
                    similarity_status=it.get("similarity_status", "pending"),
                    latest_scores=it.get("latest_scores") or None,
                    latest_analysis_id=it.get("latest_analysis_id") or None,
                    judge_dossier_json=it.get("judge_dossier_json") or None,
                    created_at=datetime.fromisoformat(it["created_at"]) if "created_at" in it else datetime.utcnow(),
                    user_id=it.get("user_id")
                )
                submissions.append(s)
            submissions.sort(key=lambda x: x.created_at, reverse=True)
            return submissions
        except Exception as e:
            logger.warning("DynamoDB | Failed to query submissions from AWS: %s", str(e))
            return []

    def get_submission(self, submission_id: str) -> Optional[Submission]:
        try:
            res = self.table.get_item(Key={"pk": "SUBMISSION", "sk": f"SUB#{submission_id}"})
            it = res.get("Item")
            if not it:
                return None
            return Submission(
                id=it["id"],
                title=it.get("title", ""),
                team_name=it.get("team_name"),
                problem_statement=it.get("problem_statement"),
                abstract=it.get("abstract", ""),
                problem_statement_id=it.get("problem_statement_id"),
                status=it.get("status", "submitted"),
                domain_cluster=it.get("domain_cluster"),
                embedding_status=it.get("embedding_status", "pending"),
                similarity_status=it.get("similarity_status", "pending"),
                latest_scores=it.get("latest_scores") or None,
                latest_analysis_id=it.get("latest_analysis_id") or None,
                judge_dossier_json=it.get("judge_dossier_json") or None,
                created_at=datetime.fromisoformat(it["created_at"]) if "created_at" in it else datetime.utcnow(),
                user_id=it.get("user_id")
            )
        except Exception as e:
            logger.warning("DynamoDB | Failed to get item %s: %s", submission_id, str(e))
            return None


class DualPersistenceRepository(BaseSubmissionRepository):
    """
    Hybrid repository: writes to SQLite and asynchronously mirrors to DynamoDB.
    Reads prioritize SQLite (fast local queries) and seamlessly fall back to DynamoDB.
    """
    def __init__(self, session: Session):
        self.sqlite_repo = SQLiteSubmissionRepository(session)
        self.dynamo_repo = DynamoDBSubmissionRepository()

    def save_submission(self, submission: Submission) -> Submission:
        sub = self.sqlite_repo.save_submission(submission)
        try:
            self.dynamo_repo.save_submission(sub)
        except Exception as e:
            logger.warning("DualPersistence: DynamoDB sync skipped: %s", e)
        return sub

    def get_submissions(self, user_id: Optional[str] = None) -> List[Submission]:
        items = self.sqlite_repo.get_submissions(user_id)
        if not items:
            # Fallback to DynamoDB if local DB is empty
            dynamo_items = self.dynamo_repo.get_submissions(user_id)
            if dynamo_items:
                return dynamo_items
        return items

    def get_submission(self, submission_id: str) -> Optional[Submission]:
        sub = self.sqlite_repo.get_submission(submission_id)
        if not sub:
            sub = self.dynamo_repo.get_submission(submission_id)
        return sub
