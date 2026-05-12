"use client";

import { Link } from "@heroui/react";

export function SiteFooter() {
  return (
    <footer className="relative mt-12 box-border min-w-0 w-full shrink-0 overflow-x-clip overflow-y-visible py-8 pb-[max(2rem,env(safe-area-inset-bottom))] sm:mt-20">
      <div
        className="absolute inset-0 bg-gradient-to-t from-[color:var(--color-accent)] via-[color:var(--color-accent)] to-[color:var(--color-accent)]/92"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -top-px inset-x-0 h-px bg-gradient-to-l from-transparent via-black/12 to-transparent"
        aria-hidden
      />
      <div className="relative mx-auto flex w-full max-w-6xl min-w-0 flex-col items-center gap-2 px-4">
        <p className="max-w-full px-1 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-[#0a0a0a]/65 sm:text-xs sm:tracking-[0.2em]">
          הזמנה בטלפון
        </p>
        <Link
          href="tel:058-7659001"
          className="max-w-[min(100%,18rem)] text-center text-xl font-bold tabular-nums tracking-tight text-[#0a0a0a] no-underline transition-opacity hover:opacity-85 sm:text-2xl md:text-3xl"
        >
          058-7659001
        </Link>
      </div>
    </footer>
  );
}
