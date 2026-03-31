import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CEFR Scan",
  description: "Scan English text for vocabulary above your level, then review and quiz yourself.",
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

