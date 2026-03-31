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
