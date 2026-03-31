from __future__ import annotations

import json
from typing import Any

from .llm_extract import call_gemini_generate
from .llm_quiz import _parse_json_object
from .schemas import QuizTwoRequest, QuizTwoResponse

QUIZ_TWO_COMPREHENSION = 4
QUIZ_TWO_VOCAB = 4
QUIZ_TWO_TOTAL = QUIZ_TWO_COMPREHENSION + QUIZ_TWO_VOCAB


def _build_prompt(req: QuizTwoRequest) -> tuple[str, str]:
    terms_json = json.dumps(req.terms, ensure_ascii=True)
    first_four = req.terms[:QUIZ_TWO_VOCAB]
    first_four_json = json.dumps(first_four, ensure_ascii=True)
    level = req.level

    system = f"""You are an English learning assistant.

The learner's level is: {level}.

Goal: create a **final** multiple-choice quiz that is **noticeably harder** than a basic vocabulary-in-context quiz.
Use more demanding wording, subtler distractors, and questions that require careful reading.

The quiz has exactly {QUIZ_TWO_TOTAL} questions in this fixed order:

**Questions 1–{QUIZ_TWO_COMPREHENSION} (reading comprehension):**
- Test understanding of the ORIGINAL TEXT: main idea, important details, implied meaning, or the author’s purpose.
- Do NOT ask about grammar labels (e.g. “which is a noun”).
- Each question must have exactly 4 options in English; distractors must be plausible but only one is fully correct.
- Options are free-form phrases or short sentences (not limited to the vocabulary list).

**Questions {QUIZ_TWO_COMPREHENSION + 1}–{QUIZ_TWO_TOTAL} (vocabulary — harder than a simple quiz):**
- Exactly one question per term, in the SAME ORDER as this list (first term → question {QUIZ_TWO_COMPREHENSION + 1}, etc.):
  {first_four_json}
- Use a short sentence with ONE blank (or a paraphrase task) where the correct answer is that target term.
- Place each concept in a **new** context that is more nuanced or abstract than typical beginner drills.
- Every option must be taken **only** from the full vocabulary list below (same rule as a strict classroom quiz).
- Each question must have exactly 4 **unique** options from that list.
- `answerIndex` is the 0-based index of the correct option.

Return strict JSON only:
{{
  "questions": [
    {{
      "prompt": "string",
      "options": ["string", "string", "string", "string"],
      "answerIndex": 0
    }}
  ]
}}

Return exactly {QUIZ_TWO_TOTAL} questions in order. Do not add extra keys."""

    user = f"""Original text:
---
{req.text}
---

Full vocabulary list (only source of options for questions {QUIZ_TWO_COMPREHENSION + 1}–{QUIZ_TWO_TOTAL}):
{terms_json}

Respond with JSON only."""

    return system, user


def generate_quiz_two(req: QuizTwoRequest) -> QuizTwoResponse:
    if len(req.terms) < QUIZ_TWO_VOCAB:
        raise ValueError(f"At least {QUIZ_TWO_VOCAB} selected terms are required for the final quiz")

    system, user = _build_prompt(req)
    raw = call_gemini_generate(system, user)
    data: dict[str, Any] = _parse_json_object(raw)
    parsed = QuizTwoResponse.model_validate(data)

    if len(parsed.questions) != QUIZ_TWO_TOTAL:
        raise ValueError(f"Quiz generator must return exactly {QUIZ_TWO_TOTAL} questions")

    allowed = {t.casefold(): t for t in req.terms}

    for idx, q in enumerate(parsed.questions):
        if len(set(o.casefold() for o in q.options)) != 4:
            raise ValueError(f"Question {idx + 1} does not contain 4 unique options")

        if idx < QUIZ_TWO_COMPREHENSION:
            continue

        vocab_idx = idx - QUIZ_TWO_COMPREHENSION
        target = req.terms[vocab_idx]
        for opt in q.options:
            if opt.casefold() not in allowed:
                raise ValueError(
                    f"Question {idx + 1} contains option not in selected vocabulary: {opt}"
                )
        correct = q.options[q.answerIndex]
        if correct.casefold() != target.casefold():
            raise ValueError(
                f"Question {idx + 1} does not use the target term as the correct answer"
            )

    return parsed
