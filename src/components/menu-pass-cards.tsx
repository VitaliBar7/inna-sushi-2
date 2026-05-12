"use client";

import { Card, Separator, Text } from "@heroui/react";
import { cn } from "@heroui/react";
import type { MenuItem } from "@/types/menu";
import { effectivePriceForItem, formatDiscountShort, hasDiscount } from "@/lib/menu-price";
import { MenuItemImage } from "@/components/menu-item-image";
import { AddToCartButton } from "@/components/add-to-cart-button";

function PassSetList({ item, compact }: { item: MenuItem; compact: boolean }) {
  const lines = item.set_contents;
  if (!lines?.length) return null;
  return (
    <div
      className={cn(
        "border-t border-white/5",
        compact ? "mt-1.5 pt-1.5" : "mt-2 pt-2",
      )}
    >
      <p
        className={cn(
          "mb-1 font-bold uppercase tracking-wider text-foreground/40",
          compact ? "text-[9px]" : "text-[10px]",
        )}
      >
        הסט כולל
      </p>
      <ul
        className={cn(
          "list-none space-y-0.5 pe-0 text-pretty text-foreground/70",
          compact
            ? "max-h-24 overflow-y-auto pr-0.5 text-[11px] leading-snug [scrollbar-width:thin] sm:max-h-28 sm:text-xs"
            : "text-sm leading-relaxed sm:text-base",
        )}
      >
        {lines.map((line, i) => (
          <li
            key={i}
            className="flex gap-1.5 before:content-['•'] before:shrink-0 before:font-bold before:text-[color:var(--color-accent-display)]/90"
          >
            {line}
          </li>
        ))}
      </ul>
    </div>
  );
}

export const priceFmtMenu = new Intl.NumberFormat("he-IL", {
  style: "currency",
  currency: "ILS",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const categoryLabels: Record<string, string> = {
  maki: "רולים",
  special: "קומבינציות",
  other: "אחר",
};

export function groupByCategory(items: MenuItem[]) {
  const maki: MenuItem[] = [];
  const special: MenuItem[] = [];
  const other: MenuItem[] = [];
  for (const it of items) {
    if (it.category === "maki") maki.push(it);
    else if (it.category === "special") special.push(it);
    else other.push(it);
  }
  return { maki, special, other };
}

function PassStrip() {
  return (
    <div
      className="w-1.5 shrink-0 self-stretch bg-gradient-to-b from-[color:var(--color-accent)] via-[#238f52] to-zinc-800/50 shadow-[0_0_20px_rgba(66,214,116,0.4)]"
      aria-hidden
    />
  );
}

function PassPriceBlock({ item, layout }: { item: MenuItem; layout: "compact" | "featured" }) {
  const d = item.discount_percent;
  const list = item.price;
  const eff = effectivePriceForItem(item);
  const show = hasDiscount(d);
  const chipClass =
    layout === "compact"
      ? "px-1.5 py-0 text-[10px] leading-tight"
      : "px-2 py-0.5 text-xs leading-tight";
  const listFormat = priceFmtMenu.format(list);
  const effFormat = priceFmtMenu.format(eff);
  const a11y = show
    ? `מחיר מחירון ${listFormat}, ${formatDiscountShort(d)} הנחה, מחיר לתשלום ${effFormat}`
    : `מחיר ${effFormat}`;

  return (
    <div
      className="flex min-w-0 max-w-full flex-col items-end gap-0.5"
      aria-label={a11y}
    >
      {show ? (
        <span
          className={cn(
            "inline-flex shrink-0 items-center rounded-full border border-[color:var(--color-accent)]/45 bg-[color:var(--color-accent)]/18 font-bold tabular-nums text-[color:var(--color-accent-display)]",
            chipClass,
          )}
        >
          −{formatDiscountShort(d)}
        </span>
      ) : null}
      {show ? (
        <span className="tabular-nums text-foreground/45 line-through decoration-foreground/35">
          {listFormat}
        </span>
      ) : null}
      <span
        className={cn(
          "inline-flex w-fit max-w-full shrink-0 items-center justify-end rounded-full border border-white/10 font-bold tabular-nums text-[color:var(--color-accent-display)]",
          show
            ? cn(
                layout === "compact"
                  ? "min-h-9 items-center bg-white/10 px-3 py-1.5 text-xs backdrop-blur-sm sm:min-h-10 sm:text-sm"
                  : "min-h-10 items-center bg-white/10 px-4 py-2 text-sm backdrop-blur-md sm:text-base",
              )
            : layout === "compact"
              ? "min-h-9 items-center bg-white/5 px-3 py-1.5 text-xs backdrop-blur-sm sm:min-h-10 sm:px-3.5 sm:text-sm"
              : "min-h-10 items-center bg-white/10 px-4 py-2 text-sm backdrop-blur-md sm:text-base",
        )}
      >
        {effFormat}
      </span>
    </div>
  );
}

export function PassCardCompact({ item }: { item: MenuItem }) {
  return (
    <Card
      variant="transparent"
      className={cn(
        "group relative box-border max-w-full min-w-0 w-full gap-0 overflow-hidden rounded-3xl p-0 shadow-none",
        "border border-white/10",
        "bg-gradient-to-l from-zinc-900/40 to-zinc-950/90",
        "shadow-[0_4px_24px_rgba(0,0,0,0.45),0_0_0_1px_rgba(255,255,255,0.04)_inset,0_0_40px_-12px_rgba(66,214,116,0.1)]",
        "transition-[transform,box-shadow] duration-300 will-change-transform",
        "hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(0,0,0,0.5),0_0_0_1px_rgba(66,214,116,0.22)_inset,0_0_48px_-8px_rgba(66,214,116,0.2)]",
        "active:scale-[0.99]",
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-l from-white/[0.04] to-transparent opacity-0 transition-opacity group-hover:opacity-100"
        aria-hidden
      />
      <div className="flex min-h-[7rem] w-full max-w-full min-w-0 flex-row">
        <PassStrip />
        <div className="w-[5.25rem] shrink-0 self-stretch overflow-hidden sm:w-32">
          <MenuItemImage
            src={item.image_url}
            alt={item.name}
            large={false}
            className="h-full"
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 px-3 py-2.5 sm:px-4">
          <div className="flex min-w-0 w-full flex-wrap items-start justify-between gap-2">
            <h3 className="line-clamp-2 min-w-0 text-balance text-base font-semibold leading-tight text-white sm:text-lg">
              {item.name}
            </h3>
            <PassPriceBlock
              item={item}
              layout="compact"
            />
          </div>
          {item.description ? (
            <Text className="line-clamp-2 min-w-0 max-w-full text-pretty text-xs leading-snug text-foreground/65 sm:text-sm">
              {item.description}
            </Text>
          ) : null}
          <PassSetList
            item={item}
            compact
          />
          <div className="mt-2 flex justify-end">
            <AddToCartButton item={item} />
          </div>
        </div>
      </div>
    </Card>
  );
}

export function PassCardFeatured({ item }: { item: MenuItem }) {
  return (
    <Card
      variant="transparent"
      className={cn(
        "group relative box-border max-w-full min-w-0 w-full gap-0 overflow-hidden rounded-[1.4rem] p-0 shadow-none sm:rounded-3xl",
        "border border-white/10",
        "bg-gradient-to-b from-zinc-800/30 to-zinc-950/95",
        "shadow-[0_8px_32px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.05)_inset,0_0_52px_-14px_rgba(66,214,116,0.12)]",
        "transition-[transform,box-shadow] duration-300",
        "hover:-translate-y-0.5 hover:shadow-[0_16px_48px_rgba(0,0,0,0.55),0_0_0_1px_rgba(66,214,116,0.25)_inset,0_0_56px_-8px_rgba(66,214,116,0.22)]",
        "active:scale-[0.995]",
      )}
    >
      <div
        className="pointer-events-none absolute inset-y-0 start-0 z-[1] w-1.5 bg-gradient-to-b from-[color:var(--color-accent)] via-[#1a7040] to-zinc-900/85 shadow-[0_0_22px_rgba(66,214,116,0.45)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[color:var(--color-accent)]/8 to-transparent"
        aria-hidden
      />
      <div className="relative aspect-[5/2] w-full max-w-full min-w-0 overflow-hidden sm:aspect-[2/1]">
        <MenuItemImage
          src={item.image_url}
          alt={item.name}
          large
          className="h-full w-full"
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-zinc-950/95 via-zinc-950/20 to-transparent"
          aria-hidden
        />
      </div>
      <div className="flex min-w-0 flex-col gap-3 px-4 pb-5 pt-2">
        <div className="h-px w-14 rounded-full bg-gradient-to-l from-[color:var(--color-accent)]/90 to-transparent" />
        <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
          <h3 className="min-w-0 text-balance text-xl font-semibold text-white sm:text-2xl">
            {item.name}
          </h3>
          <PassPriceBlock
            item={item}
            layout="featured"
          />
        </div>
        {item.description ? (
          <Text className="text-pretty min-w-0 max-w-full text-sm leading-relaxed text-foreground/75 sm:text-base">
            {item.description}
          </Text>
        ) : null}
        <PassSetList
          item={item}
          compact={false}
        />
        <div className="mt-1 flex justify-end">
          <AddToCartButton item={item} />
        </div>
      </div>
    </Card>
  );
}

export function CategoryHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1 flex min-w-0 items-center gap-3 pt-2">
      <span
        className="size-1.5 shrink-0 rounded-full bg-[color:var(--color-accent)] shadow-[0_0_14px_rgba(66,214,116,0.65)]"
        aria-hidden
      />
      <h2 className="shrink-0 text-sm font-bold tracking-wide text-white md:text-[0.8125rem]">{children}</h2>
      <Separator
        variant="tertiary"
        className="min-w-0 flex-1 opacity-45 max-sm:opacity-35"
      />
    </div>
  );
}

export function MenuPassByCategory({ item }: { item: MenuItem }) {
  if (item.category === "special") {
    return <PassCardFeatured item={item} />;
  }
  return <PassCardCompact item={item} />;
}
