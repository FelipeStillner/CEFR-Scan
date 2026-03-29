export const SCAN_SESSION_KEY = "cefr-scan-session";

export type EnglishLevel = "Beginner" | "Intermediary" | "Advanced";

export type ScanSession = {
  text: string;
  level: EnglishLevel;
  /** Current vocabulary (includes backend terms and user-added from the text). */
  vocabulary: string[];
};

export function saveScanSession(data: ScanSession): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SCAN_SESSION_KEY, JSON.stringify(data));
}

export function loadScanSession(): ScanSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SCAN_SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as unknown;
    if (!data || typeof data !== "object") return null;
    const o = data as Record<string, unknown>;
    const text = typeof o.text === "string" ? o.text : "";
    const level = o.level as EnglishLevel;
    const vocab = o.vocabulary;
    if (level !== "Beginner" && level !== "Intermediary" && level !== "Advanced") return null;
    if (!Array.isArray(vocab) || !vocab.every((t) => typeof t === "string")) return null;
    return { text, level, vocabulary: [...vocab] };
  } catch {
    return null;
  }
}

export function clearScanSession(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(SCAN_SESSION_KEY);
}

/** Strip wrapping punctuation; require at least one letter or digit. */
export function normalizeClickedToken(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const inner = trimmed
    .replace(/^[\s"”“’‘’'«»「」\[\]()*\-–—]+/g, "")
    .replace(/[\s"”“’‘’'«»「」\[\]()*.,;:!?\-–—]+$/g, "");
  if (!inner || !/[\p{L}\p{N}]/u.test(inner)) return null;
  return inner;
}
