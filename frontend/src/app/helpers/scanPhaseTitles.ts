import type { Phase } from "@/app/types/workflow";

/** Subtitle under the main title for each step. */
export const scanPhaseTitles: Record<Phase, string> = {
  1: "Paste your text and choose your level",
  2: "Build your word list from the scan",
  3: "Check your understanding of the words",
  4: "Read definitions and optional translations",
  5: "Validate your vocabulary mastery",
  6: "Review your full session results",
};
