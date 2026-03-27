"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Old URL; flow moved to /select → /quiz → /definitions. */
export default function ScanRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/select");
  }, [router]);
  return (
    <main className="container container-wide">
      <p className="muted">Redirecting…</p>
    </main>
  );
}
