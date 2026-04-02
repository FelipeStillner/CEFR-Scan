"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ScanStepHeader } from "@/app/components/ScanStepHeader";
import { ScanStepNav } from "@/app/components/ScanStepNav";
import { loadWorkflowSession } from "@/app/helpers/workflowSession";
import { useScanSessionReset } from "@/app/hooks/useScanSessionReset";
import type { QuizQuestion, QuizState } from "@/app/types/workflow";

type ScoreSummary = {
  correct: number;
  total: number;
  percent: number;
  completed: boolean;
};

function buildSummary(quizState: QuizState | undefined, questions: QuizQuestion[] | undefined): ScoreSummary {
  const total = questions?.length ?? 0;
  const correct = quizState?.score ?? 0;
  const completed = total > 0 && (quizState?.index ?? 0) >= total;
  const percent = total > 0 ? Math.round((correct / total) * 100) : 0;
  return { correct, total, percent, completed };
}

export default function ResultsStepPage() {
  const router = useRouter();
  const onReset = useScanSessionReset();
  const [ready, setReady] = useState(false);

  const [text, setText] = useState("");
  const [vocabulary, setVocabulary] = useState<string[]>([]);
  const [quizOne, setQuizOne] = useState<QuizState | undefined>();
  const [quizOneQuestions, setQuizOneQuestions] = useState<QuizQuestion[] | undefined>();
  const [quizTwo, setQuizTwo] = useState<QuizState | undefined>();
  const [quizTwoQuestions, setQuizTwoQuestions] = useState<QuizQuestion[] | undefined>();

  useEffect(() => {
    const s = loadWorkflowSession();
    if (!s?.text?.trim()) {
      router.replace("/");
      return;
    }

    setText(s.text);
    setVocabulary(s.vocabulary);
    setQuizOne(s.quizOne);
    setQuizOneQuestions(s.quizOneQuestions);
    setQuizTwo(s.quizTwo);
    setQuizTwoQuestions(s.quizTwoQuestions);
    setReady(true);
  }, [router]);

  const quizOneSummary = useMemo(() => buildSummary(quizOne, quizOneQuestions), [quizOne, quizOneQuestions]);
  const quizTwoSummary = useMemo(() => buildSummary(quizTwo, quizTwoQuestions), [quizTwo, quizTwoQuestions]);

  if (!ready) {
    return (
      <main className="container container-wide scan-app">
        <div className="scan-app__loading">Loading your session...</div>
      </main>
    );
  }

  return (
    <main className="container container-wide scan-app">
      <ScanStepHeader phase={6} onReset={onReset} />

      <div className="scan-app__content">
        <div className="results-layout">
          <section className="panel scan-pane">
            <h2 className="pane-heading">Source text</h2>
            <div className="scan-pane-scroll">
              <p className="text-block preview" lang="en">
                {text}
              </p>
            </div>
          </section>

          <div className="results-right-column">
            <section className="panel results-quiz-panel">
              <h2 className="pane-heading">Quiz results</h2>
              <div className="results-quiz-grid">
                <div className="panel">
                  <h3 className="pane-heading">Quiz A</h3>
                  <p className="status">
                    Score: {quizOneSummary.correct} / {quizOneSummary.total} ({quizOneSummary.percent}%)
                  </p>
                  <p className="muted">{quizOneSummary.completed ? "Completed" : "Not completed"}</p>
                </div>

                <div className="panel">
                  <h3 className="pane-heading">Quiz B</h3>
                  <p className="status">
                    Score: {quizTwoSummary.correct} / {quizTwoSummary.total} ({quizTwoSummary.percent}%)
                  </p>
                  <p className="muted">{quizTwoSummary.completed ? "Completed" : "Not completed"}</p>
                </div>
              </div>
            </section>

            <section className="panel scan-pane">
              <h2 className="pane-heading">Final word list</h2>
              <div className="scan-pane-scroll">
                {vocabulary.length === 0 ? (
                  <p className="empty">No words selected.</p>
                ) : (
                  <ul className="vocab-cards">
                    {vocabulary.map((term) => (
                      <li key={term} className="vocab-card">
                        <div className="vocab-card-head">
                          <span className="vocab-term">{term}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>

      <ScanStepNav phase={6} showNext={false} />
    </main>
  );
}
