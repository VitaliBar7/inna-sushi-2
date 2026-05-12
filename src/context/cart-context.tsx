"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { MenuItem } from "@/types/menu";
import { effectivePriceForItem, roundMoney } from "@/lib/menu-price";

const STORAGE_KEY = "inna-sushi-cart-v1";

export type CartLine = {
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
};

type PersistedCart = {
  lines: CartLine[];
};

type CartContextValue = {
  lines: CartLine[];
  itemCount: number;
  totalShekels: number;
  addItem: (item: MenuItem) => void;
  removeLine: (menuItemId: string) => void;
  setLineQuantity: (menuItemId: string, quantity: number) => void;
  clearCart: () => void;
  isOpen: boolean;
  setCartOpen: (open: boolean) => void;
  openCart: () => void;
  closeCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function totalItemCount(lines: CartLine[]): number {
  return lines.reduce((s, l) => s + l.quantity, 0);
}

function totalPrice(lines: CartLine[]): number {
  return roundMoney(lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0));
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as PersistedCart;
        if (Array.isArray(parsed?.lines)) {
          setLines(
            parsed.lines.filter(
              (l) =>
                l &&
                typeof l.menuItemId === "string" &&
                typeof l.name === "string" &&
                typeof l.unitPrice === "number" &&
                typeof l.quantity === "number" &&
                l.quantity > 0,
            ),
          );
        }
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ lines } satisfies PersistedCart));
    } catch {
      /* ignore */
    }
  }, [lines, hydrated]);

  const addItem = useCallback((item: MenuItem) => {
    const unitPrice = effectivePriceForItem(item);
    setLines((prev) => {
      const i = prev.findIndex((l) => l.menuItemId === item.id);
      if (i >= 0) {
        const next = [...prev];
        const line = next[i]!;
        next[i] = { ...line, quantity: line.quantity + 1, unitPrice };
        return next;
      }
      return [
        ...prev,
        {
          menuItemId: item.id,
          name: item.name,
          unitPrice,
          quantity: 1,
        },
      ];
    });
  }, []);

  const removeLine = useCallback((menuItemId: string) => {
    setLines((prev) => prev.filter((l) => l.menuItemId !== menuItemId));
  }, []);

  const setLineQuantity = useCallback((menuItemId: string, quantity: number) => {
    const q = Math.floor(quantity);
    if (q < 1) {
      setLines((prev) => prev.filter((l) => l.menuItemId !== menuItemId));
      return;
    }
    setLines((prev) =>
      prev.map((l) =>
        l.menuItemId === menuItemId ? { ...l, quantity: q } : l,
      ),
    );
  }, []);

  const clearCart = useCallback(() => setLines([]), []);

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      itemCount: totalItemCount(lines),
      totalShekels: totalPrice(lines),
      addItem,
      removeLine,
      setLineQuantity,
      clearCart,
      isOpen,
      setCartOpen: setIsOpen,
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
    }),
    [lines, isOpen, addItem, removeLine, setLineQuantity, clearCart],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within CartProvider");
  }
  return ctx;
}
