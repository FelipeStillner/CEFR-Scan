from __future__ import annotations

import json
import re
from typing import Any

from .llm_extract import call_gemini_generate
from .schemas import QuizOneRequest, QuizOneResponse

_JSON_FENCE_RE = re.compile(r"```(?:json)?\s*([\s\S]*?)```", re.IGNORECASE)


def _parse_json_object(raw: str) -> dict[str, Any]:
    raw = raw.strip()
    m = _JSON_FENCE_RE.search(raw)
    if m:
        raw = m.group(1).strip()

    try:
        data = json.loads(raw)
        if isinstance(data, dict):
            return data
    except json.JSONDecodeError:
        pass

    start = raw.find("{")
    if start == -1:
        raise ValueError("No JSON object found in model output")

    depth = 0
    for i in range(start, len(raw)):
        if raw[i] == "{":
            depth += 1
        elif raw[i] == "}":
            depth -= 1
            if depth == 0:
                chunk = raw[start : i + 1]
                data = json.loads(chunk)
                if isinstance(data, dict):
                    return data
                break

    raise ValueError("Could not parse JSON object from model output")


def _build_prompt(req: QuizOneRequest) -> tuple[str, str]:
    terms_json = json.dumps(req.terms, ensure_ascii=True)

    system = """You are an English learning assistant.

Goal: create a simple contextual multiple-choice quiz for vocabulary learning.

Rules:
- Create exactly one question per provided term.
- Questions must be in English.
- Keep wording simple and beginner-friendly.
- Each question must place the concept in a DIFFERENT context than the original text.
- Use this question pattern: a short sentence with one blank and a prompt asking which option best fits.
- The correct answer must be the target term for that question.
- Every option must be selected from the provided vocabulary list only.
- Each question must have exactly 4 unique options.
- `answerIndex` must be the 0-based index of the correct option.
- Return strict JSON only with this shape:
{
  "questions": [
    {
      "prompt": "string",
      "options": ["string", "string", "string", "string"],
      "answerIndex": 0
    }
  ]
}
- Return questions in the same order as the provided terms list.
- Do not add extra keys.
"""

    user = f"""Original text:
---
{req.text}
---

Vocabulary list (must be the only source of answer options):
{terms_json}

Generate one question per term and respond with JSON only."""

    return system, user


def generate_quiz_one(req: QuizOneRequest) -> QuizOneResponse:
    if len(req.terms) < 4:
        raise ValueError("At least 4 selected terms are required to build 4-option questions")

    system, user = _build_prompt(req)
    raw = call_gemini_generate(system, user)
    data = _parse_json_object(raw)
    parsed = QuizOneResponse.model_validate(data)

    if len(parsed.questions) != len(req.terms):
        raise ValueError("Quiz generator did not return one question per selected term")

    allowed = {t.casefold(): t for t in req.terms}

    for idx, q in enumerate(parsed.questions):
        if len(set(o.casefold() for o in q.options)) != 4:
            raise ValueError(f"Question {idx + 1} does not contain 4 unique options")
        for opt in q.options:
            if opt.casefold() not in allowed:
                raise ValueError(
                    f"Question {idx + 1} contains option not in selected vocabulary: {opt}"
                )
        target = req.terms[idx]
        correct = q.options[q.answerIndex]
        if correct.casefold() != target.casefold():
            raise ValueError(
                f"Question {idx + 1} does not use the target term as the correct answer"
            )

    return parsed
