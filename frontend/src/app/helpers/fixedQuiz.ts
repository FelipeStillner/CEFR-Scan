import type { QuizQuestion, QuizState } from "@/app/types/workflow";

/** Static questions for the closing quiz (not tied to the scanned text). */
export const FINAL_QUIZ_QUESTIONS: QuizQuestion[] = [
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

export const initialQuizState: QuizState = {
  index: 0,
  score: 0,
  answered: false,
  selectedIndex: null,
};
