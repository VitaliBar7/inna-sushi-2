"use client";

import { Button } from "@heroui/react";
import type { MenuItem } from "@/types/menu";
import { useCart } from "@/context/cart-context";
import { cn } from "@heroui/react";

type Props = {
  item: MenuItem;
  className?: string;
};

/** בחירת כמות לעגלה — + בלבד או − / כמות / + */
export function AddToCartButton({ item, className }: Props) {
  const { lines, addItem, setLineQuantity } = useCart();
  const line = lines.find((l) => l.menuItemId === item.id);
  const qty = line?.quantity ?? 0;

  const btnQty =
    "inline-flex h-10 min-h-10 min-w-10 shrink-0 items-center justify-center rounded-lg px-0 text-base font-semibold leading-none tabular-nums";

  if (qty < 1) {
    return (
      <div className={cn("inline-flex", className, "max-w-full w-fit shrink-0")}>
        <Button
          type="button"
          variant="secondary"
          className={btnQty}
          onPress={() => addItem(item)}
          aria-label={`הוסף ${item.name} לעגלה`}
        >
          +
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex max-w-full shrink-0 items-center gap-0 overflow-hidden rounded-xl border border-white/15 bg-white/[0.06]",
        className,
        "w-fit",
      )}
      role="group"
      aria-label={`כמות ${item.name} בעגלה: ${qty}`}
    >
      <Button
        type="button"
        variant="tertiary"
        className={cn(btnQty, "rounded-none rounded-s-xl")}
        onPress={() => setLineQuantity(item.id, qty - 1)}
        aria-label="הפחת כמות"
      >
        −
      </Button>
      <span className="min-w-8 px-1 text-center text-sm font-semibold tabular-nums text-white">
        {qty}
      </span>
      <Button
        type="button"
        variant="tertiary"
        className={cn(btnQty, "rounded-none rounded-e-xl")}
        onPress={() => addItem(item)}
        aria-label="הוסף כמות"
      >
        +
      </Button>
    </div>
  );
}
