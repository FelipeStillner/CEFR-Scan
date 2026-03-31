"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { normalizeClickedToken, type EnglishLevel } from "@/lib/scanSession";
import {
  TRANSLATE_LANG_OPTIONS,
  TRANSLATE_LANG_STORAGE_KEY,
  isTranslateLang,
  translateCacheKey,
  type TranslateLang,
} from "@/lib/translatePrefs";

type ExtractResponse = {
  vocabulary: { term: string }[];
};

type QuizQuestion = {
  prompt: string;
  options: string[];
  answerIndex: number;
};

type Phase = 1 | 2 | 3 | 4 | 5;

const PHASE_TITLES: Record<Phase, string> = {
  1: "Phase 1 - Input & scan",
  2: "Phase 2 - Edit vocabulary",
  3: "Phase 3 - Initial quiz",
  4: "Phase 4 - Read-only review",
  5: "Phase 5 - Final quiz",
};

const QUIZ_TWO_QUESTIONS: QuizQuestion[] = [
  {
    prompt: "Which option is a noun?",
    options: ["quickly", "happiness", "under", "because"],
    answerIndex: 1,
  },
  {
    prompt: "Choose the sentence with correct punctuation.",
    options: [
      "I went home, and I cooked dinner.",
      "I went home and, I cooked dinner.",
      "I went home and I, cooked dinner.",
      "I went, home and I cooked dinner.",
    ],
    answerIndex: 0,
  },
  {
    prompt: "Which word is an adjective?",
    options: ["carefully", "mountain", "bright", "during"],
    answerIndex: 2,
  },
  {
    prompt: "Pick the best synonym of 'start'.",
    options: ["finish", "begin", "forget", "close"],
    answerIndex: 1,
  },
  {
    prompt: "Which sentence is in past tense?",
    options: [
      "She walks to school every day.",
      "She is walking to school now.",
      "She walked to school yesterday.",
      "She will walk to school tomorrow.",
    ],
    answerIndex: 2,
  },
];

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

function normalizeAndSortTerms(rawTerms: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const raw of rawTerms) {
    const term = normalizeClickedToken(raw);
    if (!term) continue;
    const normalized = term.toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    output.push(term);
  }

  output.sort((a, b) => a.localeCompare(b));
  return output;
}

type QuizState = {
  index: number;
  score: number;
  answered: boolean;
  selectedIndex: number | null;
};

const initialQuizState: QuizState = {
  index: 0,
  score: 0,
  answered: false,
  selectedIndex: null,
};

function QuizBlock({
  title,
  showText,
  text,
  questions,
  quizState,
  onChoose,
  onSkip,
  onNext,
}: {
  title: string;
  showText: boolean;
  text: string;
  questions: QuizQuestion[];
  quizState: QuizState;
  onChoose: (index: number) => void;
  onSkip: () => void;
  onNext: () => void;
}) {
  const done = quizState.index >= questions.length;

  if (!questions.length) {
    return (
      <section className="panel scan-pane">
        <h2 className="pane-heading">{title}</h2>
        <p className="muted">No questions available.</p>
      </section>
    );
  }

  if (done) {
    return (
      <section className="panel scan-pane">
        <h2 className="pane-heading">{title}</h2>
        <p className="quiz-score">Score: {quizState.score}/{questions.length}</p>
        <p className="muted">Quiz complete.</p>
      </section>
    );
  }

  const q = questions[quizState.index];

  return (
    <div className="scan-split">
      {showText && (
        <section className="panel scan-pane">
          <h2 className="pane-heading">Text</h2>
          <p className="text-block preview" lang="en">
            {text}
          </p>
        </section>
      )}

      <section className="panel scan-pane">
        <h2 className="pane-heading">{title}</h2>
        <p className="quiz-score">
          Score: {quizState.score}/{questions.length}
        </p>
        <p className="quiz-progress">
          Question {quizState.index + 1}/{questions.length}
        </p>

        <p className="quiz-prompt">{q.prompt}</p>

        <div className="quiz-options" role="list">
          {q.options.map((opt, idx) => {
            const isSelected = quizState.selectedIndex === idx;
            const isCorrect = idx === q.answerIndex;
            const showResult = quizState.answered;
            let cls = "quiz-option";
            if (showResult && isCorrect) cls += " quiz-option-correct";
            if (showResult && isSelected && !isCorrect) cls += " quiz-option-wrong";

            return (
              <button
                key={opt}
                type="button"
                className={cls}
                disabled={quizState.answered}
                onClick={() => onChoose(idx)}
              >
                {opt}
              </button>
            );
          })}
        </div>

        <div className="quiz-actions">
          {!quizState.answered && (
            <button type="button" className="button button-ghost" onClick={onSkip}>
              Skip
            </button>
          )}
          {quizState.answered && (
            <button type="button" className="button" onClick={onNext}>
              {quizState.index === questions.length - 1 ? "Finish quiz" : "Next question"}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export default function Home() {
  const [phase, setPhase] = useState<Phase>(1);

  const [text, setText] = useState("");
  const [level, setLevel] = useState<EnglishLevel>("Beginner");
  const [vocabulary, setVocabulary] = useState<string[]>([]);
  const [manualTerm, setManualTerm] = useState("");
  const [scanStatus, setScanStatus] = useState("");
  const [isScanning, setIsScanning] = useState(false);

  const [definitions, setDefinitions] = useState<Record<string, string>>({});
  const [defLoading, setDefLoading] = useState(false);
  const [defError, setDefError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [translateLang, setTranslateLang] = useState<TranslateLang>("fr");
  const [translationCache, setTranslationCache] = useState<Record<string, string>>({});
  const [transLoading, setTransLoading] = useState<Record<string, boolean>>({});
  const [transError, setTransError] = useState<Record<string, string | null>>({});

  const [quizOne, setQuizOne] = useState<QuizState>(initialQuizState);
  const [quizTwo, setQuizTwo] = useState<QuizState>(initialQuizState);
  const [quizOneQuestions, setQuizOneQuestions] = useState<QuizQuestion[]>([]);
  const [quizOneStatus, setQuizOneStatus] = useState("");
  const [isGeneratingQuizOne, setIsGeneratingQuizOne] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(TRANSLATE_LANG_STORAGE_KEY);
      if (stored && isTranslateLang(stored)) setTranslateLang(stored);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(TRANSLATE_LANG_STORAGE_KEY, translateLang);
    } catch {
      /* ignore */
    }
  }, [translateLang]);

  const segments = useMemo(() => splitForDisplay(text), [text]);

  const addRawTerm = useCallback((rawToken: string) => {
    const nextTerm = normalizeClickedToken(rawToken);
    if (!nextTerm) return;
    setVocabulary((prev) => normalizeAndSortTerms([...prev, nextTerm]));
  }, []);

  const removeTerm = useCallback((term: string) => {
    const lower = term.toLowerCase();
    setVocabulary((prev) => prev.filter((t) => t.toLowerCase() !== lower));
  }, []);

  const addManualTerm = useCallback(() => {
    if (!manualTerm.trim()) return;
    setVocabulary((prev) => normalizeAndSortTerms([...prev, manualTerm]));
    setManualTerm("");
  }, [manualTerm]);

  const runScan = useCallback(async () => {
    if (!text.trim() || isScanning) return;

    setIsScanning(true);
    setScanStatus("Finding terms...");

    try {
      const resp = await fetch(`${apiBase}/api/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, level }),
      });

      if (!resp.ok) {
        const msg = await resp.text().catch(() => resp.statusText);
        setScanStatus(`Error: ${msg}`);
        return;
      }

      const data = (await resp.json()) as ExtractResponse;
      const terms = (data.vocabulary || []).map((v) => v.term);
      setVocabulary(normalizeAndSortTerms(terms));
      setDefinitions({});
      setTranslationCache({});
      setTransLoading({});
      setTransError({});
      setQuizOne(initialQuizState);
      setQuizTwo(initialQuizState);
      setQuizOneQuestions([]);
      setQuizOneStatus("");

      setScanStatus("");
      setPhase(2);
    } finally {
      setIsScanning(false);
    }
  }, [isScanning, text, level]);

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
        const translated = data.translated_text;
        if (typeof translated !== "string" || !translated.trim()) {
          throw new Error("Invalid translation response.");
        }
        setTranslationCache((prev) => ({ ...prev, [key]: translated.trim() }));
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
    if (phase !== 4) return;

    if (!vocabulary.length) {
      setDefinitions({});
      setDefLoading(false);
      setDefError(null);
      abortRef.current?.abort();
      return;
    }

    const terms = [...vocabulary];
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
  }, [phase, vocabulary]);

  const generateQuizOne = useCallback(async () => {
    if (!text.trim()) return;
    if (vocabulary.length < 4) {
      setQuizOneQuestions([]);
      setQuizOneStatus("Select at least 4 vocabulary words to generate Quiz 1.");
      return;
    }

    setIsGeneratingQuizOne(true);
    setQuizOneStatus("Generating quiz...");
    setQuizOne(initialQuizState);

    try {
      const resp = await fetch(`${apiBase}/api/quiz-one`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, terms: vocabulary }),
      });

      if (!resp.ok) {
        const msg = await resp.text().catch(() => resp.statusText);
        throw new Error(msg || `HTTP ${resp.status}`);
      }

      const data = (await resp.json()) as { questions?: QuizQuestion[] };
      const questions = Array.isArray(data.questions) ? data.questions : [];
      if (!questions.length) {
        throw new Error("No quiz questions were returned.");
      }

      setQuizOneQuestions(questions);
      setQuizOneStatus("");
    } catch (e) {
      setQuizOneQuestions([]);
      setQuizOneStatus(e instanceof Error ? `Quiz generation failed: ${e.message}` : "Quiz generation failed.");
    } finally {
      setIsGeneratingQuizOne(false);
    }
  }, [text, vocabulary]);

  useEffect(() => {
    if (phase !== 3) return;
    void generateQuizOne();
  }, [phase, generateQuizOne]);

  const answerQuiz = useCallback((which: "first" | "second", selectedIndex: number) => {
    const setter = which === "first" ? setQuizOne : setQuizTwo;
    const questions = which === "first" ? quizOneQuestions : QUIZ_TWO_QUESTIONS;
    setter((prev) => {
      if (prev.answered || prev.index >= questions.length) return prev;
      const q = questions[prev.index];
      const correct = selectedIndex === q.answerIndex;
      return {
        ...prev,
        answered: true,
        selectedIndex,
        score: correct ? prev.score + 1 : prev.score,
      };
    });
  }, [quizOneQuestions]);

  const skipQuiz = useCallback((which: "first" | "second") => {
    const setter = which === "first" ? setQuizOne : setQuizTwo;
    const questions = which === "first" ? quizOneQuestions : QUIZ_TWO_QUESTIONS;
    setter((prev) => {
      if (prev.answered || prev.index >= questions.length) return prev;
      return {
        ...prev,
        answered: true,
        selectedIndex: null,
      };
    });
  }, [quizOneQuestions]);

  const nextQuiz = useCallback((which: "first" | "second") => {
    const setter = which === "first" ? setQuizOne : setQuizTwo;
    const questions = which === "first" ? quizOneQuestions : QUIZ_TWO_QUESTIONS;
    setter((prev) => {
      if (prev.index >= questions.length) return prev;
      const nextIndex = prev.index + 1;
      return {
        ...prev,
        index: nextIndex,
        answered: false,
        selectedIndex: null,
      };
    });
  }, [quizOneQuestions]);

  const canAdvanceTo3 = vocabulary.length >= 4;
  const canAdvanceTo4 = quizOneQuestions.length > 0 && quizOne.index >= quizOneQuestions.length;
  const canAdvanceTo5 = true;

  const canAdvancePhase =
    (phase === 1 && !!text.trim() && !isScanning && !scanStatus) ||
    (phase === 2 && canAdvanceTo3) ||
    (phase === 3 && canAdvanceTo4) ||
    (phase === 4 && canAdvanceTo5);

  const resetWorkflow = () => {
    setPhase(1);
    setVocabulary([]);
    setDefinitions({});
    setDefLoading(false);
    setDefError(null);
    setTranslationCache({});
    setTransLoading({});
    setTransError({});
    setManualTerm("");
    setScanStatus("");
    setIsScanning(false);
    setQuizOne(initialQuizState);
    setQuizTwo(initialQuizState);
    setQuizOneQuestions([]);
    setQuizOneStatus("");
    setIsGeneratingQuizOne(false);
  };

  return (
    <main className="container container-wide">
      <header className="scan-header">
        <div className="scan-header-main">
          <h1 className="scan-title">CEFR Scan Workflow</h1>
          <p className="subtitle">{PHASE_TITLES[phase]}</p>
          <ol className="phase-tracker" aria-label="Workflow phases">
            <li className={phase >= 1 ? "active" : ""}>1. Input</li>
            <li className={phase >= 2 ? "active" : ""}>2. Edit words</li>
            <li className={phase >= 3 ? "active" : ""}>3. Quiz 1</li>
            <li className={phase >= 4 ? "active" : ""}>4. Review</li>
            <li className={phase >= 5 ? "active" : ""}>5. Quiz 2</li>
          </ol>
        </div>
        <div className="scan-header-actions">
          {phase > 1 && (
            <button type="button" className="button button-ghost" onClick={resetWorkflow}>
              Start over
            </button>
          )}
        </div>
      </header>

      {phase === 1 && (
        <section className="panel">
          <h2 className="pane-heading">Phase 1: Input text and start scan</h2>
          <label className="field">
            <span className="label">English text</span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={10}
              placeholder="Paste an English paragraph here..."
              required
            />
          </label>

          <label className="field">
            <span className="label">English level</span>
            <select value={level} onChange={(e) => setLevel(e.target.value as EnglishLevel)} required>
              <option value="Beginner">Beginner</option>
              <option value="Intermediary">Intermediary</option>
              <option value="Advanced">Advanced</option>
            </select>
          </label>

          <div className="flow-actions">
            {!!text.trim() && !isScanning && (
              <button type="button" className="button" onClick={runScan}>
                Start scan
              </button>
            )}
          </div>

          <p className="status" aria-live="polite">
            {isScanning ? "Finding terms..." : scanStatus}
          </p>
        </section>
      )}

      {phase === 2 && (
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
                    onClick={() => addRawTerm(seg.value)}
                  >
                    {seg.value}
                  </button>
                ),
              )}
            </div>
          </section>

          <section className="panel scan-pane">
            <h2 className="pane-heading">Vocabulary list (editable)</h2>
            <p className="hint pane-hint">
              Add words by clicking the text or manually typing one below. Remove words you already know.
            </p>
            {vocabulary.length < 4 && (
              <p className="hint pane-hint">You need at least 4 selected words to start Quiz 1.</p>
            )}

            <div className="inline-add">
              <input
                className="text-input"
                type="text"
                value={manualTerm}
                onChange={(e) => setManualTerm(e.target.value)}
                placeholder="Add a word manually"
              />
              {!!manualTerm.trim() && (
                <button type="button" className="button" onClick={addManualTerm}>
                  Add
                </button>
              )}
            </div>

            <div className="vocab-scroll">
              {vocabulary.length === 0 ? (
                <p className="empty">No terms yet. Click words in the text or add one manually.</p>
              ) : (
                <ul className="vocab-cards">
                  {vocabulary.map((term) => (
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
            </div>
          </section>
        </div>
      )}

      {phase === 3 && (
        <>
          {isGeneratingQuizOne && (
            <section className="panel scan-pane">
              <h2 className="pane-heading">Phase 3: Initial quiz</h2>
              <p className="muted">Generating quiz...</p>
            </section>
          )}

          {!isGeneratingQuizOne && quizOneStatus && (
            <section className="panel scan-pane">
              <h2 className="pane-heading">Phase 3: Initial quiz</h2>
              <p className="def-status def-error" role="alert">
                {quizOneStatus}
              </p>
              <div className="flow-actions">
                <button type="button" className="button" onClick={() => void generateQuizOne()}>
                  Retry quiz generation
                </button>
              </div>
            </section>
          )}

          {!isGeneratingQuizOne && !quizOneStatus && quizOneQuestions.length > 0 && (
            <QuizBlock
              title="Phase 3: Initial quiz"
              showText={true}
              text={text}
              questions={quizOneQuestions}
              quizState={quizOne}
              onChoose={(idx) => answerQuiz("first", idx)}
              onSkip={() => skipQuiz("first")}
              onNext={() => nextQuiz("first")}
            />
          )}
        </>
      )}

      {phase === 4 && (
        <div className="scan-split">
          <section className="panel scan-pane">
            <h2 className="pane-heading">Text</h2>
            <p className="text-block preview" lang="en">
              {text}
            </p>
          </section>

          <section className="panel scan-pane">
            <h2 className="pane-heading">Vocabulary (read-only)</h2>
            <p className="hint pane-hint">Definitions and translations are available, but word edits are disabled.</p>

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

            {defLoading && vocabulary.length > 0 && (
              <p className="def-status muted" aria-live="polite">
                Loading definitions...
              </p>
            )}
            {defError && (
              <p className="def-status def-error" role="alert">
                {defError}
              </p>
            )}

            <div className="vocab-scroll">
              {vocabulary.length === 0 ? (
                <p className="empty">No terms available.</p>
              ) : (
                <ul className="vocab-cards">
                  {vocabulary.map((term) => {
                    const tKey = translateCacheKey(term, translateLang);
                    const tText = translationCache[tKey];
                    const tLoad = transLoading[tKey];
                    const tErr = transError[tKey];

                    return (
                      <li key={term} className="vocab-card">
                        <div className="vocab-card-head">
                          <span className="vocab-term">{term}</span>
                        </div>
                        <p className="vocab-definition">
                          {defLoading && !definitions[term] ? (
                            <span className="muted">...</span>
                          ) : (
                            definitions[term] || (defError ? "-" : <span className="muted">...</span>)
                          )}
                        </p>

                        <div className="vocab-actions">
                          {!tLoad && (
                            <button type="button" className="button" onClick={() => translateTerm(term)}>
                              Translation
                            </button>
                          )}
                          {tLoad && <span className="muted">Translating...</span>}
                          <a className="button" href={googleSearchUrl(term)} target="_blank" rel="noopener noreferrer">
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
            </div>
          </section>
        </div>
      )}

      {phase === 5 && (
        <QuizBlock
          title="Phase 5: Final quiz"
          showText={false}
          text={text}
          questions={QUIZ_TWO_QUESTIONS}
          quizState={quizTwo}
          onChoose={(idx) => answerQuiz("second", idx)}
          onSkip={() => skipQuiz("second")}
          onNext={() => nextQuiz("second")}
        />
      )}

      <footer className="flow-nav panel">
        <div className="flow-nav-buttons">
          {phase > 1 && (
            <button type="button" className="button button-ghost" onClick={() => setPhase((phase - 1) as Phase)}>
              Back
            </button>
          )}

          {phase < 5 && canAdvancePhase && (
            <button type="button" className="button" onClick={() => setPhase((phase + 1) as Phase)}>
              Next phase
            </button>
          )}
        </div>
      </footer>
    </main>
  );
}
