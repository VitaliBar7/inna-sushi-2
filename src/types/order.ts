import type { OrderFulfillment, OrderLinePayload } from "@/lib/order-format";

/** סטטוסים באדמין — `new` נספר בבאדג' עד לעדכון ידני */
export type OrderStatus =
  | "new"
  | "preparing"
  | "ready"
  | "completed"
  | "cancelled";

export type DbOrderRow = {
  id: string;
  order_code: string;
  status: OrderStatus;
  customer_name: string;
  phone: string;
  fulfillment: OrderFulfillment;
  lines: OrderLinePayload[];
  total_shekels: number;
  created_at: string;
  updated_at: string;
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  new: "חדש",
  preparing: "בהכנה",
  ready: "מוכן",
  completed: "הושלם",
  cancelled: "בוטל",
};
