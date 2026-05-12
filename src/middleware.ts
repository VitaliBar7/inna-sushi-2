import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Security headers בסיסיים — לא שוברים HeroUI/Tailwind v4:
 * - X-Frame-Options: ייתר את ה-clickjacking דרך iframe
 * - X-Content-Type-Options: סוגר MIME sniffing
 * - Referrer-Policy: לא דולף נתיב מלא לדומיינים אחרים
 * - Permissions-Policy: מצמצם API רגישים (camera/mic/geolocation)
 * - Strict-Transport-Security: HSTS בפרודקשן בלבד
 *
 * הערה: לא הוגדר CSP מלא כי React/HeroUI מזריקים inline styles ו-script bootstrap.
 * אפשר להוסיף CSP בנפרד עם nonce-based setup (next.config + middleware).
 */
function applySecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  );
  if (process.env.NODE_ENV === "production") {
    res.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }
  return res;
}

export async function middleware(request: NextRequest) {
  try {
    const res = await updateSession(request);
    return applySecurityHeaders(res);
  } catch (e) {
    console.error("[middleware]", e);
    return applySecurityHeaders(NextResponse.next());
  }
}

export const config = {
  matcher: [
    /* אל תריץ רענון session על /api — מיותר ועלול ליצור התנהגות מוזרה מול Route Handlers */
    "/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
