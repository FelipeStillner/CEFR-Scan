import type { EnglishLevel } from "@/app/types/englishLevel";
import type { QuizQuestion, QuizState } from "@/app/types/workflow";

export const WORKFLOW_STORAGE_KEY = "scan-study-workflow-session";

export type WorkflowSession = {
  text: string;
  level: EnglishLevel;
  vocabulary: string[];
  quizOneQuestions?: QuizQuestion[];
  quizOne?: QuizState;
  quizTwoQuestions?: QuizQuestion[];
  quizTwo?: QuizState;
};

export function loadWorkflowSession(): WorkflowSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(WORKFLOW_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as unknown;
    if (!data || typeof data !== "object") return null;
    const o = data as Record<string, unknown>;
    const text = typeof o.text === "string" ? o.text : "";
    const level = o.level as EnglishLevel;
    const vocab = o.vocabulary;
    if (level !== "Beginner" && level !== "Intermediary" && level !== "Advanced") return null;
    if (!Array.isArray(vocab) || !vocab.every((t) => typeof t === "string")) return null;
    const session: WorkflowSession = { text, level, vocabulary: [...vocab] };
    if (Array.isArray(o.quizOneQuestions)) {
      session.quizOneQuestions = o.quizOneQuestions as QuizQuestion[];
    }
    if (o.quizOne && typeof o.quizOne === "object") session.quizOne = o.quizOne as QuizState;
    if (Array.isArray(o.quizTwoQuestions)) {
      session.quizTwoQuestions = o.quizTwoQuestions as QuizQuestion[];
    }
    if (o.quizTwo && typeof o.quizTwo === "object") session.quizTwo = o.quizTwo as QuizState;
    return session;
  } catch {
    return null;
  }
}

export function saveWorkflowSession(data: WorkflowSession): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(WORKFLOW_STORAGE_KEY, JSON.stringify(data));
}

export function patchWorkflowSession(partial: Partial<WorkflowSession>): void {
  const cur = loadWorkflowSession();
  if (!cur) return;
  saveWorkflowSession({ ...cur, ...partial });
}

export function clearWorkflowSession(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(WORKFLOW_STORAGE_KEY);
}
