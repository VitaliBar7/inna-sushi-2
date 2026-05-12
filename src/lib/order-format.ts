/** פורמט שורת הזמנה לשיתוף בין API ללוגיקת ולידציה */

export type OrderLinePayload = {
  name: string;
  quantity: number;
  unitPrice: number;
};

/** מעלות = אזור משלוח; אחר = איסוף עצמי */
export type OrderFulfillment = "maalot" | "other";

export type OrderCustomerPayload = {
  customerName: string;
  phone: string;
  /** אם קיים — נשלח עותק גם ללקוח */
  customerEmail: string | null;
  fulfillment: OrderFulfillment;
};
