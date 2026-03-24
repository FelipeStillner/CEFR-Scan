"""Call a local Ollama model to produce ExtractResponse-shaped JSON."""

from __future__ import annotations

import json
import os
import re
from typing import Any

import httpx

from .schemas import ExtractRequest, ExtractResponse
from .sanitize_payload import sanitize_payload

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
- Keep the list reasonably small (at most ~25 terms for long texts).
- If there are no good matches, return {"vocabulary": []}."""

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
    data = sanitize_payload(data)
    return ExtractResponse.model_validate(data)
