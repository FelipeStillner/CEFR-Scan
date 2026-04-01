from __future__ import annotations

import json
import random
import re
from typing import Any

from .llm_extract import call_gemini_generate
from .llm_quiz import _parse_json_object
from .schemas import QuizOneQuestion, QuizTwoRequest, QuizTwoResponse

QUIZ_TWO_MIN_PER_TERM = 2
QUIZ_TWO_MAX_PER_TERM = 4
QUIZ_TWO_TARGET_AVERAGE = 3.0


def _question_counts_per_term(num_terms: int) -> list[int]:
    """Build per-term counts in [2, 4] with an average close to 3."""
    target_total = round(num_terms * QUIZ_TWO_TARGET_AVERAGE)
    counts = [3] * num_terms

    while sum(counts) < target_total:
        idx = random.randrange(num_terms)
        if counts[idx] < QUIZ_TWO_MAX_PER_TERM:
            counts[idx] += 1

    while sum(counts) > target_total:
        idx = random.randrange(num_terms)
        if counts[idx] > QUIZ_TWO_MIN_PER_TERM:
            counts[idx] -= 1

    # Add slight variation while preserving total and bounds.
    for _ in range(max(1, num_terms)):
        i = random.randrange(num_terms)
        j = random.randrange(num_terms)
        if i == j:
            continue
        if counts[i] < QUIZ_TWO_MAX_PER_TERM and counts[j] > QUIZ_TWO_MIN_PER_TERM and random.random() < 0.35:
            counts[i] += 1
            counts[j] -= 1

    return counts


def _base_form(term: str) -> str:
    return re.sub(r"[^a-z]", "", term.casefold())


def _is_inflected_or_derived(term: str, candidate: str) -> bool:
    t = _base_form(term)
    c = _base_form(candidate)
    if not t or not c:
        return False
    if c == t:
        return True
    if len(t) >= 4 and (c.startswith(t) or t.startswith(c)):
        return True
    return False


def _randomize_options(question: QuizOneQuestion) -> QuizOneQuestion:
    correct = question.options[question.answerIndex]
    distractors = [opt for idx, opt in enumerate(question.options) if idx != question.answerIndex]
    random.shuffle(distractors)

    correct_idx = random.randrange(4)
    new_options: list[str] = []
    d_idx = 0
    for i in range(4):
        if i == correct_idx:
            new_options.append(correct)
        else:
            new_options.append(distractors[d_idx])
            d_idx += 1

    return question.model_copy(update={"options": new_options, "answerIndex": correct_idx})


def _build_prompt(req: QuizTwoRequest) -> tuple[str, str, list[int]]:
    terms_json = json.dumps(req.terms, ensure_ascii=True)
    counts = _question_counts_per_term(len(req.terms))
    total_questions = sum(counts)
    plan_rows = [
        {"term": term, "questions": count}
        for term, count in zip(req.terms, counts)
    ]
    plan_json = json.dumps(plan_rows, ensure_ascii=True)
    level = req.level

    system = f"""You are an English learning assistant.

The learner's level is: {level}.

Goal: create a final multiple-choice quiz focused on concept mastery of vocabulary, harder than quiz one.

Hardness requirements:
- Use more abstract or nuanced contexts than basic drills.
- Use subtle semantic distractors (close meanings, common confusion pairs).
- Prompts may be slightly longer when needed, but remain clear.

Content requirements:
- NO reading comprehension questions about the original text.
- The source text will not be visible to the learner during this quiz.
- Create questions only to validate learned vocabulary concepts.

Question-count plan:
- Use this exact per-term plan in this exact order (do not reorder terms):
{plan_json}
- Total questions must be exactly: {total_questions}

Format requirements (for every question):
- Questions must be in English.
- Use a mix of:
  1) harder blank-in-context questions,
  2) definition/paraphrase questions.
- Exactly 4 unique options.
- `answerIndex` is 0-based.

Answer rules:
- For each term block, keep a 50/50 mix as close as possible between:
  1) target-answer questions: correct option is the target term (or an inflected/derived form),
  2) paraphrase-answer questions: correct option is an English synonym/paraphrase phrase or sentence.
- Options may come from outside the selected vocabulary list.

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

Return exactly {total_questions} questions in order. Do not add extra keys."""

    user = f"""Original text:
---
{req.text}
---

Selected vocabulary list:
{terms_json}

Respond with JSON only."""

    return system, user, counts


def generate_quiz_two(req: QuizTwoRequest) -> QuizTwoResponse:
    if len(req.terms) < 4:
        raise ValueError("At least 4 selected terms are required for the final quiz")

    system, user, counts = _build_prompt(req)
    expected_total = sum(counts)
    raw = call_gemini_generate(system, user)
    data: dict[str, Any] = _parse_json_object(raw)
    parsed = QuizTwoResponse.model_validate(data)

    if len(parsed.questions) != expected_total:
        raise ValueError(f"Quiz generator must return exactly {expected_total} questions")

    # For each term block, require at least one target-answer style question.
    offset = 0
    for term, count in zip(req.terms, counts):
        block = parsed.questions[offset : offset + count]
        offset += count

        if not block:
            raise ValueError("Quiz generator produced an empty term block")

        if not any(_is_inflected_or_derived(term, q.options[q.answerIndex]) for q in block):
            raise ValueError(
                "Quiz generator did not include any target-answer question "
                f"for term '{term}'"
            )

    for idx, q in enumerate(parsed.questions):
        if len(set(o.casefold() for o in q.options)) != 4:
            raise ValueError(f"Question {idx + 1} does not contain 4 unique options")

    randomized_questions = [_randomize_options(q) for q in parsed.questions]
    random.shuffle(randomized_questions)

    return QuizTwoResponse(questions=randomized_questions)
