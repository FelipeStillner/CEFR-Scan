"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";

import { saveScanSession, type EnglishLevel } from "@/lib/scanSession";

type VocabularyItem = {
  term: string;
};

type ExtractResponse = {
  vocabulary: VocabularyItem[];
};

export default function Home() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [level, setLevel] = useState<EnglishLevel>("Beginner");
  const [status, setStatus] = useState("");

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();

    setStatus("Finding terms…");

    const resp = await fetch(`${apiBase}/api/extract`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, level }),
    });

    if (!resp.ok) {
      const msg = await resp.text().catch(() => resp.statusText);
      setStatus(`Error: ${msg}`);
      return;
    }

    const data = (await resp.json()) as ExtractResponse;
    const terms = (data.vocabulary || []).map((v) => v.term).filter(Boolean);
    const seen = new Set<string>();
    const vocabulary: string[] = [];
    for (const t of terms) {
      const key = t.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      vocabulary.push(t);
    }

    saveScanSession({ text, level, vocabulary });
    setStatus("");
    router.push("/select");
  }

  return (
    <main className="container">
      <header className="header">
        <h1>CEFR-Scan</h1>
        <p className="subtitle">
          Paste text and pick your English level. Next, mark the words you do not know, then open definitions
          when you are ready.
        </p>
      </header>

      <form id="extractForm" className="panel" onSubmit={onSubmit}>
        <label className="field">
          <span className="label">English text</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            placeholder="Paste an English paragraph here..."
            required
          />
        </label>

        <label className="field">
          <span className="label">English level</span>
          <select value={level} onChange={(e) => setLevel(e.target.value as EnglishLevel)} required>
            <option value="Beginner">Beginner</option>
            <option value="Intermediary">Intermediary</option>
            <option value="Advanced">Advanced</option>
          </select>
        </label>

        <button className="button" type="submit">
          Find terms
        </button>

        <div id="status" className="status" aria-live="polite">
          {status}
        </div>
      </form>
    </main>
  );
}
