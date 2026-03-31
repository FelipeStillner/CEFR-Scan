import type { TranslateLang } from "@/app/types/translate";

export type { TranslateLang } from "@/app/types/translate";

export const TRANSLATE_LANG_STORAGE_KEY = "cefr-scan-translate-lang";

export const TRANSLATE_LANG_OPTIONS: { value: TranslateLang; label: string }[] = [
  { value: "fr", label: "French" },
  { value: "pt", label: "Portuguese" },
  { value: "de", label: "German" },
  { value: "es", label: "Spanish" },
];

export function isTranslateLang(v: string): v is TranslateLang {
  return v === "fr" || v === "pt" || v === "de" || v === "es";
}

/** Stable cache key for term + target language. */
export function translateCacheKey(term: string, lang: TranslateLang): string {
  return `${lang}\u0001${term}`;
}
