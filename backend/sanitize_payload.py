from typing import Any


def _coerce_term(value: Any) -> str:
    if isinstance(value, str):
        return value.strip()
    if value is None or isinstance(value, bool):
        return ""
    return str(value).strip()


def sanitize_payload(data: dict[str, Any]) -> dict[str, Any]:
    """Normalize model output into the simplified schema: { vocabulary: [{term}] }."""
    out = dict(data)

    # Primary expected key for the simplified API
    raw_vocab = out.get("vocabulary")

    # Backward-compatible fallback: accept legacy "items" and map to vocabulary terms.
    if not isinstance(raw_vocab, list):
        raw_vocab = out.get("items") if isinstance(out.get("items"), list) else []

    vocabulary: list[dict[str, str]] = []
    for entry in raw_vocab:
        if isinstance(entry, dict):
            term = _coerce_term(entry.get("term"))
        else:
            term = _coerce_term(entry)
        if term:
            vocabulary.append({"term": term})

    out["vocabulary"] = vocabulary

    # Strip legacy keys that are no longer part of ExtractResponse.
    out.pop("items", None)
    out.pop("highlights", None)
    out.pop("level", None)

    return out