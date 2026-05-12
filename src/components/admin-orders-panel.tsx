"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import type { Key } from "@heroui/react";
import {
  Alert,
  Button,
  Card,
  Input,
  Label,
  ListBox,
  ScrollShadow,
  Select,
  Surface,
  TextField,
  toast,
  cn,
} from "@heroui/react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { priceFmtMenu } from "@/components/menu-pass-cards";
import { roundMoney } from "@/lib/menu-price";
import type { OrderFulfillment } from "@/lib/order-format";
import type { DbOrderRow, OrderStatus } from "@/types/order";
import { ORDER_STATUS_LABELS } from "@/types/order";

const STATUS_ORDER: OrderStatus[] = [
  "new",
  "preparing",
  "ready",
  "completed",
  "cancelled",
];

function fulfillmentHe(f: OrderFulfillment): string {
  return f === "maalot" ? "מעלות" : "איסוף";
}

function isOrderStatus(v: unknown): v is OrderStatus {
  return (
    v === "new" ||
    v === "preparing" ||
    v === "ready" ||
    v === "completed" ||
    v === "cancelled"
  );
}

function isFulfillment(v: unknown): v is OrderFulfillment {
  return v === "maalot" || v === "other";
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

function OrderLineItemsTable({
  order,
  wrapperClassName,
}: {
  order: DbOrderRow;
  wrapperClassName?: string;
}) {
  return (
    <div className={cn("border-t border-white/5", wrapperClassName)}>
      <p className="mb-2 text-xs font-medium text-foreground/45">שורות בהזמנה</p>
      <table className="w-full max-w-3xl border-collapse text-xs">
        <thead>
          <tr className="border-b border-white/10 text-foreground/45">
            <th className="py-1.5 text-start font-medium">פריט</th>
            <th className="w-14 py-1.5 text-center font-medium">כמות</th>
            <th className="w-24 py-1.5 text-end font-medium">סיכום</th>
          </tr>
        </thead>
        <tbody>
          {order.lines.map((l, i) => (
            <tr key={`${order.id}-line-${i}`} className="border-b border-white/[0.06] last:border-0">
              <td className="py-1.5 pe-2 text-foreground">{l.name}</td>
              <td className="py-1.5 text-center tabular-nums text-foreground/70">{l.quantity}</td>
              <td className="py-1.5 text-end tabular-nums text-foreground/85">
                {priceFmtMenu.format(roundMoney(l.unitPrice * l.quantity))}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="text-foreground">
            <td colSpan={2} className="pt-2 text-start text-xs font-medium text-foreground/50">
              סה״כ
            </td>
            <td className="pt-2 text-end text-sm font-bold tabular-nums text-[color:var(--color-accent-display)]">
              {priceFmtMenu.format(order.total_shekels)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function parseOrderRow(raw: Record<string, unknown>): DbOrderRow | null {
  if (typeof raw.id !== "string" || typeof raw.order_code !== "string") return null;
  if (!isOrderStatus(raw.status)) return null;
  if (typeof raw.customer_name !== "string" || typeof raw.phone !== "string") return null;
  if (!isFulfillment(raw.fulfillment)) return null;
  const total = Number(raw.total_shekels);
  if (!Number.isFinite(total)) return null;
  if (typeof raw.created_at !== "string" || typeof raw.updated_at !== "string") return null;
  const linesRaw = raw.lines;
  if (!Array.isArray(linesRaw)) return null;
  const lines: DbOrderRow["lines"] = [];
  for (const row of linesRaw) {
    if (typeof row !== "object" || row === null) return null;
    const l = row as Record<string, unknown>;
    if (typeof l.name !== "string") return null;
    const q = Number(l.quantity);
    const up = Number(l.unitPrice);
    if (!Number.isFinite(q) || q < 1 || !Number.isInteger(q)) return null;
    if (!Number.isFinite(up) || up < 0) return null;
    lines.push({ name: l.name, quantity: q, unitPrice: roundMoney(up) });
  }
  return {
    id: raw.id,
    order_code: raw.order_code,
    status: raw.status,
    customer_name: raw.customer_name,
    phone: raw.phone,
    fulfillment: raw.fulfillment,
    lines,
    total_shekels: roundMoney(total),
    created_at: raw.created_at,
    updated_at: raw.updated_at,
  };
}

export function AdminOrdersPanel({
  onNewPendingCount,
}: {
  onNewPendingCount: (count: number) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [orders, setOrders] = useState<DbOrderRow[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "idle" | "error">("loading");
  const [updating, setUpdating] = useState<string | null>(null);
  /** מזהי הזמנות עם פירוט פתוח */
  const [openDetailIds, setOpenDetailIds] = useState<Record<string, boolean>>({});
  /** סינון לפי סטטוס בתוך טאב ההזמנות (ללא «הכול») */
  const [statusTab, setStatusTab] = useState<OrderStatus>("new");
  /** חיפוש לפי מספר הזמנה בכל הסטטוסים (כשהשדה ריק — מוצג רק הטאב הנוכחי) */
  const [orderCodeSearch, setOrderCodeSearch] = useState("");

  const statusCounts = useMemo(() => {
    const c: Record<OrderStatus, number> = {
      new: 0,
      preparing: 0,
      ready: 0,
      completed: 0,
      cancelled: 0,
    };
    for (const o of orders) {
      c[o.status]++;
    }
    return c;
  }, [orders]);

  const normalizedCodeQuery = useMemo(() => {
    const t = orderCodeSearch.trim().replace(/^#/, "").toUpperCase();
    return t.length > 0 ? t : null;
  }, [orderCodeSearch]);

  const ordersInStatus = useMemo(
    () => orders.filter((o) => o.status === statusTab),
    [orders, statusTab],
  );

  const filteredOrders = useMemo(() => {
    if (normalizedCodeQuery) {
      return orders.filter((o) => o.order_code.toUpperCase().includes(normalizedCodeQuery));
    }
    return ordersInStatus;
  }, [orders, ordersInStatus, normalizedCodeQuery]);

  const copyOrderCode = useCallback(async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("מספר ההזמנה הועתק", { description: code });
    } catch {
      toast.danger("העתקה נכשלה", { description: "נסו שוב או העתיקו ידנית." });
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setLoadState("error");
      return;
    }
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(400);
    if (error) {
      console.error(error);
      setLoadState("error");
      return;
    }
    const rows: DbOrderRow[] = [];
    for (const row of data ?? []) {
      const p = parseOrderRow(row as Record<string, unknown>);
      if (p) rows.push(p);
    }
    setOrders(rows);
    setLoadState("idle");
    onNewPendingCount(rows.filter((o) => o.status === "new").length);
  }, [supabase, onNewPendingCount]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const channel = supabase
      .channel("admin-orders-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          void refresh();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, refresh]);

  async function setStatus(id: string, status: OrderStatus) {
    setUpdating(id);
    try {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
      await refresh();
    } catch (e) {
      toast.danger("עדכון סטטוס נכשל", {
        description: e instanceof Error ? e.message : "נסו שוב",
      });
    } finally {
      setUpdating(null);
    }
  }

  if (!isSupabaseConfigured()) {
    return (
      <Alert status="warning">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>חסר Supabase</Alert.Title>
          <Alert.Description>הגדירו .env.local והתחברו מחדש.</Alert.Description>
        </Alert.Content>
      </Alert>
    );
  }

  if (loadState === "error") {
    return (
      <Alert status="danger">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>לא ניתן לטעון הזמנות</Alert.Title>
          <Alert.Description className="text-pretty">
            ודאו שרצתם <code className="text-[color:var(--color-accent-display)]">supabase/migration_orders.sql</code> ו־{" "}
            <code className="text-[color:var(--color-accent-display)]">supabase/realtime_orders.sql</code> ב-SQL Editor.
          </Alert.Description>
        </Alert.Content>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-[color:var(--color-accent-display)] sm:text-2xl md:text-3xl">
        הזמנות שהתקבלו
      </h1>
      <p className="text-sm text-foreground/55">
        בחרו סטטוס להצגה; בחיפוש מספר הזמנה (עם או בלי #) התוצאות מכל הסטטוסים. בטבלה — חץ לפרטי מנות. ספירת «חדש» בטאב הראשי נעלמת אחרי עדכון סטטוס.
      </p>

      {loadState === "loading" && orders.length === 0 ? (
        <p className="text-foreground/60">טוען…</p>
      ) : null}

      {orders.length === 0 && loadState === "idle" ? (
        <Surface variant="default" className="rounded-xl border border-white/10 p-4 text-foreground/60">
          אין עדיין הזמנות במסד הנתונים.
        </Surface>
      ) : null}

      {orders.length > 0 ? (
        <>
          <div className="flex flex-col gap-3 border-b border-white/10 pb-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
            <div
              className="-mx-1 flex flex-nowrap gap-2 overflow-x-auto overscroll-x-contain px-1 pb-0.5 [-webkit-overflow-scrolling:touch]"
              role="tablist"
              aria-label="סינון הזמנות לפי סטטוס"
            >
              {STATUS_ORDER.map((s) => (
                <Button
                  key={s}
                  type="button"
                  variant={statusTab === s ? "primary" : "tertiary"}
                  size="sm"
                  className="h-10 shrink-0"
                  onPress={() => setStatusTab(s)}
                >
                  {ORDER_STATUS_LABELS[s]}
                  <span className="ms-1 tabular-nums opacity-80">({statusCounts[s]})</span>
                </Button>
              ))}
            </div>
            <TextField className="w-full min-w-0 sm:min-w-[12rem] sm:max-w-xs">
              <Label>חיפוש לפי מספר הזמנה</Label>
              <Input
                variant="secondary"
                className="min-h-11 font-mono"
                value={orderCodeSearch}
                onChange={(e) => setOrderCodeSearch(e.target.value)}
                placeholder="למשל 7HYM42 או #7HYM42"
                autoComplete="off"
                aria-label="חיפוש לפי מספר הזמנה"
              />
            </TextField>
          </div>

          {filteredOrders.length === 0 ? (
            <Surface variant="default" className="rounded-xl border border-white/10 p-4 text-foreground/65">
              {normalizedCodeQuery
                ? `אין הזמנה עם מספר שמכיל «${normalizedCodeQuery}» (חיפוש בכל הסטטוסים).`
                : `אין הזמנות בסטטוס «${ORDER_STATUS_LABELS[statusTab]}».`}
            </Surface>
          ) : (
            <>
              <div className="flex flex-col gap-3 md:hidden">
                {filteredOrders.map((order) => {
                  const isOpen = Boolean(openDetailIds[order.id]);
                  const lineKinds = order.lines.length;
                  const unitSum = order.lines.reduce((s, l) => s + l.quantity, 0);
                  const dateStr = new Date(order.created_at).toLocaleString("he-IL", {
                    dateStyle: "short",
                    timeStyle: "short",
                  });
                  return (
                    <Surface
                      key={order.id}
                      variant="default"
                      className={cn(
                        "rounded-xl border border-white/10 p-3",
                        order.status === "new" &&
                          "border-[color:var(--color-accent)]/35 bg-[color:var(--color-accent)]/[0.06]",
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2" dir="ltr">
                            <span className="font-mono text-base font-semibold text-[color:var(--color-accent-display)] [unicode-bidi:isolate]">
                              #{order.order_code}
                            </span>
                            <Button
                              type="button"
                              variant="tertiary"
                              size="sm"
                              className="inline-flex h-9 min-h-9 min-w-9 items-center justify-center p-0"
                              onPress={() => void copyOrderCode(order.order_code)}
                              aria-label={`העתק מספר הזמנה ${order.order_code}`}
                            >
                              <CopyIcon className="size-3" />
                            </Button>
                          </div>
                          <p className="text-xs text-foreground/60 tabular-nums">{dateStr}</p>
                        </div>
                        <Button
                          type="button"
                          variant="tertiary"
                          size="sm"
                          className="min-h-10 min-w-10 shrink-0 px-0"
                          onPress={() =>
                            setOpenDetailIds((prev) => ({
                              ...prev,
                              [order.id]: !prev[order.id],
                            }))
                          }
                          aria-expanded={isOpen}
                          aria-label={isOpen ? "סגור פירוט הזמנה" : "פתח פירוט הזמנה"}
                        >
                          <span className="tabular-nums">{isOpen ? "▼" : "▶"}</span>
                        </Button>
                      </div>
                      <dl className="mt-3 grid gap-2 text-sm">
                        <div className="flex justify-between gap-3">
                          <dt className="shrink-0 text-foreground/55">לקוח</dt>
                          <dd className="min-w-0 text-end font-medium text-foreground">{order.customer_name}</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                          <dt className="shrink-0 text-foreground/55">טלפון</dt>
                          <dd className="min-w-0 text-end tabular-nums text-foreground/80" dir="ltr">
                            {order.phone}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-3">
                          <dt className="shrink-0 text-foreground/55">סוג</dt>
                          <dd className="text-end text-foreground/80">{fulfillmentHe(order.fulfillment)}</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                          <dt className="shrink-0 text-foreground/55">פריטים</dt>
                          <dd className="text-end tabular-nums text-foreground/65">
                            {lineKinds}×{unitSum}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-3">
                          <dt className="shrink-0 text-foreground/55">סה״כ</dt>
                          <dd className="text-end text-base font-bold tabular-nums text-[color:var(--color-accent-display)]">
                            {priceFmtMenu.format(order.total_shekels)}
                          </dd>
                        </div>
                      </dl>
                      <div className="mt-3">
                        <Select
                          className="w-full"
                          value={order.status as Key}
                          isDisabled={updating === order.id}
                          onChange={(key) => {
                            if (key == null) return;
                            const next = String(key) as OrderStatus;
                            if (!isOrderStatus(next) || next === order.status) return;
                            void setStatus(order.id, next);
                          }}
                        >
                          <Label className="text-foreground/75">סטטוס</Label>
                          <Select.Trigger className="min-h-11 w-full">
                            <Select.Value />
                            <Select.Indicator />
                          </Select.Trigger>
                          <Select.Popover>
                            <ListBox>
                              {STATUS_ORDER.map((s) => (
                                <ListBox.Item key={s} id={s} textValue={ORDER_STATUS_LABELS[s]}>
                                  {ORDER_STATUS_LABELS[s]}
                                  <ListBox.ItemIndicator />
                                </ListBox.Item>
                              ))}
                            </ListBox>
                          </Select.Popover>
                        </Select>
                      </div>
                      {isOpen ? (
                        <OrderLineItemsTable order={order} wrapperClassName="px-0 py-3" />
                      ) : null}
                    </Surface>
                  );
                })}
              </div>
            <Card className="hidden overflow-hidden p-0 md:block">
          <ScrollShadow
            hideScrollBar
            orientation="horizontal"
            className="w-full touch-pan-x"
          >
            {/* dir=ltr: stable thead/tbody columns on rtl pages; order is left→right */}
            <table
              dir="ltr"
              className="w-full min-w-[56rem] border-collapse text-sm"
            >
              <thead>
                <tr className="border-b border-white/10 text-foreground/50">
                  <th
                    className="w-10 min-w-10 px-1 py-2.5 text-center font-medium"
                    aria-label="פתיחת פירוט"
                  >
                    <span className="sr-only">פירוט</span>
                  </th>
                  <th className="whitespace-nowrap px-2 py-2.5 text-start font-medium">מספר</th>
                  <th className="whitespace-nowrap px-2 py-2.5 text-start font-medium">תאריך</th>
                  <th className="max-w-[10rem] px-2 py-2.5 text-start font-medium">לקוח</th>
                  <th className="hidden whitespace-nowrap px-2 py-2.5 text-start font-medium sm:table-cell">
                    טלפון
                  </th>
                  <th className="whitespace-nowrap px-2 py-2.5 text-start font-medium">סוג</th>
                  <th className="whitespace-nowrap px-2 py-2.5 text-center text-xs font-medium">פריטים</th>
                  <th className="whitespace-nowrap px-2 py-2.5 text-start font-medium">סה״כ</th>
                  <th className="min-w-[9.5rem] px-2 py-2.5 text-start font-medium">סטטוס</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => {
                  const isOpen = Boolean(openDetailIds[order.id]);
                  const lineKinds = order.lines.length;
                  const unitSum = order.lines.reduce((s, l) => s + l.quantity, 0);
                  const dateStr = new Date(order.created_at).toLocaleString("he-IL", {
                    dateStyle: "short",
                    timeStyle: "short",
                  });
                  const COL_SPAN = 9;
                  return (
                    <Fragment key={order.id}>
                      <tr
                        className={`border-b border-white/5 transition-colors last:border-0 hover:bg-white/[0.03] ${order.status === "new" ? "bg-[color:var(--color-accent)]/[0.06]" : ""}`}
                      >
                        <td className="px-1 py-1.5 text-center align-middle">
                          <Button
                            type="button"
                            variant="tertiary"
                            size="sm"
                            className="min-h-10 min-w-10 px-0"
                            onPress={() =>
                              setOpenDetailIds((prev) => ({
                                ...prev,
                                [order.id]: !prev[order.id],
                              }))
                            }
                            aria-expanded={isOpen}
                            aria-label={isOpen ? "סגור פירוט הזמנה" : "פתח פירוט הזמנה"}
                          >
                            <span className="tabular-nums">{isOpen ? "▼" : "▶"}</span>
                          </Button>
                        </td>
                        <td className="whitespace-nowrap px-2 py-2">
                          <div
                            className="flex items-center gap-1"
                            dir="ltr"
                          >
                            <span
                              className="inline-block font-mono font-semibold text-[color:var(--color-accent-display)] [unicode-bidi:isolate]"
                            >
                              #{order.order_code}
                            </span>
                            <Button
                              type="button"
                              variant="tertiary"
                              size="sm"
                              className="inline-flex h-9 w-9 shrink-0 items-center justify-center p-0 text-foreground/55 hover:text-foreground/90"
                              onPress={() => void copyOrderCode(order.order_code)}
                              aria-label={`העתק מספר הזמנה ${order.order_code}`}
                            >
                              <CopyIcon className="size-3" />
                            </Button>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-2 py-2 text-foreground/65 tabular-nums">
                          {dateStr}
                        </td>
                        <td className="max-w-[10rem] px-2 py-2">
                          <span className="line-clamp-2 font-medium text-foreground">{order.customer_name}</span>
                        </td>
                        <td className="hidden whitespace-nowrap px-2 py-2 text-foreground/70 sm:table-cell">
                          {order.phone}
                        </td>
                        <td className="whitespace-nowrap px-2 py-2 text-foreground/75">
                          {fulfillmentHe(order.fulfillment)}
                        </td>
                        <td
                          className="whitespace-nowrap px-2 py-2 text-center text-xs text-foreground/65 tabular-nums"
                          title={`${lineKinds} סוגי מנות · ${unitSum} יחידות`}
                        >
                          {lineKinds}×{unitSum}
                        </td>
                        <td className="whitespace-nowrap px-2 py-2 font-semibold tabular-nums text-[color:var(--color-accent-display)]">
                          {priceFmtMenu.format(order.total_shekels)}
                        </td>
                        <td className="px-2 py-1 align-middle">
                          <Select
                            className="w-full min-w-[8.75rem]"
                            value={order.status as Key}
                            isDisabled={updating === order.id}
                            onChange={(key) => {
                              if (key == null) return;
                              const next = String(key) as OrderStatus;
                              if (!isOrderStatus(next) || next === order.status) return;
                              void setStatus(order.id, next);
                            }}
                          >
                            <Label className="sr-only">סטטוס הזמנה {order.order_code}</Label>
                            <Select.Trigger className="min-h-10">
                              <Select.Value />
                              <Select.Indicator />
                            </Select.Trigger>
                            <Select.Popover>
                              <ListBox>
                                {STATUS_ORDER.map((s) => (
                                  <ListBox.Item key={s} id={s} textValue={ORDER_STATUS_LABELS[s]}>
                                    {ORDER_STATUS_LABELS[s]}
                                    <ListBox.ItemIndicator />
                                  </ListBox.Item>
                                ))}
                              </ListBox>
                            </Select.Popover>
                          </Select>
                        </td>
                      </tr>
                      {isOpen ? (
                        <tr className="border-b border-white/5 bg-white/[0.02] last:border-0">
                          <td colSpan={COL_SPAN} className="p-0">
                            <OrderLineItemsTable
                              order={order}
                              wrapperClassName="px-3 py-2 md:px-4"
                            />
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </ScrollShadow>
        </Card>
            </>
          )}
        </>
      ) : null}
    </div>
  );
}
