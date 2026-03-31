import type { Phase } from "@/app/types/workflow";

/** Subtitle shown under the main title for each step. */
export const scanPhaseTitles: Record<Phase, string> = {
  1: "Step 1 — Input & scan",
  2: "Step 2 — Edit vocabulary",
  3: "Step 3 — Vocabulary quiz",
  4: "Step 4 — Review",
  5: "Step 5 — Final quiz",
};
