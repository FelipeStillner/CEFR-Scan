"""Translate English text using the MyMemory public API (https://mymemory.translated.net)."""

from __future__ import annotations

import httpx

from .schemas import TranslateRequest, TranslateResponse

MYMEMORY_GET = "https://api.mymemory.translated.net/get"
SOURCE_LANG = "en"


async def translate_via_mymemory(req: TranslateRequest) -> TranslateResponse:
    text = req.text.strip()
    target = req.target_lang
    langpair = f"{SOURCE_LANG}|{target}"
    params = {"q": text, "langpair": langpair}

    timeout = httpx.Timeout(25.0, connect=10.0)
    async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
        r = await client.get(MYMEMORY_GET, params=params)
        r.raise_for_status()

    try:
        data = r.json()
    except ValueError as e:
        raise ValueError(f"Invalid JSON from translation service: {e!s}") from e

    status = data.get("responseStatus")
    if status is not None and str(status) != "200":
        msg = data.get("responseDetails") or "Translation service error"
        raise ValueError(str(msg))

    rd = data.get("responseData")
    if not isinstance(rd, dict):
        raise ValueError("Missing responseData from translation service")

    translated = rd.get("translatedText")
    if not isinstance(translated, str) or not translated.strip():
        raise ValueError("Empty translation in response")

    # MyMemory sometimes echoes quota warnings inside the string.
    if "MYMEMORY WARNING" in translated.upper():
        raise ValueError("Translation quota or rate limit reached. Try again later.")

    return TranslateResponse(translated_text=translated.strip())
