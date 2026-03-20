from typing import List, Optional, Literal

from pydantic import BaseModel, Field


CEFR_LEVEL = Literal["A1", "A2", "B1", "B2", "C1"]


class HighlightOccurrence(BaseModel):
    start: int = Field(..., ge=0)
    end: int = Field(..., ge=0)


class Highlight(BaseModel):
    term: str
    occurrences: List[HighlightOccurrence]


class CandidateItem(BaseModel):
    term: str
    canonical: Optional[str] = None
    kind: Optional[str] = None
    levelScore: Optional[float] = None
    levelProbabilities: Optional[dict] = None

    definition: Optional[str] = None
    examples: Optional[List[str]] = None
    whyThisMatches: Optional[str] = None


class ExtractRequest(BaseModel):
    text: str = Field(..., min_length=1)
    level: CEFR_LEVEL


class ExtractResponse(BaseModel):
    level: CEFR_LEVEL
    highlights: List[Highlight]
    items: List[CandidateItem]
