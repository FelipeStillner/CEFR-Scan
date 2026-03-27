import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CEFR-Scan",
  description: "Find words and phrases in a text that are not expected at your chosen English level.",
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

