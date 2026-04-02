export type Phase = 1 | 2 | 3 | 4 | 5 | 6;

export type QuizQuestion = {
  prompt: string;
  options: string[];
  answerIndex: number;
};

export type QuizState = {
  index: number;
  score: number;
  answered: boolean;
  selectedIndex: number | null;
};

export type ExtractResponse = {
  vocabulary: { term: string }[];
};
