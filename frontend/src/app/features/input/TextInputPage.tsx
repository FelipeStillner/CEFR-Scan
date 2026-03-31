"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { EnglishLevel } from "@/app/types/englishLevel";
import { normalizeAndSortTerms } from "@/app/helpers/vocabulary";
import { loadWorkflowSession, saveWorkflowSession } from "@/app/helpers/workflowSession";
import type { ExtractResponse } from "@/app/types/workflow";
import { ScanStepHeader } from "@/app/components/ScanStepHeader";
import { TextInputForm } from "./TextInputForm";

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export default function TextInputPage() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [level, setLevel] = useState<EnglishLevel>("Beginner");
  const [scanStatus, setScanStatus] = useState("");
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    const s = loadWorkflowSession();
    if (s) {
      setText(s.text);
      setLevel(s.level);
    }
  }, []);

  const runScan = useCallback(async () => {
    if (!text.trim() || isScanning) return;

    setIsScanning(true);
    setScanStatus("");

    try {
      const resp = await fetch(`${apiBase}/api/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, level }),
      });

      if (!resp.ok) {
        const msg = await resp.text().catch(() => resp.statusText);
        setScanStatus(`Something went wrong: ${msg}`);
        return;
      }

      const data = (await resp.json()) as ExtractResponse;
      const terms = (data.vocabulary || []).map((v) => v.term);
      const vocabulary = normalizeAndSortTerms(terms);

      saveWorkflowSession({
        text,
        level,
        vocabulary,
      });

      router.push("/vocabulary");
    } finally {
      setIsScanning(false);
    }
  }, [isScanning, text, level, router]);

  return (
    <main className="container container-wide scan-app">
      <ScanStepHeader phase={1} onReset={() => {}} />

      <div className="scan-app__content">
        <TextInputForm
          text={text}
          level={level}
          isScanning={isScanning}
          scanStatus={scanStatus}
          onTextChange={setText}
          onLevelChange={setLevel}
          onStartScan={runScan}
        />
      </div>
    </main>
  );
}
