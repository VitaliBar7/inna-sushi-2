/**
 * חילוץ IP של הלקוח מ-Headers של הבקשה.
 * סדר עדיפויות: Cloudflare → reverse proxies → fallback.
 * ב-edge/serverless חלק מהפלטפורמות מספקות `request.ip` (לא נשען).
 */
export function getClientIp(headers: Headers): string {
  const cf = headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const real = headers.get("x-real-ip");
  if (real) return real.trim();
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return "unknown";
}
