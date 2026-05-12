import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  try {
    return await updateSession(request);
  } catch (e) {
    console.error("[middleware]", e);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /* אל תריץ רענון session על /api — מיותר ועלול ליצור התנהגות מוזרה מול Route Handlers */
    "/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
