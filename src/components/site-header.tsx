"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button, toast, cn } from "@heroui/react";
import NextLink from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useCart } from "@/context/cart-context";

function CartIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z"
      />
    </svg>
  );
}

type SiteHeaderProps = {
  /** בדאשבורד מחובר — מוצג כפתור «יציאה». בדף הבית אין קישור לניהול (הכניסה ידנית ל־`/admin/login`). */
  showLogout?: boolean;
};

export function SiteHeader({ showLogout = false }: SiteHeaderProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { itemCount, openCart } = useCart();

  async function handleSignOut() {
    await supabase.auth.signOut();
    toast.info("התנתקת");
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <header
      role="banner"
      className="box-border min-w-0 w-full shrink-0 border-b border-white/[0.06] bg-black px-4 py-3 backdrop-blur-md supports-[backdrop-filter]:bg-black/90 md:px-8 md:py-4"
    >
      <div className="mx-auto flex w-full max-w-6xl min-w-0 items-center justify-between gap-2 sm:gap-4">
        <NextLink
          href="/"
          className="group flex min-w-0 items-center gap-1.5 text-[color:var(--color-accent)] sm:gap-2"
        >
          <span
            className="text-xl leading-none sm:text-2xl"
            aria-hidden
          >
            🍣
          </span>
          <span className="truncate font-semibold text-lg tracking-tight text-[color:var(--color-accent)] group-hover:opacity-90 sm:text-xl">
            Inna Sushi
          </span>
          <span
            className="hidden size-1.5 shrink-0 rounded-full bg-[#e8a598] sm:block"
            aria-hidden
          />
        </NextLink>
        <div className="flex shrink-0 items-center gap-2">
          {!showLogout ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="relative min-h-11 min-w-11 px-0"
              onPress={openCart}
              aria-label={itemCount > 0 ? `עגלה, ${itemCount} פריטים` : "פתח עגלה"}
            >
              <CartIcon className="size-5" />
              {itemCount > 0 ? (
                <span
                  className={cn(
                    "absolute -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1",
                    "-start-1 text-[10px] font-bold leading-none",
                    "bg-[color:var(--color-accent)] text-[color:var(--accent-foreground)]",
                  )}
                  aria-hidden
                >
                  {itemCount > 99 ? "99+" : itemCount}
                </span>
              ) : null}
            </Button>
          ) : null}
          {showLogout ? (
            <Button
              variant="tertiary"
              size="sm"
              className="min-h-10 shrink-0"
              onPress={() => void handleSignOut()}
            >
              יציאה
            </Button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
