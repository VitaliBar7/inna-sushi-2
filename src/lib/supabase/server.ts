import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabaseKey, getSupabaseUrl } from "./config";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    getSupabaseUrl() || "https://placeholder.local",
    getSupabaseKey() || "placeholder",
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Session refresh in Server Component — middleware will persist cookies.
          }
        },
      },
    },
  );
}
