"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  TRANSLATE_LANG_STORAGE_KEY,
  isTranslateLang,
  translateCacheKey,
  type TranslateLang,
} from "@/app/helpers/translatePrefs";
import { loadWorkflowSession } from "@/app/helpers/workflowSession";
import { TermReview } from "./TermReview";
import { ScanStepNav } from "@/app/components/ScanStepNav";
import { ScanStepHeader } from "@/app/components/ScanStepHeader";
import { useScanSessionReset } from "@/app/hooks/useScanSessionReset";

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export default function ReviewStepPage() {
  const router = useRouter();
  const onReset = useScanSessionReset();
  const abortRef = useRef<AbortController | null>(null);

  const [ready, setReady] = useState(false);
  const [text, setText] = useState("");
  const [vocabulary, setVocabulary] = useState<string[]>([]);

  const [definitions, setDefinitions] = useState<Record<string, string>>({});
  const [defLoading, setDefLoading] = useState(false);
  const [defError, setDefError] = useState<string | null>(null);

  const [translateLang, setTranslateLang] = useState<TranslateLang>("fr");
  const [translationCache, setTranslationCache] = useState<Record<string, string>>({});
  const [transLoading, setTransLoading] = useState<Record<string, boolean>>({});
  const [transError, setTransError] = useState<Record<string, string | null>>({});

  useEffect(() => {
    try {
      const stored = localStorage.getItem(TRANSLATE_LANG_STORAGE_KEY);
      if (stored && isTranslateLang(stored)) setTranslateLang(stored);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(TRANSLATE_LANG_STORAGE_KEY, translateLang);
    } catch {
      /* ignore */
    }
  }, [translateLang]);

  useEffect(() => {
    const s = loadWorkflowSession();
    if (!s?.text?.trim()) {
      router.replace("/");
      return;
    }
    setText(s.text);
    setVocabulary(s.vocabulary);
    setReady(true);
  }, [router]);

  useEffect(() => {
    if (!ready) return;

    if (!vocabulary.length) {
      setDefinitions({});
      setDefLoading(false);
      setDefError(null);
      abortRef.current?.abort();
      return;
    }

    const terms = [...vocabulary];
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setDefLoading(true);
    setDefError(null);

    (async () => {
      try {
        const resp = await fetch(`${apiBase}/api/definitions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ terms }),
          signal: ac.signal,
        });
        if (!resp.ok) {
          const msg = await resp.text().catch(() => resp.statusText);
          throw new Error(msg || `HTTP ${resp.status}`);
        }
        const data = (await resp.json()) as {
          definitions: { term: string; definition: string }[];
        };
        const map: Record<string, string> = {};
        for (const row of data.definitions || []) {
          if (row.term && typeof row.definition === "string") {
            map[row.term] = row.definition;
          }
        }
        if (!ac.signal.aborted) {
          setDefinitions(map);
        }
      } catch (e) {
        if (ac.signal.aborted) return;
        setDefinitions({});
        setDefError(e instanceof Error ? e.message : "Definitions could not be loaded.");
      } finally {
        if (!ac.signal.aborted) setDefLoading(false);
      }
    })();

    return () => ac.abort();
  }, [ready, vocabulary]);

  const translateTerm = useCallback(
    async (term: string) => {
      const key = translateCacheKey(term, translateLang);
      if (translationCache[key]) return;

      setTransLoading((prev) => ({ ...prev, [key]: true }));
      setTransError((prev) => ({ ...prev, [key]: null }));

      try {
        const resp = await fetch(`${apiBase}/api/translate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: term, target_lang: translateLang }),
        });
        const raw = await resp.text();
        if (!resp.ok) {
          throw new Error(raw || `HTTP ${resp.status}`);
        }
        const data = JSON.parse(raw) as { translated_text?: string };
        const translated = data.translated_text;
        if (typeof translated !== "string" || !translated.trim()) {
          throw new Error("Invalid translation response.");
        }
        setTranslationCache((prev) => ({ ...prev, [key]: translated.trim() }));
      } catch (e) {
        setTransError((prev) => ({
          ...prev,
          [key]: e instanceof Error ? e.message : "Could not translate this word.",
        }));
      } finally {
        setTransLoading((prev) => ({ ...prev, [key]: false }));
      }
    },
    [translateLang, translationCache],
  );

  if (!ready) {
    return (
      <main className="container container-wide scan-app">
        <div className="scan-app__loading">Loading your session…</div>
      </main>
    );
  }

  return (
    <main className="container container-wide scan-app">
      <ScanStepHeader phase={4} onReset={onReset} />

      <div className="scan-app__content">
        <TermReview
          text={text}
          vocabulary={vocabulary}
          translateLang={translateLang}
          onTranslateLangChange={setTranslateLang}
          definitions={definitions}
          defLoading={defLoading}
          defError={defError}
          translationCache={translationCache}
          transLoading={transLoading}
          transError={transError}
          onTranslateTerm={translateTerm}
        />
      </div>

      <ScanStepNav phase={4} canGoNext />
    </main>
  );
}
