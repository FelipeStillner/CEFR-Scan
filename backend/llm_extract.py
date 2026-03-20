"""Call a local Ollama model to produce ExtractResponse-shaped JSON."""

from __future__ import annotations

import json
import os
import re
from typing import Any

import httpx

from .schemas import ExtractRequest, ExtractResponse


def _coerce_optional_str(value: Any) -> str | None:
    """LLMs sometimes emit booleans/numbers for optional string fields; normalize."""
    if value is None:
        return None
    if isinstance(value, bool):
        return None
    if isinstance(value, str):
        return value
    if isinstance(value, (int, float)):
        return str(value)
    return None


def _coerce_term(value: Any) -> str:
    if isinstance(value, str):
        return value
    if value is None:
        return ""
    return str(value)


def _sanitize_item(obj: dict[str, Any]) -> dict[str, Any]:
    out = dict(obj)
    for key in ("canonical", "kind", "definition", "whyThisMatches"):
        if key in out:
            out[key] = _coerce_optional_str(out.get(key))
    if "term" in out:
        out["term"] = _coerce_term(out.get("term"))
    if "levelScore" in out:
        v = out["levelScore"]
        if isinstance(v, bool) or v is None:
            out["levelScore"] = None
        elif isinstance(v, (int, float)):
            out["levelScore"] = float(v)
        else:
            out["levelScore"] = None
    if "examples" in out:
        ex = out["examples"]
        if ex is None:
            out["examples"] = None
        elif isinstance(ex, list):
            out["examples"] = [
                x if isinstance(x, str) else str(x)
                for x in ex
                if x is not None and not isinstance(x, bool)
            ]
        else:
            out["examples"] = None
    if "levelProbabilities" in out:
        lp = out["levelProbabilities"]
        if not isinstance(lp, dict):
            out["levelProbabilities"] = None
    return out


def _sanitize_occurrence(occ: dict[str, Any]) -> dict[str, Any] | None:
    """Coerce start/end to int (LLMs sometimes emit floats)."""
    try:
        s = occ.get("start")
        e = occ.get("end")
        if s is None or e is None:
            return None
        return {"start": int(s), "end": int(e)}
    except (TypeError, ValueError):
        return None


def _sanitize_extract_payload(data: dict[str, Any]) -> dict[str, Any]:
    """Fix common JSON mistakes from LLMs before Pydantic validation."""
    out = dict(data)
    items = out.get("items")
    if isinstance(items, list):
        cleaned = [_sanitize_item(x) for x in items if isinstance(x, dict)]
        out["items"] = [it for it in cleaned if it.get("term", "").strip() != ""]
    highlights = out.get("highlights")
    if isinstance(highlights, list):
        fixed: list[dict[str, Any]] = []
        for h in highlights:
            if not isinstance(h, dict):
                continue
            hh = dict(h)
            if "term" in hh:
                hh["term"] = _coerce_term(hh.get("term"))
            occs = hh.get("occurrences")
            if isinstance(occs, list):
                good = []
                for o in occs:
                    if isinstance(o, dict) and (so := _sanitize_occurrence(o)):
                        good.append(so)
                hh["occurrences"] = good
            fixed.append(hh)
        out["highlights"] = [h for h in fixed if h.get("term", "").strip() != ""]
    return out

DEFAULT_OLLAMA_BASE = "http://localhost:11434"
DEFAULT_OLLAMA_MODEL = "llama3.2"


def _ollama_base() -> str:
    return os.environ.get("OLLAMA_BASE_URL", DEFAULT_OLLAMA_BASE).rstrip("/")


def _ollama_model() -> str:
    return os.environ.get("OLLAMA_MODEL", DEFAULT_OLLAMA_MODEL)


def _build_messages(req: ExtractRequest) -> list[dict[str, str]]:
    system = """You are an English learning assistant. The user provides English text and a CEFR level (A1, A2, B1, B2, or C1).

Your task: identify words, expressions, and short phrases in the text that are useful for a learner at that CEFR level. Prefer items that clearly match the chosen level (not necessarily every rare word).

You MUST respond with a single JSON object only. No markdown fences, no commentary before or after.

The JSON must have exactly these keys:
- "level": string, same as the requested CEFR level
- "highlights": array of objects, each with "term" (string) and "occurrences" (array of {"start": int, "end": int})
- "items": array of objects with at least "term" (string). Optional string fields (use a real string or omit the key; never use true/false for text): "canonical", "kind", "definition", "whyThisMatches". Optional: "levelScore" (number 0-1), "levelProbabilities" (object), "examples" (array of strings)

Rules for highlights:
- "start" and "end" are 0-based character indices into the EXACT original user text (Unicode code points / Python string indices).
- "end" is exclusive (substring = text[start:end]).
- Every occurrence of a chosen term in the text should appear in "occurrences" if you list that term in highlights.
- Do not invent spans that do not match the text literally.

Rules for items:
- Each item should correspond to a term you highlight; use the same "term" string.
- Keep the list reasonably small (e.g. at most 25 items) for long texts.

If the text is empty of good matches, return empty arrays for highlights and items."""

    user = f"""CEFR level: {req.level}

Original text (use this exact string for index calculations):
---
{req.text}
---

Respond with JSON only."""

    return [
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ]


_JSON_FENCE_RE = re.compile(r"```(?:json)?\s*([\s\S]*?)```", re.IGNORECASE)


def _parse_json_object(raw: str) -> dict[str, Any]:
    raw = raw.strip()
    m = _JSON_FENCE_RE.search(raw)
    if m:
        raw = m.group(1).strip()
    # Try whole string first
    try:
        data = json.loads(raw)
        if isinstance(data, dict):
            return data
    except json.JSONDecodeError:
        pass
    # Find first { ... } balanced-ish fallback
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


def call_ollama_chat(messages: list[dict[str, str]], *, timeout_s: float = 300.0) -> str:
    base = _ollama_base()
    model = _ollama_model()
    url = f"{base}/api/chat"
    payload = {
        "model": model,
        "messages": messages,
        "stream": False,
        "format": "json",
    }
    with httpx.Client(timeout=timeout_s) as client:
        r = client.post(url, json=payload)
        r.raise_for_status()
        body = r.json()
    msg = body.get("message") or {}
    content = msg.get("content")
    if not isinstance(content, str):
        raise ValueError("Ollama response missing message.content")
    return content


def extract_via_ollama(req: ExtractRequest) -> ExtractResponse:
    messages = _build_messages(req)
    raw = call_ollama_chat(messages)
    data = _parse_json_object(raw)
    # Force level from request (avoid model mismatch)
    data["level"] = req.level
    data = _sanitize_extract_payload(data)
    return ExtractResponse.model_validate(data)
