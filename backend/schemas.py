from typing import List, Literal

from pydantic import BaseModel, Field, field_validator


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


class QuizOneRequest(BaseModel):
    text: str = Field(..., min_length=1)
    terms: List[str] = Field(..., min_length=1, max_length=200)

    @field_validator("terms")
    @classmethod
    def unique_nonempty_terms(cls, v: List[str]) -> List[str]:
        seen: set[str] = set()
        out: List[str] = []
        for raw in v:
            term = raw.strip() if isinstance(raw, str) else ""
            if not term:
                continue
            key = term.casefold()
            if key in seen:
                continue
            seen.add(key)
            out.append(term)
        if not out:
            raise ValueError("At least one unique non-empty term is required")
        return out


class QuizOneQuestion(BaseModel):
    prompt: str = Field(..., min_length=1)
    options: List[str] = Field(..., min_length=4, max_length=4)
    answerIndex: int = Field(..., ge=0, le=3)

    @field_validator("options")
    @classmethod
    def options_nonempty(cls, v: List[str]) -> List[str]:
        cleaned = [o.strip() for o in v if isinstance(o, str) and o.strip()]
        if len(cleaned) != 4:
            raise ValueError("Each question must include exactly 4 non-empty options")
        return cleaned


class QuizOneResponse(BaseModel):
    questions: List[QuizOneQuestion]


class QuizTwoRequest(BaseModel):
    text: str = Field(..., min_length=1)
    terms: List[str] = Field(..., min_length=1, max_length=200)
    level: ENGLISH_LEVEL

    @field_validator("terms")
    @classmethod
    def unique_nonempty_terms(cls, v: List[str]) -> List[str]:
        seen: set[str] = set()
        out: List[str] = []
        for raw in v:
            term = raw.strip() if isinstance(raw, str) else ""
            if not term:
                continue
            key = term.casefold()
            if key in seen:
                continue
            seen.add(key)
            out.append(term)
        if not out:
            raise ValueError("At least one unique non-empty term is required")
        return out


# Same JSON shape as quiz one; OpenAPI name distinguishes the route.
class QuizTwoResponse(BaseModel):
    questions: List[QuizOneQuestion]
