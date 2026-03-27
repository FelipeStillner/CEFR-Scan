"""Call Gemini to produce ExtractResponse-shaped JSON."""

from __future__ import annotations

import json
import os
import re
from typing import Any

import httpx

from .schemas import ExtractRequest, ExtractResponse
from .sanitize_payload import sanitize_payload

DEFAULT_GEMINI_BASE = "https://generativelanguage.googleapis.com"
DEFAULT_GEMINI_MODEL = "gemini-2.5-flash-lite"


def _gemini_base() -> str:
    return os.environ.get("GEMINI_BASE_URL", DEFAULT_GEMINI_BASE).rstrip("/")


def _gemini_model() -> str:
    return os.environ.get("GEMINI_MODEL", DEFAULT_GEMINI_MODEL)


def _gemini_api_key() -> str:
    key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not key:
        raise ValueError("Missing GEMINI_API_KEY environment variable")
    return key


def _build_prompt(req: ExtractRequest) -> tuple[str, str]:
    system = """You are an English learning assistant. The user provides English text and a proficiency level: Beginner, Intermediary, or Advanced.

Level meanings (for calibration):
- Beginner: early-stage learner; basic everyday vocabulary and simple structures only.
- Intermediary: can handle common topics and connected text; still misses many advanced or low-frequency items.
- Advanced: strong command of general English; only rare, technical, highly idiomatic, or specialized items are typically unknown.

Your task: from the ORIGINAL TEXT, list every word, multi-word expression, or short phrase that a learner at the SELECTED level would NOT generally be expected to understand yet—i.e. items above that level (too difficult, rare, idiomatic, technical, or specialized for that level). Use substrings that appear exactly as in the text when possible (same spelling and inflection).

You MUST respond with a single JSON object only. No markdown fences, no commentary before or after.

The JSON must be:
{
  "vocabulary": [
    {"term": "string"}
  ]
}

Rules:
- Return ONLY the key "vocabulary".
- Each vocabulary element must contain ONLY one key: "term" (string).
- Do not return booleans/numbers for "term".
- Be exhaustive: include ALL such items from the text. Do not cap or sample the list for length. If the text is long, the list may be long.
- Order terms by first occurrence in the text (top to bottom).
- If the same challenging form appears twice, include it once.
- If every substantive word in the text is within reach for that level, return {"vocabulary": []}."""

    user = f"""Proficiency level: {req.level}

Original text (use this exact string for index calculations):
---
{req.text}
---

Respond with JSON only."""

    return system, user


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


def call_gemini_generate(system: str, user: str, *, timeout_s: float = 300.0) -> str:
    base = _gemini_base()
    model = _gemini_model()
    key = _gemini_api_key()
    url = f"{base}/v1beta/models/{model}:generateContent"
    payload: dict[str, Any] = {
        "systemInstruction": {"parts": [{"text": system}]},
        "contents": [{"role": "user", "parts": [{"text": user}]}],
        "generationConfig": {
            "temperature": 0.2,
            "responseMimeType": "application/json",
        },
    }
    with httpx.Client(timeout=timeout_s) as client:
        r = client.post(url, params={"key": key}, json=payload)
        r.raise_for_status()
        body = r.json()

    candidates = body.get("candidates")
    if not isinstance(candidates, list) or not candidates:
        raise ValueError("Gemini response missing candidates")
    content = (candidates[0] or {}).get("content") or {}
    parts = content.get("parts")
    if not isinstance(parts, list) or not parts:
        raise ValueError("Gemini response missing content.parts")
    text = (parts[0] or {}).get("text")
    if not isinstance(text, str):
        raise ValueError("Gemini response missing parts[0].text")
    return text


def extract_via_llm(req: ExtractRequest) -> ExtractResponse:
    system, user = _build_prompt(req)
    raw = call_gemini_generate(system, user)
    data = _parse_json_object(raw)
    data = sanitize_payload(data)
    return ExtractResponse.model_validate(data)
