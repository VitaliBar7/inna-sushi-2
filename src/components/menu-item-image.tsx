"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { Skeleton } from "@heroui/react";
import { cn } from "@heroui/react";

type Props = {
  src: string | null;
  alt: string;
  className?: string;
  large?: boolean;
};

export function MenuItemImage({ src, alt, className, large }: Props) {
  const [failed, setFailed] = useState(!src);
  const [loading, setLoading] = useState(!!src);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // כש־`src` משתנה — איפוס. תמונות ב-cache לעיתים `complete` לפני ש-onLoad מחובר — מסיימים טעינה ב-useLayoutEffect
  useLayoutEffect(() => {
    if (!src) {
      setFailed(true);
      setLoading(false);
      return;
    }
    setFailed(false);
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth > 0) {
      setLoading(false);
    } else {
      setLoading(true);
    }
  }, [src]);

  if (failed) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-gradient-to-br from-zinc-800/90 via-zinc-900 to-black text-4xl",
          large ? "size-full min-h-0 min-w-0" : "min-h-full",
          "border-e border-white/5",
          className,
        )}
        role="img"
        aria-label={alt}
      >
        <span className="drop-shadow-sm">🍣</span>
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden border-e border-white/5", className)}>
      {loading && (
        <Skeleton className="absolute inset-0 z-10 size-full min-h-0 min-w-0" />
      )}
      <img
        ref={imgRef}
        src={src!}
        alt={alt}
        onLoad={() => setLoading(false)}
        onError={() => {
          setFailed(true);
          setLoading(false);
        }}
        decoding="async"
        className={cn(
          "h-full w-full min-w-0 max-w-full object-cover",
          large ? "min-h-0" : "min-h-28",
        )}
      />
    </div>
  );
}
