export function splitForDisplay(text: string): { type: "space" | "word"; value: string }[] {
  if (!text) return [];
  const parts = text.split(/(\s+)/);
  return parts.map((value) => ({
    type: /^\s+$/.test(value) ? "space" : "word",
    value,
  }));
}

export function googleSearchUrl(term: string): string {
  const q = encodeURIComponent(term);
  return `https://www.google.com/search?q=${q}`;
}
