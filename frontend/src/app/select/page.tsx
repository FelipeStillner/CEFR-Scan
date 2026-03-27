"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  loadScanSession,
  normalizeClickedToken,
  saveScanSession,
  type ScanSession,
} from "@/lib/scanSession";

function splitForDisplay(text: string): { type: "space" | "word"; value: string }[] {
  if (!text) return [];
  const parts = text.split(/(\s+)/);
  return parts.map((value) => ({
    type: /^\s+$/.test(value) ? "space" : "word",
    value,
  }));
}

export default function SelectPage() {
  const router = useRouter();
  const [session, setSession] = useState<ScanSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSession(loadScanSession());
    setReady(true);
  }, []);

  const persist = useCallback((next: ScanSession) => {
    setSession(next);
    saveScanSession(next);
  }, []);

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

  const onTextWordClick = useCallback(
    (rawToken: string) => {
      const term = normalizeClickedToken(rawToken);
      if (!term || !session) return;
      const lower = term.toLowerCase();
      const idx = session.vocabulary.findIndex((t) => t.toLowerCase() === lower);

      if (idx === -1) {
        persist({ ...session, vocabulary: [term, ...session.vocabulary] });
        return;
      }

      const existing = session.vocabulary[idx];
      if (idx === 0) return;
      const rest = session.vocabulary.filter((_, i) => i !== idx);
      persist({ ...session, vocabulary: [existing, ...rest] });
    },
    [session, persist],
  );

  const goToQuiz = useCallback(() => {
    if (!session || session.vocabulary.length === 0) return;
    persist({ ...session, studyVocabulary: [...session.vocabulary] });
    router.push("/quiz");
  }, [session, persist, router]);

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
          <h1 className="scan-title">Select unknown terms</h1>
          <p className="subtitle">
            Level: <strong>{session.level}</strong> — <strong>click words in the text</strong> to add them or
            bring them to the top of the list. Use <strong>Remove</strong> for words you do not need to study.
          </p>
        </div>
        <Link className="button button-ghost" href="/">
          New scan
        </Link>
      </header>

      <div className="scan-split">
        <section className="panel scan-pane">
          <h2 className="pane-heading">Text</h2>
          <p className="hint pane-hint">
            Click tokens to add a word to your list or move an existing word to the top.
          </p>
          <div className="text-block preview" lang="en">
            {segments.map((seg, i) =>
              seg.type === "space" ? (
                <span key={i}>{seg.value}</span>
              ) : (
                <button
                  key={i}
                  type="button"
                  className="text-token"
                  title="Add word to list or move to top"
                  onClick={() => onTextWordClick(seg.value)}
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
            Words you are studying from this text. Remove any you do not need before continuing.
          </p>
          {session.vocabulary.length === 0 ? (
            <p className="empty muted">No terms yet — click words in the text on the left to add them.</p>
          ) : (
            <ul className="vocab-cards">
              {session.vocabulary.map((term) => (
                <li key={term} className="vocab-card">
                  <div className="vocab-card-head">
                    <span className="vocab-term">{term}</span>
                    <button type="button" className="button button-ghost" onClick={() => removeTerm(term)}>
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="select-actions">
            <button
              type="button"
              className="button"
              disabled={session.vocabulary.length === 0}
              onClick={goToQuiz}
            >
              Go to quiz
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
