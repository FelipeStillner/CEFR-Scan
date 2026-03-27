from typing import List, Optional, Literal

from pydantic import BaseModel, Field


ENGLISH_LEVEL = Literal["Beginner", "Intermediary", "Advanced"]

class VocabularyItem(BaseModel):
    term: str


class ExtractRequest(BaseModel):
    text: str = Field(..., min_length=1)
    level: ENGLISH_LEVEL


class ExtractResponse(BaseModel):
    vocabulary: List[VocabularyItem]
