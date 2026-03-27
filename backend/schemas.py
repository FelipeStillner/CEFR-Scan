from __future__ import annotations

from typing import List, Literal

from pydantic import BaseModel, Field, field_validator, model_validator


ENGLISH_LEVEL = Literal["Beginner", "Intermediary", "Advanced"]

class VocabularyItem(BaseModel):
    term: str


class ExtractRequest(BaseModel):
    text: str = Field(..., min_length=1)
    level: ENGLISH_LEVEL


class ExtractResponse(BaseModel):
    vocabulary: List[VocabularyItem]


class DefinitionsRequest(BaseModel):
    terms: List[str] = Field(..., min_length=1, max_length=200)

    @field_validator("terms")
    @classmethod
    def nonempty_terms(cls, v: List[str]) -> List[str]:
        out = [t.strip() for t in v if isinstance(t, str) and t.strip()]
        if not out:
            raise ValueError("At least one non-empty term is required")
        return out


class TermDefinition(BaseModel):
    term: str
    definition: str


class DefinitionsResponse(BaseModel):
    definitions: List[TermDefinition]


TRANSLATE_TARGET_LANG = Literal["fr", "pt", "de", "es"]


class TranslateRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=500)
    target_lang: TRANSLATE_TARGET_LANG


class TranslateResponse(BaseModel):
    translated_text: str


class QuizRequest(BaseModel):
    text: str = Field(..., min_length=1)
    vocabulary: List[str] = Field(..., min_length=1, max_length=100)

    @field_validator("vocabulary")
    @classmethod
    def nonempty_vocab(cls, v: List[str]) -> List[str]:
        out = [t.strip() for t in v if isinstance(t, str) and t.strip()]
        if not out:
            raise ValueError("At least one non-empty vocabulary term is required")
        return out


class QuizQuestion(BaseModel):
    term: str
    prompt: str
    options: List[str] = Field(..., min_length=1)
    correct_index: int = Field(..., ge=0)

    @model_validator(mode="after")
    def correct_index_in_range(self) -> QuizQuestion:
        if self.correct_index >= len(self.options):
            raise ValueError("correct_index out of range for options")
        return self


class QuizResponse(BaseModel):
    questions: List[QuizQuestion]
