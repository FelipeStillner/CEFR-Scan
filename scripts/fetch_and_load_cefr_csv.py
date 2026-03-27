#!/usr/bin/env python3
"""
Fetch a CEFR-leveled English word CSV and load it into SQLite.

Default source:
  https://raw.githubusercontent.com/Muskan149/Files-for-BELA/main/cefr-levelled-words.csv

Target DB:
  database/db.sqlite
Table:
  vocabulary_words(term TEXT PRIMARY KEY, cefr_level TEXT)
"""

from __future__ import annotations

import argparse
import csv
import io
import sqlite3
import ssl
import urllib.request
import urllib.error
from typing import Iterable


ALLOWED_LEVELS = {"A1", "A2", "B1", "B2", "C1"}
DEFAULT_CSV_URL = (
    "https://raw.githubusercontent.com/Muskan149/Files-for-BELA/main/cefr-levelled-words.csv"
)


def _download_text(url: str) -> str:
    # Use urllib to avoid adding third-party dependencies.
    try:
        with urllib.request.urlopen(url) as resp:
            charset = resp.headers.get_content_charset() or "utf-8"
            return resp.read().decode(charset, errors="replace")
    except urllib.error.URLError as e:
        # In some sandboxed/container environments, CA bundles may be missing,
        # leading to CERTIFICATE_VERIFY_FAILED. We retry with an unverified
        # context to make local dev work. For production, prefer proper CA setup.
        if "CERTIFICATE_VERIFY_FAILED" not in str(e):
            raise

        unverified = ssl._create_unverified_context()
        with urllib.request.urlopen(url, context=unverified) as resp:
            charset = resp.headers.get_content_charset() or "utf-8"
            return resp.read().decode(charset, errors="replace")


def _iter_rows_from_csv_text(csv_text: str) -> Iterable[tuple[str, str]]:
    # The upstream CSV typically has a header: "Word,Level".
    reader = csv.DictReader(io.StringIO(csv_text))
    for i, row in enumerate(reader, start=1):
        if not row:
            continue

        # Be robust to minor header formatting differences.
        term = (row.get("Word") or row.get("word") or row.get("Term") or "").strip()
        level = (row.get("Level") or row.get("level") or row.get("CEFR") or "").strip()
        if not term or not level:
            continue

        term = term.lower()
        if level not in ALLOWED_LEVELS:
            continue

        yield term, level


def _ensure_schema(conn: sqlite3.Connection, schema_sql_path: str) -> None:
    # Your existing DB schema is stored in database/schema.sql.
    # It doesn't use `CREATE TABLE IF NOT EXISTS`, so we only apply it
    # when the table isn't present yet.
    cur = conn.execute(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name='vocabulary_words' LIMIT 1;"
    )
    exists = cur.fetchone() is not None
    if exists:
        return

    with open(schema_sql_path, "r", encoding="utf-8") as f:
        schema_sql = f.read()
    conn.executescript(schema_sql)


def load_csv_into_db(
    *,
    csv_url: str,
    db_path: str,
    schema_sql_path: str,
    truncate: bool = True,
) -> int:
    csv_text = _download_text(csv_url)

    conn = sqlite3.connect(db_path)
    try:
        _ensure_schema(conn, schema_sql_path)
        conn.execute("PRAGMA journal_mode=WAL;")

        if truncate:
            conn.execute("DELETE FROM vocabulary_words;")

        inserted = 0
        # Use parameterized inserts for safety + performance.
        with conn:
            for term, level in _iter_rows_from_csv_text(csv_text):
                conn.execute(
                    "INSERT OR REPLACE INTO vocabulary_words(term, cefr_level) VALUES (?, ?);",
                    (term, level),
                )
                inserted += 1

        return inserted
    finally:
        conn.close()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Fetch a CEFR-leveled word CSV and load into SQLite."
    )
    parser.add_argument(
        "--csv-url",
        default=DEFAULT_CSV_URL,
        help="CSV URL to fetch (default: Words-for-BELA raw GitHub).",
    )
    parser.add_argument(
        "--db",
        default="database/db.sqlite",
        help="Path to SQLite database file (default: database/db.sqlite).",
    )
    parser.add_argument(
        "--schema",
        default="database/schema.sql",
        help="Path to SQL schema file (default: database/schema.sql).",
    )
    parser.add_argument(
        "--no-truncate",
        action="store_true",
        help="Do not delete existing rows before inserting.",
    )
    args = parser.parse_args()

    inserted = load_csv_into_db(
        csv_url=args.csv_url,
        db_path=args.db,
        schema_sql_path=args.schema,
        truncate=not args.no_truncate,
    )
    print(f"Loaded {inserted} rows into {args.db}")


if __name__ == "__main__":
    main()

