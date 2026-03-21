from typing import Any

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


def sanitize_payload(data: dict[str, Any]) -> dict[str, Any]:
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