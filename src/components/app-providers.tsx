"use client";

import { ToastProvider } from "@heroui/react";
import { CartProvider } from "@/context/cart-context";
import { CartDrawer } from "@/components/cart-drawer";

/**
 * ToastProvider ב-HeroUI v3: לא מעבירים את children לתוך ה-Provider.
 * אחרת `children` הופכים ל"תבנית טוסט" במקום לתוכן הדפים — תסמינים: מסך שחור / דף שבור.
 * שילוב נכון: אזור טוסט (self-closed) + תוכן האתר אחריו, באותו אב.
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ToastProvider
        placement="bottom"
        maxVisibleToasts={4}
      />
      <CartProvider>
        {children}
        <CartDrawer />
      </CartProvider>
    </>
  );
}
