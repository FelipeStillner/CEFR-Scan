"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { loadWorkflowSession, patchWorkflowSession } from "@/app/helpers/workflowSession";
import type { QuizQuestion, QuizState } from "@/app/types/workflow";
import { FinalQuizSection } from "./FinalQuizSection";
import { ScanStepNav } from "@/app/components/ScanStepNav";
import { ScanStepHeader } from "@/app/components/ScanStepHeader";
import { initialQuizState } from "@/app/helpers/fixedQuiz";
import { useScanSessionReset } from "@/app/hooks/useScanSessionReset";
import type { EnglishLevel } from "@/app/types/englishLevel";

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export default function FinalQuizStepPage() {
  const router = useRouter();
  const onReset = useScanSessionReset();
  const [ready, setReady] = useState(false);
  const [text, setText] = useState("");
  const [level, setLevel] = useState<EnglishLevel>("Beginner");
  const [vocabulary, setVocabulary] = useState<string[]>([]);
  const [quizTwo, setQuizTwo] = useState<QuizState>(initialQuizState);
  const [quizTwoQuestions, setQuizTwoQuestions] = useState<QuizQuestion[]>([]);
  const [quizTwoStatus, setQuizTwoStatus] = useState("");
  const [isGeneratingQuizTwo, setIsGeneratingQuizTwo] = useState(false);
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
    setLevel(s.level);
    setVocabulary(s.vocabulary);
    setQuizTwo(s.quizTwo ?? initialQuizState);
    setQuizTwoQuestions(s.quizTwoQuestions ?? []);
    didAttemptGenerateRef.current = (s.quizTwoQuestions?.length ?? 0) > 0;
    setReady(true);
  }, [router]);

  const generateQuizTwo = useCallback(async () => {
    if (!text.trim()) return;
    if (vocabulary.length < 4) {
      setQuizTwoQuestions([]);
      setQuizTwoStatus("Add at least four words on the vocabulary step before taking this quiz.");
      return;
    }

    setIsGeneratingQuizTwo(true);
    setQuizTwoStatus("Preparing your final quiz…");
    setQuizTwo(initialQuizState);
    patchWorkflowSession({ quizTwo: initialQuizState });

    try {
      const resp = await fetch(`${apiBase}/api/quiz-two`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, terms: vocabulary, level }),
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

      setQuizTwoQuestions(questions);
      setQuizTwoStatus("");
      patchWorkflowSession({
        quizTwoQuestions: questions,
        quizTwo: initialQuizState,
      });
    } catch (e) {
      setQuizTwoQuestions([]);
      setQuizTwoStatus(
        e instanceof Error ? `Could not create the quiz: ${e.message}` : "Could not create the quiz.",
      );
    } finally {
      setIsGeneratingQuizTwo(false);
    }
  }, [text, vocabulary, level]);

  useEffect(() => {
    if (!ready) return;
    if (quizTwoQuestions.length > 0) return;
    if (didAttemptGenerateRef.current) return;
    didAttemptGenerateRef.current = true;
    void generateQuizTwo();
  }, [ready, quizTwoQuestions.length, generateQuizTwo]);

  const answerQuiz = useCallback(
    (selectedIndex: number) => {
      setQuizTwo((prev) => {
        if (prev.answered || prev.index >= quizTwoQuestions.length) return prev;
        const q = quizTwoQuestions[prev.index];
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
    },
    [quizTwoQuestions],
  );

  const skipQuiz = useCallback(() => {
    setQuizTwo((prev) => {
      if (prev.answered || prev.index >= quizTwoQuestions.length) return prev;
      const next = {
        ...prev,
        answered: true,
        selectedIndex: null,
      };
      patchWorkflowSession({ quizTwo: next });
      return next;
    });
  }, [quizTwoQuestions.length]);

  const nextQuiz = useCallback(() => {
    setQuizTwo((prev) => {
      if (prev.index >= quizTwoQuestions.length) return prev;
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
  }, [quizTwoQuestions.length]);

  const canGoNext = quizTwoQuestions.length > 0 && quizTwo.index >= quizTwoQuestions.length;

  if (!ready) {
    return (
      <main className="container container-wide scan-app">
        <div className="scan-app__loading">Loading your session…</div>
      </main>
    );
  }

  return (
    <main className="container container-wide scan-app">
      <ScanStepHeader phase={5} onReset={onReset} />

      <div className="scan-app__content">
        <FinalQuizSection
          text={text}
          isGeneratingQuizTwo={isGeneratingQuizTwo}
          quizTwoStatus={quizTwoStatus}
          quizTwoQuestions={quizTwoQuestions}
          quizTwo={quizTwo}
          onRetryGenerate={() => void generateQuizTwo()}
          onChoose={answerQuiz}
          onSkip={skipQuiz}
          onNext={nextQuiz}
        />
      </div>

      <ScanStepNav phase={5} canGoNext={canGoNext} />
    </main>
  );
}
