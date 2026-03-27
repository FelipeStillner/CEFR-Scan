"""Fetch English definitions from the Free Dictionary API (https://dictionaryapi.dev)."""

from __future__ import annotations

import asyncio
from typing import Any
from urllib.parse import quote

import httpx

from .schemas import DefinitionsRequest, DefinitionsResponse, TermDefinition

FREE_DICTIONARY_BASE = "https://api.dictionaryapi.dev/api/v2/entries/en"
MAX_DEF_CHARS = 1200


def _format_entry_payload(data: Any) -> str:
    """Turn API JSON into a short learner-friendly string."""
    if not isinstance(data, list) or not data:
        return ""
    parts: list[str] = []
    for entry in data[:2]:
        if not isinstance(entry, dict):
            continue
        meanings = entry.get("meanings")
        if not isinstance(meanings, list):
            continue
        for m in meanings[:4]:
            if not isinstance(m, dict):
                continue
            pos = m.get("partOfSpeech")
            pos_label = f"{pos}: " if isinstance(pos, str) and pos.strip() else ""
            defs = m.get("definitions")
            if not isinstance(defs, list):
                continue
            for d in defs[:3]:
                if not isinstance(d, dict):
                    continue
                txt = d.get("definition")
                if isinstance(txt, str) and txt.strip():
                    parts.append(f"{pos_label}{txt.strip()}")
                if len(parts) >= 8:
                    break
            if len(parts) >= 8:
                break
        if len(parts) >= 8:
            break
    out = " ".join(parts)
    if len(out) > MAX_DEF_CHARS:
        out = out[: MAX_DEF_CHARS - 1].rstrip() + "…"
    return out


def _url_for_term(term: str) -> str:
    # Encode path segment; keep apostrophes readable for APIs that accept them.
    encoded = quote(term.strip(), safe="'")
    return f"{FREE_DICTIONARY_BASE}/{encoded}"


async def _fetch_one(client: httpx.AsyncClient, term: str) -> TermDefinition:
    url = _url_for_term(term)
    try:
        r = await client.get(url)
    except httpx.RequestError as e:
        return TermDefinition(term=term, definition=f"Could not reach dictionary service. ({e!s})")

    if r.status_code == 404:
        return TermDefinition(
            term=term,
            definition="No dictionary entry for this term. It may be a phrase, a proper name, or a rare form—try Google search.",
        )
    try:
        r.raise_for_status()
    except httpx.HTTPStatusError:
        return TermDefinition(term=term, definition="Dictionary lookup failed for this term.")

    try:
        data = r.json()
    except ValueError:
        return TermDefinition(term=term, definition="Invalid response from dictionary service.")

    text = _format_entry_payload(data)
    if not text:
        return TermDefinition(
            term=term,
            definition="No definition text in the entry. Try Google search for more context.",
        )
    return TermDefinition(term=term, definition=text)


async def define_terms_from_dictionary(req: DefinitionsRequest) -> DefinitionsResponse:
    terms = list(req.terms)
    if not terms:
        return DefinitionsResponse(definitions=[])

    timeout = httpx.Timeout(20.0, connect=10.0)
    limits = httpx.Limits(max_connections=20, max_keepalive_connections=10)
    async with httpx.AsyncClient(timeout=timeout, limits=limits, follow_redirects=True) as client:
        results = await asyncio.gather(*(_fetch_one(client, t) for t in terms))
    return DefinitionsResponse(definitions=list(results))
