from typing import List
from pydantic import BaseModel, Field

class ProblemClarifyingQuestion(BaseModel):
    question: str
    intent: str

class ProblemRequirements(BaseModel):
    must_have: List[str] = Field(default_factory=list)
    should_have: List[str] = Field(default_factory=list)

class ProblemExplainRequest(BaseModel):
    problem_statement: str = Field(min_length=15)

class ProblemExplainOutput(BaseModel):
    plain_english_summary: str
    requirements: ProblemRequirements
    constraints: List[str] = Field(default_factory=list)
    hidden_criteria: List[str] = Field(default_factory=list)
    clarifying_questions: List[ProblemClarifyingQuestion] = Field(default_factory=list)
    ambiguities: List[str] = Field(default_factory=list)

class ProblemAskRequest(BaseModel):
    problem_statement: str = Field(min_length=15)
    question: str = Field(min_length=3)

class ProblemAskOutput(BaseModel):
    question: str
    answer: str
    is_covered: bool
    cited_phrases: List[str] = Field(default_factory=list)
