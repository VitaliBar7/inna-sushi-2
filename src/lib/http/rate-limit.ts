/**
 * Rate limiter פשוט בזיכרון לפי מפתח (IP / route).
 * הערה: בזיכרון של ה-process בלבד. שימושי מול תקיפות "burst" בסיסיות —
 * לפיזור גדול (וכמה אינסטנסים) מומלץ להחליף ל-Upstash/Cloudflare KV.
 */

type Bucket = {
  count: number;
  /** epoch ms של תחילת חלון הספירה */
  windowStart: number;
};

const STORE = new Map<string, Bucket>();
/** ניקוי תקופתי כדי שהמפה לא תגדל בלי גבול */
const MAX_KEYS = 5000;

export type RateLimitResult = {
  ok: boolean;
  /** כמה בקשות נותרו בחלון הנוכחי */
  remaining: number;
  /** מתי חלון הספירה יתאפס (epoch ms) */
  resetAt: number;
};

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): RateLimitResult {
  if (STORE.size > MAX_KEYS) {
    /* purge מבוקר כשהמפה גדלה — מסיר רשומות שכבר אינן בחלון */
    for (const [k, b] of STORE) {
      if (now - b.windowStart >= windowMs) STORE.delete(k);
      if (STORE.size <= MAX_KEYS / 2) break;
    }
  }

  let bucket = STORE.get(key);
  if (!bucket || now - bucket.windowStart >= windowMs) {
    bucket = { count: 0, windowStart: now };
    STORE.set(key, bucket);
  }
  bucket.count += 1;
  const resetAt = bucket.windowStart + windowMs;
  const remaining = Math.max(0, limit - bucket.count);
  return {
    ok: bucket.count <= limit,
    remaining,
    resetAt,
  };
}
