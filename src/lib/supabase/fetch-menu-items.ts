import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeMenuItems } from "@/lib/menu-price";
import type { MenuItem } from "@/types/menu";

/** אותו סידור כמו בדף הבית — ל-Realtime / רענון. `null` = שגיאת רשת (לא לדרוס רשימה קיימת). */
export async function fetchMenuItems(client: SupabaseClient): Promise<MenuItem[] | null> {
  const { data, error } = await client
    .from("menu_items")
    .select("*")
    .order("category", { ascending: true })
    .order("price", { ascending: true });
  if (error) {
    return null;
  }
  return normalizeMenuItems((data as MenuItem[] | null) ?? []);
}
