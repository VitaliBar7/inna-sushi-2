"use client";

import Image from "next/image";

/** כותרת תפריט מעל תמונת רקע (סושי) */
export function PublicMenuHero() {
  return (
    <header className="mb-10 w-full">
      <div
        className="relative mx-auto w-full min-h-[17.5rem] overflow-hidden rounded-2xl border border-white/10 shadow-[0_12px_48px_rgba(0,0,0,0.45),0_0_40px_-12px_rgba(66,214,116,0.1)] sm:min-h-[20rem] md:min-h-[24rem]"
      >
        <Image
          src="/main-photo.jpg"
          alt="מגש סושי ורולים טריים"
          fill
          sizes="(max-width: 768px) 100vw, min(1152px, 100vw)"
          className="object-cover"
          priority
        />
        {/* כיסוי כהה — הכיתוב קריא על התמונה */}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/82 via-black/55 to-black/72"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_80%_at_50%_40%,transparent_0%,rgba(0,0,0,0.35)_100%)]"
          aria-hidden
        />

        <div className="relative z-10 flex min-h-[17.5rem] flex-col items-center justify-center gap-2 px-6 py-10 text-center sm:min-h-[20rem] md:min-h-[24rem] md:px-10 md:py-14">
          <p className="text-[10px] font-bold uppercase tracking-[0.42em] text-[color:var(--color-accent-display)] md:text-[11px]">
            Inna Sushi
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-sm md:text-[2.125rem]">
            תפריט
          </h1>
          <div
            className="mt-2 h-px w-20 rounded-full bg-gradient-to-l from-[color:var(--color-accent)]/75 via-[color:var(--color-accent)]/30 to-transparent"
            aria-hidden
          />
        </div>
      </div>
    </header>
  );
}
