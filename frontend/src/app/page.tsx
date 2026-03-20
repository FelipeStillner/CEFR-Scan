"use client";

import { useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";

type CEFR_LEVEL = "A1" | "A2" | "B1" | "B2" | "C1";

type HighlightOccurrence = { start: number; end: number };
type Highlight = { term: string; occurrences: HighlightOccurrence[] };
type CandidateItem = {
  term: string;
  canonical?: string | null;
  kind?: string | null;
  levelScore?: number | null;
  levelProbabilities?: Record<string, number> | null;
  definition?: string | null;
  examples?: string[] | null;
  whyThisMatches?: string | null;
};

type ExtractResponse = {
  level: CEFR_LEVEL;
  highlights: Highlight[];
  items: CandidateItem[];
};

function pickNonOverlappingRanges(
  ranges: Array<{ start: number; end: number; term: string }>
) {
  // Greedy non-overlapping selection: prioritize longer spans first.
  const sorted = [...ranges].sort((a, b) => {
    const la = a.end - a.start;
    const lb = b.end - b.start;
    if (lb !== la) return lb - la;
    return a.start - b.start;
  });

  const picked: Array<{ start: number; end: number; term: string }> = [];
  for (const r of sorted) {
    const overlaps = picked.some(
      (p) => Math.max(p.start, r.start) < Math.min(p.end, r.end)
    );
    if (!overlaps) picked.push(r);
  }

  // Render left-to-right.
  picked.sort((a, b) => a.start - b.start);
  return picked;
}

function rangesFromHighlights(highlights: Highlight[]) {
  const ranges: Array<{ start: number; end: number; term: string }> = [];
  for (const h of highlights || []) {
    const term = h.term ?? "";
    for (const occ of h.occurrences || []) {
      const start = Number(occ.start);
      const end = Number(occ.end);
      if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
      if (start < 0 || end < 0) continue;
      if (end <= start) continue;
      ranges.push({ start, end, term });
    }
  }
  return ranges;
}

function HighlightedText({
  text,
  highlights,
  onTermClick,
}: {
  text: string;
  highlights: Highlight[];
  onTermClick?: (term: string) => void;
}) {
  return useMemo(() => {
    const preview: ReactNode[] = [];

    const ranges = pickNonOverlappingRanges(rangesFromHighlights(highlights));
    if (ranges.length === 0) {
      preview.push(text);
      return <span className="preview">{preview}</span>;
    }

    let pos = 0;
    for (const r of ranges) {
      if (pos < r.start) {
        preview.push(text.slice(pos, r.start));
      }

      const term = r.term || "Match";
      preview.push(
        <mark
          key={`${r.start}-${r.end}-${term}`}
          className="hl"
          title={term}
          onClick={() => onTermClick?.(term)}
          style={{ cursor: onTermClick ? "pointer" : "default" }}
        >
          {text.slice(r.start, r.end)}
        </mark>
      );
      pos = r.end;
    }

    if (pos < text.length) preview.push(text.slice(pos));

    return <span className="preview">{preview}</span>;
  }, [text, highlights, onTermClick]);
}

export default function Home() {
  const [text, setText] = useState("");
  const [level, setLevel] = useState<CEFR_LEVEL>("A1");
  const [status, setStatus] = useState("");

  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [items, setItems] = useState<CandidateItem[]>([]);
  const [selected, setSelected] = useState<CandidateItem | null>(null);

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
  const itemByTerm = useMemo(() => {
    const map = new Map<string, CandidateItem>();
    for (const it of items) map.set(it.term, it);
    return map;
  }, [items]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();

    setStatus("Requesting...");
    setSelected(null);
    setItems([]);
    setHighlights([]);

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
    setStatus(`Done. Found ${data.items?.length || 0} matches for ${data.level}.`);
    setHighlights(data.highlights || []);
    setItems(data.items || []);

    const first = data.items?.[0] ?? null;
    setSelected(first);
  }

  return (
    <main className="container">
      <header className="header">
        <h1>CEFR-Scan</h1>
        <p className="subtitle">
          Paste text and pick a CEFR level. Backend extraction is stubbed (empty list for now).
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
          <span className="label">CEFR level</span>
          <select value={level} onChange={(e) => setLevel(e.target.value as CEFR_LEVEL)} required>
            <option value="A1">A1</option>
            <option value="A2">A2</option>
            <option value="B1">B1</option>
            <option value="B2">B2</option>
            <option value="C1">C1</option>
          </select>
        </label>

        <button className="button" type="submit">
          Extract matches
        </button>
      </form>

      <section className="panel">
        <h2>Results</h2>
        <div id="status" className="status" aria-live="polite">
          {status}
        </div>
        <div className="items">
          {items.length === 0 ? (
            <p className="empty">No matches yet (backend extraction stub).</p>
          ) : (
            items.map((item) => (
              <article
                key={item.term}
                className="card"
                onClick={() => setSelected(item)}
                role="button"
                tabIndex={0}
              >
                <h3>{item.term}</h3>
                {item.definition ? <p className="definition">{item.definition}</p> : null}
                {item.examples && item.examples.length > 0 ? (
                  <ul className="examples">
                    {item.examples.map((s, idx) => (
                      <li key={idx}>{s}</li>
                    ))}
                  </ul>
                ) : null}
                {typeof item.levelScore === "number" ? (
                  <p className="score">Level score: {item.levelScore.toFixed(2)}</p>
                ) : null}
              </article>
            ))
          )}
        </div>
      </section>

      <section className="panel">
        <h2>Highlighted text</h2>
        <HighlightedText
          text={text}
          highlights={highlights}
          onTermClick={(term) => {
            const it = itemByTerm.get(term);
            if (it) setSelected(it);
          }}
        />
      </section>

      <section className="panel details">
        <h2>Selected item</h2>
        {selected ? (
          <>
            <p style={{ marginTop: 0, fontWeight: 700 }}>{selected.term}</p>
            {selected.definition ? <p>{selected.definition}</p> : null}
            {selected.whyThisMatches ? <p>{selected.whyThisMatches}</p> : null}
            {selected.examples && selected.examples.length > 0 ? (
              <>
                <p style={{ marginTop: 10, color: "var(--muted)" }}>Examples:</p>
                <ul className="examples">
                  {selected.examples.map((s, idx) => (
                    <li key={idx}>{s}</li>
                  ))}
                </ul>
              </>
            ) : null}
          </>
        ) : (
          <p>Select a match to see details.</p>
        )}
      </section>
    </main>
  );
}

