import { randomBytes } from "node:crypto";

/** ללא 0/O/L/1 כדי לקריאות קוד קצר בהזמנה */
const ORDER_CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

/** קוד קצר (ברירת מחדל 6 תווים), ייחודי בטבלה ע"י unique constraint + ניסיון חוזר */
export function randomOrderCode(length = 6): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ORDER_CODE_ALPHABET[bytes[i]! % ORDER_CODE_ALPHABET.length];
  }
  return out;
}
