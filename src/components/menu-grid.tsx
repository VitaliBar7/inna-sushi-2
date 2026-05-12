"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@heroui/react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { fetchMenuItems } from "@/lib/supabase/fetch-menu-items";
import type { MenuItem } from "@/types/menu";
import {
  categoryLabels,
  groupByCategory,
  PassCardCompact,
  PassCardFeatured,
  CategoryHeading,
} from "@/components/menu-pass-cards";

export function MenuGrid({ items: initialItems }: { items: MenuItem[] }) {
  const [items, setItems] = useState<MenuItem[]>(initialItems);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const channel = supabase
      .channel("public-menu-items")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "menu_items" },
        () => {
          void fetchMenuItems(supabase).then((next) => {
            if (next !== null) setItems(next);
          });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase]);

  if (items.length === 0) {
    return (
      <Card
        variant="secondary"
        className="mx-auto max-w-2xl border border-dashed border-white/20 bg-zinc-950/40 backdrop-blur-sm"
      >
        <Card.Content className="p-8 text-center">
          <p className="text-foreground/80">אין פריטים בטבלה עדיין.</p>
          <p className="mt-2 text-sm text-foreground/60">
            הרץ <code className="text-[color:var(--color-accent-display)]">supabase/schema.sql</code> בפרויקט, הוסף
            מנהל ב-Authentication, ואז צור כרטיסים במסך המנהל.
          </p>
        </Card.Content>
      </Card>
    );
  }

  const { maki, special, other } = groupByCategory(items);

  return (
    <div className="min-w-0 space-y-10 lg:space-y-0">
      <div className="grid min-w-0 gap-12 lg:grid-cols-2 lg:items-start lg:gap-10">
        <div className="min-w-0 space-y-4">
          <CategoryHeading>{categoryLabels.maki}</CategoryHeading>
          <div className="flex flex-col gap-4">
            {maki.map((item) => (
              <PassCardCompact
                key={item.id}
                item={item}
              />
            ))}
          </div>
          {other.length > 0 ? (
            <div className="min-w-0 space-y-4 pt-4">
              <CategoryHeading>{categoryLabels.other}</CategoryHeading>
              <div className="flex flex-col gap-4">
                {other.map((item) => (
                  <PassCardCompact
                    key={item.id}
                    item={item}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="min-w-0 space-y-4">
          <CategoryHeading>{categoryLabels.special}</CategoryHeading>
          <div className="flex flex-col gap-6">
            {special.map((item) => (
              <PassCardFeatured
                key={item.id}
                item={item}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
