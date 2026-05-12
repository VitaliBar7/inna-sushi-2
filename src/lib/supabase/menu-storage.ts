import type { SupabaseClient } from "@supabase/supabase-js";

export const MENU_IMAGES_BUCKET = "menu-images";

/** מגבלת גודל לפני שליחה ל-Storage (מומלץ ליישר גם ב־Supabase → Storage). */
export const MENU_IMAGE_MAX_BYTES = 10 * 1024 * 1024;

export function assertMenuImageFile(file: File): string | null {
  if (!file.type.startsWith("image/")) {
    return "יש לבחור קובץ תמונה (JPEG, PNG, WebP, GIF).";
  }
  if (file.size > MENU_IMAGE_MAX_BYTES) {
    return "גודל מקסימלי להעלאה: 10MB.";
  }
  return null;
}

/** מעלה ל־Storage ומחזיר URL ציבורי (הדבק ב־image_url / שמור ב־DB). */
export async function uploadMenuImage(
  supabase: SupabaseClient,
  file: File,
  userId: string,
): Promise<string> {
  const v = assertMenuImageFile(file);
  if (v) {
    throw new Error(v);
  }
  const raw = file.name.split(".").pop();
  const ext = raw && /^[a-z0-9]+$/i.test(raw) ? raw.toLowerCase() : "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(MENU_IMAGES_BUCKET)
    .upload(path, file, { cacheControl: "31536000", upsert: false });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage.from(MENU_IMAGES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * אם `imageUrl` מצביע לקובץ בדלי `menu-images` (URL ציבורי של Supabase) — מחזירים את
 * path בתוך הדלי, לרשימה ב־.remove(). אחרת null (URL חיצוני / ידני).
 */
export function menuImageStoragePathFromUrl(
  imageUrl: string | null | undefined,
): string | null {
  if (!imageUrl?.trim()) return null;
  try {
    const u = new URL(imageUrl);
    const marker = `/object/public/${MENU_IMAGES_BUCKET}/`;
    const i = u.pathname.indexOf(marker);
    if (i === -1) return null;
    const path = decodeURIComponent(u.pathname.slice(i + marker.length).replace(/^\/+/, ""));
    return path || null;
  } catch {
    return null;
  }
}

/** מחיקה מ-Storage — רלוונטי כש־`image_url` הופק מהעלאה לדלי. */
export async function removeMenuImageByUrl(
  supabase: SupabaseClient,
  imageUrl: string | null | undefined,
): Promise<{ error: { message: string } | null }> {
  const path = menuImageStoragePathFromUrl(imageUrl);
  if (!path) {
    return { error: null };
  }
  const { error } = await supabase.storage.from(MENU_IMAGES_BUCKET).remove([path]);
  if (error) {
    return { error };
  }
  return { error: null };
}
