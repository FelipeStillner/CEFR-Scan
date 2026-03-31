import { normalizeClickedToken } from "@/app/helpers/tokenNormalize";

export function normalizeAndSortTerms(rawTerms: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const raw of rawTerms) {
    const term = normalizeClickedToken(raw);
    if (!term) continue;
    const normalized = term.toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    output.push(term);
  }

  output.sort((a, b) => a.localeCompare(b));
  return output;
}
