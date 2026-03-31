"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { loadWorkflowSession, patchWorkflowSession } from "@/app/helpers/workflowSession";
import type { QuizQuestion, QuizState } from "@/app/types/workflow";
import { GeneratedQuizSection } from "./GeneratedQuizSection";
import { ScanStepNav } from "@/app/components/ScanStepNav";
import { ScanStepHeader } from "@/app/components/ScanStepHeader";
import { initialQuizState } from "@/app/helpers/fixedQuiz";
import { useScanSessionReset } from "@/app/hooks/useScanSessionReset";

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export default function VocabularyQuizStepPage() {
  const router = useRouter();
  const onReset = useScanSessionReset();
  const [ready, setReady] = useState(false);
  const [text, setText] = useState("");
  const [vocabulary, setVocabulary] = useState<string[]>([]);
  const [quizOne, setQuizOne] = useState<QuizState>(initialQuizState);
  const [quizOneQuestions, setQuizOneQuestions] = useState<QuizQuestion[]>([]);
  const [quizOneStatus, setQuizOneStatus] = useState("");
  const [isGeneratingQuizOne, setIsGeneratingQuizOne] = useState(false);
  const didAttemptGenerateRef = useRef(false);

  useEffect(() => {
    const s = loadWorkflowSession();
    if (!s?.text?.trim()) {
      router.replace("/");
      return;
    }
    if (s.vocabulary.length < 4) {
      router.replace("/vocabulary");
      return;
    }
    setText(s.text);
    setVocabulary(s.vocabulary);
    setQuizOne(s.quizOne ?? initialQuizState);
    setQuizOneQuestions(s.quizOneQuestions ?? []);
    didAttemptGenerateRef.current = (s.quizOneQuestions?.length ?? 0) > 0;
    setReady(true);
  }, [router]);

  const generateQuizOne = useCallback(async () => {
    if (!text.trim()) return;
    if (vocabulary.length < 4) {
      setQuizOneQuestions([]);
      setQuizOneStatus("Add at least four words on the previous step before taking this quiz.");
      return;
    }

    setIsGeneratingQuizOne(true);
    setQuizOneStatus("Preparing your quiz…");
    setQuizOne(initialQuizState);
    patchWorkflowSession({ quizOne: initialQuizState });

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
        throw new Error("The server did not return any questions.");
      }

      setQuizOneQuestions(questions);
      setQuizOneStatus("");
      patchWorkflowSession({
        quizOneQuestions: questions,
        quizOne: initialQuizState,
      });
    } catch (e) {
      setQuizOneQuestions([]);
      setQuizOneStatus(
        e instanceof Error ? `Could not create the quiz: ${e.message}` : "Could not create the quiz.",
      );
    } finally {
      setIsGeneratingQuizOne(false);
    }
  }, [text, vocabulary]);

  useEffect(() => {
    if (!ready) return;
    if (quizOneQuestions.length > 0) return;
    if (didAttemptGenerateRef.current) return;
    didAttemptGenerateRef.current = true;
    void generateQuizOne();
  }, [ready, quizOneQuestions.length, generateQuizOne]);

  const answerQuiz = useCallback(
    (selectedIndex: number) => {
      setQuizOne((prev) => {
        if (prev.answered || prev.index >= quizOneQuestions.length) return prev;
        const q = quizOneQuestions[prev.index];
        const correct = selectedIndex === q.answerIndex;
        const next = {
          ...prev,
          answered: true,
          selectedIndex,
          score: correct ? prev.score + 1 : prev.score,
        };
        patchWorkflowSession({ quizOne: next });
        return next;
      });
    },
    [quizOneQuestions],
  );

  const skipQuiz = useCallback(() => {
    setQuizOne((prev) => {
      if (prev.answered || prev.index >= quizOneQuestions.length) return prev;
      const next = {
        ...prev,
        answered: true,
        selectedIndex: null,
      };
      patchWorkflowSession({ quizOne: next });
      return next;
    });
  }, [quizOneQuestions.length]);

  const nextQuiz = useCallback(() => {
    setQuizOne((prev) => {
      if (prev.index >= quizOneQuestions.length) return prev;
      const nextIndex = prev.index + 1;
      const next = {
        ...prev,
        index: nextIndex,
        answered: false,
        selectedIndex: null,
      };
      patchWorkflowSession({ quizOne: next });
      return next;
    });
  }, [quizOneQuestions.length]);

  const canGoNext = quizOneQuestions.length > 0 && quizOne.index >= quizOneQuestions.length;

  if (!ready) {
    return (
      <main className="container container-wide scan-app">
        <div className="scan-app__loading">Loading your session…</div>
      </main>
    );
  }

  return (
    <main className="container container-wide scan-app">
      <ScanStepHeader phase={3} onReset={onReset} />

      <div className="scan-app__content">
        <GeneratedQuizSection
          text={text}
          isGeneratingQuizOne={isGeneratingQuizOne}
          quizOneStatus={quizOneStatus}
          quizOneQuestions={quizOneQuestions}
          quizOne={quizOne}
          onRetryGenerate={() => void generateQuizOne()}
          onChoose={answerQuiz}
          onSkip={skipQuiz}
          onNext={nextQuiz}
        />
      </div>

      <ScanStepNav phase={3} canGoNext={canGoNext} />
    </main>
  );
}
