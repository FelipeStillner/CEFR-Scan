"""Generate fill-in-the-blank multiple choice quiz via Gemini."""

from __future__ import annotations

import json
import random
from typing import Any

from .llm_extract import _parse_json_object, call_gemini_generate
from .schemas import QuizRequest, QuizResponse


def _build_quiz_prompt(text: str, vocabulary: list[str]) -> tuple[str, str]:
    n = len(vocabulary)
    voc_json = json.dumps(vocabulary, ensure_ascii=False)
    system = f"""You create very simple English vocabulary quizzes for learners.

You MUST respond with a single JSON object only. No markdown fences, no commentary.

The JSON must be:
{{
  "questions": [
    {{
      "term": "exact vocabulary term this question tests",
      "prompt": "One short sentence with a blank shown as ______ where the learner picks the missing word.",
      "options": ["wordA", "wordB", "wordC", "wordD"],
      "correct_index": 0
    }}
  ]
}}

Rules:
- There MUST be exactly {n} questions, one per vocabulary item, in the SAME ORDER as the vocabulary list.
- Each "term" must exactly match the corresponding item in that vocabulary list (same string, same position).
- Each "options" array MUST contain ONLY words copied from the user's vocabulary list (no words outside that list).
- Use up to 4 options per question when the vocabulary has at least 4 terms; if fewer than 4 terms total, use every vocabulary word as an option for that question (no duplicate strings in the same options array).
- Each "options" array must include the correct answer for that question exactly once.
- "correct_index" is the 0-based index into "options" for the correct word.
- Prompts must be fill-in-the-blank with ______ for the blank. Keep sentences very simple.
- IMPORTANT: Each "prompt" must be a NEW sentence written by you. Do NOT copy, quote, or lightly rephrase any sentence or clause from the passage below. Do not reuse the same wording as the original text. Invent different, simple situations where the word fits naturally.
- You may use the passage only to understand the general topic and meaning of the words; the quiz sentences must be different from the original."""

    user = f"""Passage (for context only — do not repeat its sentences in the quiz):
---
{text}
---

Vocabulary (exactly {n} questions in this order; options may only use these strings):
{voc_json}

Respond with JSON only."""

    return system, user


def _rebuild_options(term: str, vocabulary: list[str], max_n: int = 4) -> tuple[list[str], int]:
    """Build valid MC options using only vocabulary words."""
    uniq = list(dict.fromkeys(vocabulary))
    others = [w for w in uniq if w != term]
    target = min(max_n, len(uniq))
    need = max(0, target - 1)
    random.shuffle(others)
    picked = [term] + others[:need]
    random.shuffle(picked)
    return picked, picked.index(term)


def _normalize_quiz(data: dict[str, Any], vocabulary: list[str]) -> dict[str, Any]:
    vocab_set = set(vocabulary)
    raw = data.get("questions")
    if not isinstance(raw, list):
        raise ValueError("Missing questions array")

    if len(raw) != len(vocabulary):
        raise ValueError(f"Expected {len(vocabulary)} questions, got {len(raw)}")

    questions: list[dict[str, Any]] = []
    for i, term in enumerate(vocabulary):
        item = raw[i]
        if not isinstance(item, dict):
            raise ValueError(f"Invalid question at index {i}")

        prompt = item.get("prompt")
        if not isinstance(prompt, str) or not prompt.strip():
            prompt = f"Choose the word that fills the blank: ______"

        p = prompt.strip()
        if "______" not in p and "___" not in p and "____" not in p:
            p = f"{p} ______"

        opts_raw = item.get("options")
        opts: list[str] = []
        if isinstance(opts_raw, list):
            for x in opts_raw:
                if isinstance(x, str) and x in vocab_set:
                    opts.append(x)

        seen: set[str] = set()
        deduped: list[str] = []
        for o in opts:
            if o not in seen:
                seen.add(o)
                deduped.append(o)

        if term not in deduped:
            deduped.append(term)

        if len(deduped) > 4:
            keep = [term]
            for w in deduped:
                if w != term and len(keep) < 4:
                    keep.append(w)
            deduped = keep
            random.shuffle(deduped)

        valid = all(w in vocab_set for w in deduped) and term in deduped
        if not valid or len(deduped) < 1:
            deduped, ci = _rebuild_options(term, vocabulary)
        else:
            ci = item.get("correct_index")
            if not isinstance(ci, int) or ci < 0 or ci >= len(deduped) or deduped[ci] != term:
                try:
                    ci = deduped.index(term)
                except ValueError:
                    deduped, ci = _rebuild_options(term, vocabulary)

        questions.append(
            {
                "term": term,
                "prompt": p,
                "options": deduped,
                "correct_index": ci,
            }
        )

    return {"questions": questions}


def generate_quiz_via_llm(req: QuizRequest) -> QuizResponse:
    vocabulary = list(req.vocabulary)
    if not vocabulary:
        return QuizResponse(questions=[])

    system, user = _build_quiz_prompt(req.text, vocabulary)
    raw = call_gemini_generate(system, user)
    data = _parse_json_object(raw)
    data = _normalize_quiz(data, vocabulary)
    return QuizResponse.model_validate(data)
