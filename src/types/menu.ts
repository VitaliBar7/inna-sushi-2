export type MenuCategory = "maki" | "special" | "other";

export type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  /** מחיר מחירון לפני הנחה */
  price: number;
  /** 0 = ללא הנחה, עד 100 */
  discount_percent: number;
  category: string;
  image_url: string | null;
  /** רשימת שמות רולים/מוצרים בכרטיס סט — `null` או ריק = ללא */
  set_contents: string[] | null;
  created_at: string;
  updated_at: string;
};
