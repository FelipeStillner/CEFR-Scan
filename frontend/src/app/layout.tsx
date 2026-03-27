import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CEFR-Scan",
  description:
    "Extract challenging terms, mark what you do not know, then review definitions and translations.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

