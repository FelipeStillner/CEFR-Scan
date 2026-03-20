import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CEFR-Scan",
  description: "Extract CEFR-matched words and expressions from your text.",
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

