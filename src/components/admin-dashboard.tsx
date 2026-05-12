"use client";

import { useState } from "react";
import { Badge, Button } from "@heroui/react";
import { AdminMenuPanel } from "@/components/admin-menu-panel";
import { AdminOrdersPanel } from "@/components/admin-orders-panel";
import type { MenuItem } from "@/types/menu";

type Tab = "menu" | "orders";

export function AdminDashboard({
  initialItems,
  initialNewOrdersCount,
}: {
  initialItems: MenuItem[];
  initialNewOrdersCount: number;
}) {
  const [tab, setTab] = useState<Tab>("menu");
  const [newOrdersBadge, setNewOrdersBadge] = useState(initialNewOrdersCount);

  return (
    <div className="space-y-6">
      <div className="border-b border-white/10 pb-3">
      <div className="flex flex-nowrap gap-2 overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
        <Button
          type="button"
          variant={tab === "menu" ? "primary" : "tertiary"}
          className="h-10 shrink-0"
          onPress={() => setTab("menu")}
        >
          תפריט
        </Button>
        <Button
          type="button"
          variant={tab === "orders" ? "primary" : "tertiary"}
          className={
            newOrdersBadge > 0
              ? "relative h-10 shrink-0 overflow-visible px-5 pb-2 pt-2.5"
              : "relative h-10 shrink-0 overflow-visible px-4 py-2"
          }
          onPress={() => setTab("orders")}
          aria-label={
            newOrdersBadge > 0
              ? `הזמנות, ${newOrdersBadge} חדשות`
              : "הזמנות"
          }
        >
          <span className="font-medium">הזמנות</span>
          {newOrdersBadge > 0 ? (
            <span
              className="pointer-events-none absolute end-1.5 top-1.5 z-10"
              aria-hidden
            >
              <Badge
                color="danger"
                size="sm"
                className="ring-1 ring-black/80 shadow-sm"
              >
                {newOrdersBadge > 99 ? "99+" : newOrdersBadge}
              </Badge>
            </span>
          ) : null}
        </Button>
      </div>
      </div>
      <div className={tab !== "menu" ? "hidden" : undefined} aria-hidden={tab !== "menu"}>
        <AdminMenuPanel initialItems={initialItems} />
      </div>
      <div className={tab !== "orders" ? "hidden" : undefined} aria-hidden={tab !== "orders"}>
        <AdminOrdersPanel onNewPendingCount={setNewOrdersBadge} />
      </div>
    </div>
  );
}
