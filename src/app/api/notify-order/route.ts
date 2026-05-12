import { NextResponse } from "next/server";
import type {
  OrderCustomerPayload,
  OrderFulfillment,
  OrderLinePayload,
} from "@/lib/order-format";
import { randomOrderCode } from "@/lib/order-code";
import { roundMoney } from "@/lib/menu-price";
import { getSupabaseUrl } from "@/lib/supabase/config";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

import { normalizeOrderEmail } from "@/lib/order-email";

/**
 * מעביר הזמנה ל־Supabase Edge Function `notify-order-email` (שולח מייל דרך Resend).
 *
 * משתני סביבה בצד השרת של Next (קובץ `.env` / `.env.local` בכל אירוח — VPS, Docker, Node וכו'):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY — מפתח service_role מהדאשבורד (לא ל־NEXT_PUBLIC)
 *
 * Secrets של הפונקציה ב־Supabase:
 *   RESEND_API_KEY, ORDER_NOTIFY_FROM, ORDER_NOTIFY_TO
 */
function parseLines(raw: unknown): OrderLinePayload[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  if (raw.length > 100) return null;
  const out: OrderLinePayload[] = [];
  for (const row of raw) {
    if (typeof row !== "object" || row === null) return null;
    const r = row as Record<string, unknown>;
    if (typeof r.name !== "string" || r.name.trim().length === 0 || r.name.length > 220)
      return null;
    const q = Number(r.quantity);
    const up = Number(r.unitPrice);
    if (!Number.isFinite(q) || q < 1 || q > 999 || !Number.isInteger(q)) return null;
    if (!Number.isFinite(up) || up < 0 || up > 1_000_000) return null;
    out.push({
      name: r.name.trim(),
      quantity: q,
      unitPrice: roundMoney(up),
    });
  }
  return out;
}

function parseCustomer(body: Record<string, unknown>): OrderCustomerPayload | null {
  const nameRaw = body.customerName;
  const phoneRaw = body.phone;
  const emailRaw = body.customerEmail;
  const fulfillmentRaw = body.fulfillment;
  if (typeof nameRaw !== "string" || typeof phoneRaw !== "string") return null;
  const customerName = nameRaw.trim();
  if (customerName.length < 2 || customerName.length > 120) return null;
  const phoneDigits = phoneRaw.replace(/\D/g, "");
  if (phoneDigits.length < 9 || phoneDigits.length > 15) return null;
  const phone = phoneRaw.trim().slice(0, 30);
  let customerEmail: string | null = null;
  if (emailRaw !== undefined && emailRaw !== null) {
    if (typeof emailRaw !== "string") return null;
    const t = emailRaw.trim();
    if (t.length > 0) {
      const norm = normalizeOrderEmail(t);
      if (!norm) return null;
      customerEmail = norm;
    }
  }
  if (fulfillmentRaw !== "maalot" && fulfillmentRaw !== "other") return null;
  const fulfillment = fulfillmentRaw as OrderFulfillment;
  return { customerName, phone, customerEmail, fulfillment };
}

export async function POST(req: Request) {
  const baseUrl = getSupabaseUrl().replace(/\/$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!baseUrl || !serviceKey) {
    return NextResponse.json(
      {
        error:
          "חסרים NEXT_PUBLIC_SUPABASE_URL או SUPABASE_SERVICE_ROLE_KEY לשליחה דרך Supabase",
        code: "SUPABASE_FN_NOT_CONFIGURED",
      },
      { status: 503 },
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "גוף בקשה לא תקין" }, { status: 400 });
  }

  const body = json as Record<string, unknown>;
  const lines = parseLines(body.lines);
  if (!lines) {
    return NextResponse.json({ error: "פירוט הזמנה לא תקין" }, { status: 400 });
  }

  const customer = parseCustomer(body);
  if (!customer) {
    return NextResponse.json({ error: "פרטי לקוח לא תקינים (שם, טלפון, סוג הזמנה)" }, { status: 400 });
  }

  const totalRaw = Number(body.totalShekels);
  if (!Number.isFinite(totalRaw) || totalRaw < 0 || totalRaw > 1_000_000) {
    return NextResponse.json({ error: "סכום לא תקין" }, { status: 400 });
  }
  const total = roundMoney(totalRaw);
  const sumLines = roundMoney(
    lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0),
  );
  if (Math.abs(sumLines - total) > 0.02) {
    return NextResponse.json({ error: "סכום אינו תואם לפריטים" }, { status: 400 });
  }

  let orderCode: string | null = null;
  try {
    const serviceClient = createServiceRoleClient();
    for (let attempt = 0; attempt < 14; attempt++) {
      const code = randomOrderCode(6);
      const { error: insertError } = await serviceClient.from("orders").insert({
        order_code: code,
        status: "new",
        customer_name: customer.customerName,
        phone: customer.phone,
        fulfillment: customer.fulfillment,
        lines,
        total_shekels: total,
      });
      if (!insertError) {
        orderCode = code;
        break;
      }
      if (insertError.code === "23505") continue;
      const msg =
        typeof insertError.message === "string" ? insertError.message : "שמירת הזמנה נכשלה";
      return NextResponse.json(
        {
          error: `${msg} — הריצו migration_orders.sql / עדכנו schema ב-Supabase`,
          code: "ORDER_DB_ERROR",
        },
        { status: 503 },
      );
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "שגיאת שרת";
    return NextResponse.json(
      {
        error: msg,
        code: "ORDER_DB_ERROR",
      },
      { status: 503 },
    );
  }

  if (!orderCode) {
    return NextResponse.json(
      { error: "לא ניתן ליצור מספר הזמנה ייחודי — נסו שוב", code: "ORDER_CODE_COLLISION" },
      { status: 503 },
    );
  }

  const fnUrl = `${baseUrl}/functions/v1/notify-order-email`;

  const edgeRes = await fetch(fnUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      lines,
      totalShekels: total,
      customerName: customer.customerName,
      phone: customer.phone,
      customerEmail: customer.customerEmail,
      fulfillment: customer.fulfillment,
      orderCode,
      order_code: orderCode,
    }),
  });

  const data = (await edgeRes.json().catch(() => ({}))) as {
    ok?: boolean;
    id?: string | null;
    error?: string;
    code?: string;
  };

  if (!edgeRes.ok) {
    /* 404 מהענן = שם/פריסה — לא קיים functions/v1/notify-order-email בפרויקט הזה. */
    const fnMissing = edgeRes.status === 404;
    const devUpstream =
      process.env.NODE_ENV === "development"
        ? { upstreamStatus: edgeRes.status }
        : {};
    return NextResponse.json(
      {
        ...devUpstream,
        error: fnMissing
          ? "הפונקציה notify-order-email לא נמצאה ב-Supabase של ה-URL הזה — התחברו לפרויקט הנכון והריצו: supabase functions deploy notify-order-email"
          : typeof data.error === "string"
            ? data.error
            : "שגיאת Supabase Edge Function",
        code: fnMissing ? "EDGE_FUNCTION_NOT_FOUND" : data.code,
        orderCode,
      },
      { status: fnMissing ? 502 : edgeRes.status },
    );
  }

  return NextResponse.json({ ...data, orderCode });
}
