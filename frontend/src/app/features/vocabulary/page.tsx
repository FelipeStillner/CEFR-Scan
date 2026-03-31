"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { normalizeClickedToken } from "@/app/helpers/tokenNormalize";
import { loadWorkflowSession, patchWorkflowSession } from "@/app/helpers/workflowSession";
import { normalizeAndSortTerms } from "@/app/helpers/vocabulary";
import { VocabularyEditor } from "./VocabularyEditor";
import { ScanStepNav } from "@/app/components/ScanStepNav";
import { ScanStepHeader } from "@/app/components/ScanStepHeader";
import { useScanSessionReset } from "@/app/hooks/useScanSessionReset";

export default function VocabularyStepPage() {
  const router = useRouter();
  const onReset = useScanSessionReset();
  const [ready, setReady] = useState(false);
  const [text, setText] = useState("");
  const [vocabulary, setVocabulary] = useState<string[]>([]);
  const [manualTerm, setManualTerm] = useState("");

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
    patchWorkflowSession({ vocabulary });
  }, [vocabulary, ready]);

  const addRawTerm = useCallback((rawToken: string) => {
    const nextTerm = normalizeClickedToken(rawToken);
    if (!nextTerm) return;
    setVocabulary((prev) => normalizeAndSortTerms([...prev, nextTerm]));
  }, []);

  const removeTerm = useCallback((term: string) => {
    const lower = term.toLowerCase();
    setVocabulary((prev) => prev.filter((t) => t.toLowerCase() !== lower));
  }, []);

  const addManualTerm = useCallback(() => {
    if (!manualTerm.trim()) return;
    setVocabulary((prev) => normalizeAndSortTerms([...prev, manualTerm]));
    setManualTerm("");
  }, [manualTerm]);

  const canGoNext = vocabulary.length >= 4;

  if (!ready) {
    return (
      <main className="container container-wide scan-app">
        <div className="scan-app__loading">Loading your session…</div>
      </main>
    );
  }

  return (
    <main className="container container-wide scan-app">
      <ScanStepHeader phase={2} onReset={onReset} />

      <div className="scan-app__content">
        <VocabularyEditor
          text={text}
          vocabulary={vocabulary}
          manualTerm={manualTerm}
          onManualTermChange={setManualTerm}
          onAddManual={addManualTerm}
          onWordClick={addRawTerm}
          onRemoveTerm={removeTerm}
        />
      </div>

      <ScanStepNav phase={2} canGoNext={canGoNext} />
    </main>
  );
}
