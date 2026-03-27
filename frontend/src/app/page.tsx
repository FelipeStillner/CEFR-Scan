"use client";

import { useState } from "react";
import type { FormEvent } from "react";

type EnglishLevel = "Beginner" | "Intermediary" | "Advanced";

type VocabularyItem = {
  term: string;
};

type ExtractResponse = {
  vocabulary: VocabularyItem[];
};

export default function Home() {
  const [text, setText] = useState("");
  const [level, setLevel] = useState<EnglishLevel>("Beginner");
  const [status, setStatus] = useState("");
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>([]);

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();

    setStatus("Requesting...");
    setVocabulary([]);

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
    setVocabulary(data.vocabulary || []);
    setStatus(`Done. Found ${data.vocabulary?.length || 0} terms for ${level}.`);
  }

  return (
    <main className="container">
      <header className="header">
        <h1>CEFR-Scan</h1>
        <p className="subtitle">
          Paste text and pick your English level. The app lists words and phrases in the text that are not
          generally expected at that level.
        </p>
      </header>

      <form id="extractForm" className="panel" onSubmit={onSubmit}>
        <label className="field">
          <span className="label">English text</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
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
          Find challenging terms
        </button>
      </form>

      <section className="panel">
        <h2>Results</h2>
        <div id="status" className="status" aria-live="polite">
          {status}
        </div>
        <div className="items">
          {vocabulary.length === 0 ? (
            <p className="empty">No vocabulary returned yet.</p>
          ) : (
            vocabulary.map((item) => (
              <article key={item.term} className="card">
                <h3>{item.term}</h3>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}

