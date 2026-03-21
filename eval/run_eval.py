#!/usr/bin/env python3
"""
Run extract fixtures against the API and save responses for manual review.

From repo root:
  python eval/run_eval.py
  API_BASE_URL=http://127.0.0.1:8000 python eval/run_eval.py

Requires backend running (e.g. make run-backend) and Ollama if using LLM extract.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path


def repo_root() -> Path:
    return Path(__file__).resolve().parent.parent


def load_cases(path: Path) -> list[dict]:
    data = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(data, dict) and "cases" in data:
        cases = data["cases"]
    elif isinstance(data, list):
        cases = data
    else:
        raise ValueError('Fixture file must contain { "cases": [...] } or a JSON array')
    out: list[dict] = []
    for i, c in enumerate(cases):
        if not isinstance(c, dict):
            continue
        cid = c.get("id") or f"case-{i}"
        text = c.get("text")
        level = c.get("level")
        if not text or not level:
            print(f"skip {cid}: missing text or level", file=sys.stderr)
            continue
        out.append({"id": str(cid), "text": str(text), "level": str(level)})
    return out


def post_extract(base: str, text: str, level: str, timeout_s: float) -> tuple[int, object]:
    url = base.rstrip("/") + "/api/extract"
    body = json.dumps({"text": text, "level": level}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout_s) as resp:
            raw = resp.read().decode("utf-8")
            code = resp.getcode()
            return code, json.loads(raw)
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")
        try:
            detail: object = json.loads(err_body)
        except json.JSONDecodeError:
            detail = err_body
        return e.code, detail
    except urllib.error.URLError as e:
        return 0, str(e.reason) if e.reason else str(e)


def rel_to(root: Path, p: Path) -> str:
    try:
        return str(p.relative_to(root))
    except ValueError:
        return str(p)


def main() -> int:
    root = repo_root()
    ap = argparse.ArgumentParser(description="Run CEFR extract eval fixtures against the API")
    ap.add_argument(
        "--base-url",
        default=os.environ.get("API_BASE_URL", "http://127.0.0.1:8000"),
        help="Backend base URL (default: API_BASE_URL or http://127.0.0.1:8000)",
    )
    ap.add_argument(
        "--fixtures",
        type=Path,
        default=root / "eval" / "json" / "cases.json",
        help="Path to cases JSON",
    )
    ap.add_argument(
        "--out",
        type=Path,
        default=root / "eval" / "runs",
        help="Directory to write run output under",
    )
    ap.add_argument("--timeout", type=float, default=600.0, help="HTTP timeout per request (seconds)")
    args = ap.parse_args()

    fixtures_path = args.fixtures if args.fixtures.is_absolute() else root / args.fixtures
    if not fixtures_path.is_file():
        print(f"Fixtures not found: {fixtures_path}", file=sys.stderr)
        return 1

    try:
        cases = load_cases(fixtures_path)
    except (OSError, json.JSONDecodeError, ValueError) as e:
        print(f"Failed to load fixtures: {e}", file=sys.stderr)
        return 1

    if not cases:
        print("No cases to run.", file=sys.stderr)
        return 1

    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    out_base = args.out if args.out.is_absolute() else root / args.out
    run_dir = out_base / stamp
    run_dir.mkdir(parents=True, exist_ok=True)

    meta: dict = {
        "created_at": stamp,
        "base_url": args.base_url,
        "fixtures": rel_to(root, fixtures_path),
        "cases": [],
    }

    for case in cases:
        cid = case["id"]
        print(f"Running {cid} ({case['level']})...", flush=True)
        status, payload = post_extract(args.base_url, case["text"], case["level"], args.timeout)
        entry = {
            "id": cid,
            "level": case["level"],
            "http_status": status,
            "ok": 200 <= status < 300,
        }
        safe_id = "".join(c if c.isalnum() or c in "-_" else "_" for c in cid)
        out_path = run_dir / f"response-{safe_id}.json"
        out_path.write_text(
            json.dumps(
                {
                    "request": {"text": case["text"], "level": case["level"]},
                    "http_status": status,
                    "response": payload,
                },
                ensure_ascii=False,
                indent=2,
            )
            + "\n",
            encoding="utf-8",
        )
        entry["saved_to"] = rel_to(root, out_path)
        meta["cases"].append(entry)

    summary_path = run_dir / "summary.json"
    summary_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"\nWrote {len(cases)} responses under: {rel_to(root, run_dir)}", flush=True)
    print(f"Summary: {rel_to(root, summary_path)}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
