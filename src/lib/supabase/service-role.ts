import { createClient } from "@supabase/supabase-js";

import { getSupabaseUrl } from "./config";

/** לקוח שרת עם service_role — רק בנתיבי API / Server Actions (לא בדפדפן). */
export function createServiceRoleClient() {
  const url = getSupabaseUrl();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("חסרים NEXT_PUBLIC_SUPABASE_URL או SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
