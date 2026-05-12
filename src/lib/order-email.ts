/** נרמול ואימות מייל להזמנה (צד שרת / לקוח). */
export function normalizeOrderEmail(raw: string): string | null {
  const t = raw.trim().toLowerCase();
  if (t.length < 5 || t.length > 254) return null;
  if (/[\r\n<>]/.test(t) || /\s/.test(t)) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return null;
  return t;
}
