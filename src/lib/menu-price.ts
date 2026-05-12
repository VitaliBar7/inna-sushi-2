import { parseSetContents } from "@/lib/menu-sets";
import type { MenuItem } from "@/types/menu";

/** מעגלי שקלים (שני מקומות עשרוניים). */
export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

/** מנרמל אחוז בין 0–100. */
export function clampDiscountPercent(n: number): number {
  if (Number.isNaN(n) || n < 0) return 0;
  if (n > 100) return 100;
  return roundMoney(n);
}

export function hasDiscount(discountPercent: number | null | undefined): boolean {
  return clampDiscountPercent(discountPercent ?? 0) > 0;
}

/** `price` = מחיר מחירון לפני הנחה. */
export function effectivePriceAfterDiscount(
  listPrice: number,
  discountPercent: number | null | undefined,
): number {
  const d = clampDiscountPercent(discountPercent ?? 0);
  if (d <= 0) return roundMoney(listPrice);
  return roundMoney(listPrice * (1 - d / 100));
}

export function effectivePriceForItem(item: MenuItem): number {
  return effectivePriceAfterDiscount(item.price, item.discount_percent);
}

export function formatDiscountShort(discountPercent: number): string {
  const d = clampDiscountPercent(discountPercent);
  if (d <= 0) return "";
  return d % 1 === 0 ? `${Math.round(d)}%` : `${d}%`;
}

/** בטבלאות/תגובה מ־DB — אם אין עמודה, 0. */
export function normalizeMenuItem(raw: MenuItem | Record<string, unknown>): MenuItem {
  const r = raw as MenuItem;
  const price = typeof r.price === "number" && !Number.isNaN(r.price) ? r.price : Number(r.price) || 0;
  const dRaw = (r as { discount_percent?: unknown }).discount_percent;
  const d =
    typeof dRaw === "number" && !Number.isNaN(dRaw)
      ? dRaw
      : Number(dRaw) || 0;
  return {
    ...r,
    price: roundMoney(price),
    discount_percent: clampDiscountPercent(d),
    set_contents: parseSetContents((r as { set_contents?: unknown }).set_contents),
  };
}

export function normalizeMenuItems(list: MenuItem[] | null | undefined): MenuItem[] {
  return (list ?? []).map(normalizeMenuItem);
}
