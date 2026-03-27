"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { loadScanSession, type ScanSession } from "@/lib/scanSession";

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

type QuizQuestion = {
  term: string;
  prompt: string;
  options: string[];
  correct_index: number;
};

type QuizResponse = {
  questions: QuizQuestion[];
};

function splitForDisplay(text: string): { type: "space" | "word"; value: string }[] {
  if (!text) return [];
  const parts = text.split(/(\s+)/);
  return parts.map((value) => ({
    type: /^\s+$/.test(value) ? "space" : "word",
    value,
  }));
}

export default function QuizPage() {
  const [session, setSession] = useState<ScanSession | null>(null);
  const [ready, setReady] = useState(false);
  const [quiz, setQuiz] = useState<QuizResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** Question index -> selected option index */
  const [picked, setPicked] = useState<Record<number, number>>({});

  useEffect(() => {
    setSession(loadScanSession());
    setReady(true);
  }, []);

  const vocabulary = useMemo(() => {
    if (!session) return [];
    if (session.studyVocabulary !== undefined) {
      return session.studyVocabulary;
    }
    return session.vocabulary;
  }, [session]);

  const text = session?.text ?? "";
  const segments = useMemo(() => splitForDisplay(text), [text]);

  const vocabKey = vocabulary.join("\u0001");

  const loadQuiz = useCallback(async () => {
    if (!session || vocabulary.length === 0) return;
    setLoading(true);
    setError(null);
    setQuiz(null);
    setPicked({});
    try {
      const resp = await fetch(`${apiBase}/api/quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: session.text, vocabulary }),
      });
      const raw = await resp.text();
      if (!resp.ok) {
        throw new Error(raw || `HTTP ${resp.status}`);
      }
      const data = JSON.parse(raw) as QuizResponse;
      setQuiz(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load quiz.");
    } finally {
      setLoading(false);
    }
  }, [session, vocabulary]);

  useEffect(() => {
    if (!ready || !session) return;
    if (vocabulary.length === 0) {
      setLoading(false);
      return;
    }
    loadQuiz();
  }, [ready, session, vocabKey, loadQuiz]);

  if (!ready) {
    return (
      <main className="container container-wide">
        <p className="muted">Loading…</p>
      </main>
    );
  }

  if (!session?.text) {
    return (
      <main className="container container-wide">
        <header className="header">
          <h1>No session</h1>
          <p className="subtitle">Start from the home page.</p>
        </header>
        <Link className="button" href="/">
          Back to home
        </Link>
      </main>
    );
  }

  if (vocabulary.length === 0) {
    return (
      <main className="container container-wide">
        <header className="header">
          <h1>No vocabulary</h1>
          <p className="subtitle">Select terms on the previous step first.</p>
        </header>
        <Link className="button" href="/select">
          Back to selection
        </Link>
      </main>
    );
  }

  const questions = quiz?.questions ?? [];

  return (
    <main className="container container-wide">
      <header className="scan-header">
        <div>
          <h1 className="scan-title">Quiz</h1>
          <p className="subtitle">
            Fill in the blank — each answer is one of your vocabulary words. One question per word.
          </p>
        </div>
        <div className="scan-header-actions">
          <Link className="button button-ghost" href="/select">
            Back to selection
          </Link>
          <Link className="button" href="/definitions">
            Go to definitions
          </Link>
        </div>
      </header>

      <div className="scan-split">
        <section className="panel scan-pane">
          <h2 className="pane-heading">Text</h2>
          <div className="text-block preview text-readonly" lang="en">
            {segments.map((seg, i) =>
              seg.type === "space" ? (
                <span key={i}>{seg.value}</span>
              ) : (
                <span key={i} className="text-plain">
                  {seg.value}
                </span>
              ),
            )}
          </div>
        </section>

        <section className="panel scan-pane">
          <h2 className="pane-heading">Questions</h2>
          {loading && <p className="muted">Generating quiz…</p>}
          {error && (
            <p className="def-error" role="alert">
              {error}
            </p>
          )}
          {error && (
            <button type="button" className="button" onClick={() => loadQuiz()}>
              Try again
            </button>
          )}
          {!loading && !error && questions.length === 0 && (
            <p className="empty muted">No questions returned.</p>
          )}
          {!loading && !error && questions.length > 0 && (
            <ol className="quiz-list">
              {questions.map((q, qi) => {
                const selected = picked[qi];
                const done = selected !== undefined;
                const correct = done && selected === q.correct_index;

                return (
                  <li key={`${q.term}-${qi}`} className="quiz-item">
                    <p className="quiz-prompt">{q.prompt}</p>
                    <ul className="quiz-options">
                      {q.options.map((opt, oi) => {
                        const id = `q${qi}-o${oi}`;
                        const isSel = selected === oi;
                        const isCorrectOpt = oi === q.correct_index;
                        let cls = "quiz-option-label";
                        if (done && isSel) cls += correct ? " quiz-option-correct" : " quiz-option-wrong";
                        if (done && !isSel && isCorrectOpt && !correct) cls += " quiz-option-reveal";

                        return (
                          <li key={id}>
                            <label className={cls}>
                              <input
                                type="radio"
                                name={`quiz-q-${qi}`}
                                className="quiz-option-input"
                                checked={isSel}
                                disabled={done}
                                onChange={() => setPicked((prev) => ({ ...prev, [qi]: oi }))}
                              />
                              <span>{opt}</span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>
    </main>
  );
}
