import type { QuizState } from "@/app/types/workflow";

export const initialQuizState: QuizState = {
  index: 0,
  score: 0,
  answered: false,
  selectedIndex: null,
};
