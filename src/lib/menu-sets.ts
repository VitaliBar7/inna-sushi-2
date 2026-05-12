/** תוכן סט — שמות רולים/מוצרים (מערך JSON ב־DB). */
export function parseSetContents(raw: unknown): string[] | null {
  if (raw == null) return null;
  if (!Array.isArray(raw)) return null;
  const out = raw
    .map((x) => (typeof x === "string" ? x : String(x)).trim())
    .filter((s) => s.length > 0);
  return out.length > 0 ? out : null;
}

export function formSetToDb(lines: string[]): string[] | null {
  const out = lines.map((s) => s.trim()).filter((s) => s.length > 0);
  return out.length > 0 ? out : null;
}
