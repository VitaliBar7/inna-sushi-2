/**
 * בדיקה שהבקשה מגיעה מאותו אתר (Same-Origin), כדי לחסום CSRF/Bot
 * שאינו מטעין את הדף שלנו (POST ישיר משרת אחר).
 *
 * - בפרודקשן, מומלץ להגדיר `PUBLIC_SITE_ORIGIN` (למשל "https://inna-sushi.example.com").
 * - אחרת: חוזרים על `Host` ועל הסכמה (`x-forwarded-proto`) כברירת מחדל.
 */
function inferOrigin(headers: Headers): string | null {
  const explicit = process.env.PUBLIC_SITE_ORIGIN?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const host = headers.get("host");
  const proto = headers.get("x-forwarded-proto") || "https";
  if (!host) return null;
  return `${proto}://${host}`.replace(/\/$/, "");
}

export function isSameOriginRequest(headers: Headers): boolean {
  const expected = inferOrigin(headers);
  if (!expected) return false;
  const origin = headers.get("origin");
  if (origin && origin.replace(/\/$/, "") === expected) return true;
  /* חלק מהדפדפנים לא שולחים Origin על same-origin POST; ניפול ל-Referer */
  const referer = headers.get("referer");
  if (referer) {
    try {
      const u = new URL(referer);
      const refOrigin = `${u.protocol}//${u.host}`;
      if (refOrigin === expected) return true;
    } catch {
      /* ignore parse error */
    }
  }
  return false;
}
