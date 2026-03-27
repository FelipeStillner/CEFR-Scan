"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  loadScanSession,
  normalizeClickedToken,
  saveScanSession,
  type ScanSession,
} from "@/lib/scanSession";
import {
  TRANSLATE_LANG_OPTIONS,
  TRANSLATE_LANG_STORAGE_KEY,
  isTranslateLang,
  translateCacheKey,
  type TranslateLang,
} from "@/lib/translatePrefs";

function splitForDisplay(text: string): { type: "space" | "word"; value: string }[] {
  if (!text) return [];
  const parts = text.split(/(\s+)/);
  return parts.map((value) => ({
    type: /^\s+$/.test(value) ? "space" : "word",
    value,
  }));
}

function googleSearchUrl(term: string): string {
  const q = encodeURIComponent(term);
  return `https://www.google.com/search?q=${q}`;
}

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export default function ScanPage() {
  const [session, setSession] = useState<ScanSession | null>(null);
  const [ready, setReady] = useState(false);
  const [definitions, setDefinitions] = useState<Record<string, string>>({});
  const [defLoading, setDefLoading] = useState(false);
  const [defError, setDefError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [translateLang, setTranslateLang] = useState<TranslateLang>("fr");
  const [translationCache, setTranslationCache] = useState<Record<string, string>>({});
  const [transLoading, setTransLoading] = useState<Record<string, boolean>>({});
  const [transError, setTransError] = useState<Record<string, string | null>>({});

  useEffect(() => {
    setSession(loadScanSession());
    try {
      const stored = localStorage.getItem(TRANSLATE_LANG_STORAGE_KEY);
      if (stored && isTranslateLang(stored)) setTranslateLang(stored);
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(TRANSLATE_LANG_STORAGE_KEY, translateLang);
    } catch {
      /* ignore */
    }
  }, [translateLang]);

  const persist = useCallback((next: ScanSession) => {
    setSession(next);
    saveScanSession(next);
  }, []);

  const addTerm = useCallback(
    (rawToken: string) => {
      const term = normalizeClickedToken(rawToken);
      if (!term || !session) return;
      const lower = term.toLowerCase();
      const exists = session.vocabulary.some((t) => t.toLowerCase() === lower);
      if (exists) return;
      persist({
        ...session,
        vocabulary: [...session.vocabulary, term],
      });
    },
    [session, persist],
  );

  const removeTerm = useCallback(
    (term: string) => {
      if (!session) return;
      persist({
        ...session,
        vocabulary: session.vocabulary.filter((t) => t !== term),
      });
    },
    [session, persist],
  );

  const translateTerm = useCallback(
    async (term: string) => {
      const key = translateCacheKey(term, translateLang);
      if (translationCache[key]) return;

      setTransLoading((prev) => ({ ...prev, [key]: true }));
      setTransError((prev) => ({ ...prev, [key]: null }));

      try {
        const resp = await fetch(`${apiBase}/api/translate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: term, target_lang: translateLang }),
        });
        const raw = await resp.text();
        if (!resp.ok) {
          throw new Error(raw || `HTTP ${resp.status}`);
        }
        const data = JSON.parse(raw) as { translated_text?: string };
        const text = data.translated_text;
        if (typeof text !== "string" || !text.trim()) {
          throw new Error("Invalid translation response.");
        }
        setTranslationCache((prev) => ({ ...prev, [key]: text.trim() }));
      } catch (e) {
        setTransError((prev) => ({
          ...prev,
          [key]: e instanceof Error ? e.message : "Translation failed.",
        }));
      } finally {
        setTransLoading((prev) => ({ ...prev, [key]: false }));
      }
    },
    [translateLang, translationCache],
  );

  useEffect(() => {
    if (!session?.vocabulary.length) {
      setDefinitions({});
      setDefLoading(false);
      setDefError(null);
      abortRef.current?.abort();
      return;
    }

    const terms = [...session.vocabulary];
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setDefLoading(true);
    setDefError(null);

    (async () => {
      try {
        const resp = await fetch(`${apiBase}/api/definitions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ terms }),
          signal: ac.signal,
        });
        if (!resp.ok) {
          const msg = await resp.text().catch(() => resp.statusText);
          throw new Error(msg || `HTTP ${resp.status}`);
        }
        const data = (await resp.json()) as {
          definitions: { term: string; definition: string }[];
        };
        const map: Record<string, string> = {};
        for (const row of data.definitions || []) {
          if (row.term && typeof row.definition === "string") {
            map[row.term] = row.definition;
          }
        }
        if (!ac.signal.aborted) {
          setDefinitions(map);
        }
      } catch (e) {
        if (ac.signal.aborted) return;
        setDefinitions({});
        setDefError(e instanceof Error ? e.message : "Could not load definitions.");
      } finally {
        if (!ac.signal.aborted) setDefLoading(false);
      }
    })();

    return () => ac.abort();
  }, [session?.vocabulary]);

  const segments = useMemo(() => (session ? splitForDisplay(session.text) : []), [session]);

  if (!ready) {
    return (
      <main className="container container-wide">
        <p className="muted">Loading…</p>
      </main>
    );
  }

  if (!session || !session.text) {
    return (
      <main className="container container-wide">
        <header className="header">
          <h1>No scan loaded</h1>
          <p className="subtitle">Start from the home page to paste text and find terms.</p>
        </header>
        <Link className="button" href="/">
          Back to home
        </Link>
      </main>
    );
  }

  return (
    <main className="container container-wide">
      <header className="scan-header">
        <div className="scan-header-main">
          <h1 className="scan-title">Review text & vocabulary</h1>
          <p className="subtitle">
            Level: <strong>{session.level}</strong> — click any word in the text to add it to your list.
          </p>
          <div className="translate-lang-bar">
            <label className="translate-lang-label" htmlFor="translate-lang">
              Translation language
            </label>
            <select
              id="translate-lang"
              className="translate-lang-select"
              value={translateLang}
              onChange={(e) => setTranslateLang(e.target.value as TranslateLang)}
            >
              {TRANSLATE_LANG_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="scan-header-actions">
          <Link className="button button-ghost" href="/">
            New scan
          </Link>
        </div>
      </header>

      <div className="scan-split">
        <section className="panel scan-pane">
          <h2 className="pane-heading">Text</h2>
          <div className="text-block preview" lang="en">
            {segments.map((seg, i) =>
              seg.type === "space" ? (
                <span key={i}>{seg.value}</span>
              ) : (
                <button
                  key={i}
                  type="button"
                  className="text-token"
                  title="Add word to vocabulary"
                  onClick={() => addTerm(seg.value)}
                >
                  {seg.value}
                </button>
              ),
            )}
          </div>
        </section>

        <section className="panel scan-pane">
          <h2 className="pane-heading">Vocabulary</h2>
          <p className="hint pane-hint">
            Seeded with terms from the scan. Add more by clicking words in the text. Definitions load
            automatically. Use Translation with the language chosen above.
          </p>
          {defLoading && session.vocabulary.length > 0 && (
            <p className="def-status muted" aria-live="polite">
              Loading definitions…
            </p>
          )}
          {defError && (
            <p className="def-status def-error" role="alert">
              {defError}
            </p>
          )}
          {session.vocabulary.length === 0 ? (
            <p className="empty">No terms yet. Click words in the text to add some.</p>
          ) : (
            <ul className="vocab-cards">
              {session.vocabulary.map((term) => {
                const tKey = translateCacheKey(term, translateLang);
                const tText = translationCache[tKey];
                const tLoad = transLoading[tKey];
                const tErr = transError[tKey];

                return (
                  <li key={term} className="vocab-card">
                    <div className="vocab-card-head">
                      <span className="vocab-term">{term}</span>
                      <button type="button" className="button button-ghost" onClick={() => removeTerm(term)}>
                        Remove
                      </button>
                    </div>
                    <p className="vocab-definition">
                      {defLoading && !definitions[term] ? (
                        <span className="muted">…</span>
                      ) : (
                        definitions[term] || (defError ? "—" : <span className="muted">…</span>)
                      )}
                    </p>
                    <div className="vocab-actions">
                      <button
                        type="button"
                        className="button"
                        disabled={!!tLoad}
                        onClick={() => translateTerm(term)}
                      >
                        {tLoad ? "Translating…" : "Translation"}
                      </button>
                      <a
                        className="button"
                        href={googleSearchUrl(term)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Google search
                      </a>
                    </div>
                    {tErr && (
                      <p className="vocab-translation vocab-translation-error" role="alert">
                        {tErr}
                      </p>
                    )}
                    {tText && !tErr && (
                      <p className="vocab-translation" lang={translateLang}>
                        {tText}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
