from typing import List, Optional, Literal

from pydantic import BaseModel, Field


CEFR_LEVEL = Literal["A1", "A2", "B1", "B2", "C1"]

class VocabularyItem(BaseModel):
    term: str


class ExtractRequest(BaseModel):
    text: str = Field(..., min_length=1)
    level: CEFR_LEVEL


class ExtractResponse(BaseModel):
    vocabulary: List[VocabularyItem]
