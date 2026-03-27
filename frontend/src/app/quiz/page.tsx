"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadScanSession, type ScanSession } from "@/lib/scanSession";

export default function QuizPage() {
  const [session, setSession] = useState<ScanSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSession(loadScanSession());
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <main className="container container-wide">
        <p className="muted">Loading…</p>
      </main>
    );
  }

  if (!session?.vocabulary.length) {
    return (
      <main className="container container-wide">
        <header className="header">
          <h1>No session</h1>
          <p className="subtitle">Start from the home page.</p>
        </header>
        <Link className="button" href="/">
          Back to home
        </Link>
      </main>
    );
  }

  return (
    <main className="container container-wide">
      <header className="scan-header">
        <div>
          <h1 className="scan-title">Quiz</h1>
          <p className="subtitle">The quiz will be added here later.</p>
        </div>
        <Link className="button button-ghost" href="/select">
          Back to selection
        </Link>
      </header>

      <section className="panel">
        <p className="muted">Placeholder for the first quiz step.</p>
        <Link className="button" href="/definitions">
          Go to definitions
        </Link>
      </section>
    </main>
  );
}
