"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadWorkflowSession, patchWorkflowSession } from "@/app/helpers/workflowSession";
import { QuizPanel } from "@/app/components/QuizPanel";
import { ScanStepNav } from "@/app/components/ScanStepNav";
import { ScanStepHeader } from "@/app/components/ScanStepHeader";
import { FINAL_QUIZ_QUESTIONS, initialQuizState } from "@/app/helpers/fixedQuiz";
import { useScanSessionReset } from "@/app/hooks/useScanSessionReset";

export default function FinalQuizStepPage() {
  const router = useRouter();
  const onReset = useScanSessionReset();
  const [ready, setReady] = useState(false);
  const [text, setText] = useState("");
  const [quizTwo, setQuizTwo] = useState(() => ({ ...initialQuizState }));

  useEffect(() => {
    const s = loadWorkflowSession();
    if (!s?.text?.trim()) {
      router.replace("/");
      return;
    }
    setText(s.text);
    setQuizTwo(s.quizTwo ?? { ...initialQuizState });
    setReady(true);
  }, [router]);

  const answerQuiz = useCallback((selectedIndex: number) => {
    setQuizTwo((prev) => {
      if (prev.answered || prev.index >= FINAL_QUIZ_QUESTIONS.length) return prev;
      const q = FINAL_QUIZ_QUESTIONS[prev.index];
      const correct = selectedIndex === q.answerIndex;
      const next = {
        ...prev,
        answered: true,
        selectedIndex,
        score: correct ? prev.score + 1 : prev.score,
      };
      patchWorkflowSession({ quizTwo: next });
      return next;
    });
  }, []);

  const skipQuiz = useCallback(() => {
    setQuizTwo((prev) => {
      if (prev.answered || prev.index >= FINAL_QUIZ_QUESTIONS.length) return prev;
      const next = {
        ...prev,
        answered: true,
        selectedIndex: null,
      };
      patchWorkflowSession({ quizTwo: next });
      return next;
    });
  }, []);

  const nextQuiz = useCallback(() => {
    setQuizTwo((prev) => {
      if (prev.index >= FINAL_QUIZ_QUESTIONS.length) return prev;
      const nextIndex = prev.index + 1;
      const next = {
        ...prev,
        index: nextIndex,
        answered: false,
        selectedIndex: null,
      };
      patchWorkflowSession({ quizTwo: next });
      return next;
    });
  }, []);

  if (!ready) {
    return (
      <main className="container container-wide">
        <p className="muted">Loading…</p>
      </main>
    );
  }

  return (
    <main className="container container-wide">
      <ScanStepHeader phase={5} onReset={onReset} />

      <QuizPanel
        title="Final quiz"
        showText={false}
        text={text}
        questions={FINAL_QUIZ_QUESTIONS}
        quizState={quizTwo}
        onChoose={answerQuiz}
        onSkip={skipQuiz}
        onNext={nextQuiz}
      />

      <ScanStepNav phase={5} />
    </main>
  );
}
