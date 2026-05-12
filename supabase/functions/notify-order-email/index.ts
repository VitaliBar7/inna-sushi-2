/**
 * Edge Function: מייל הזמנה למסעדה + עותק ללקוח (Resend).
 *
 * כדי לשלוח לכל כתובת (לא רק לכתובת הבדיקות של חשבון Resend), יש לאמת דומיין
 * ב־https://resend.com/domains ולהגדיר ב־ORDER_NOTIFY_FROM כתובת מאותו דומיין.
 *
 * Secrets (Dashboard → Edge Functions → Secrets, או `supabase secrets set`):
 *   RESEND_API_KEY
 *   ORDER_NOTIFY_FROM
 *   ORDER_NOTIFY_TO
 *
 * פריסה: supabase functions deploy notify-order-email
 *
 * חשוב: ב־Deno (Edge Functions) אסור להשתמש ב־import מ־Next כמו `@/lib/...` — כל הקוד צריך להיות בקובץ זה או בייבוא יחסי `./` מאותה תיקייה.
 */

const RESEND_URL = "https://api.resend.com/emails";

function normalizeOrderEmail(raw: string): string | null {
  const t = raw.trim().toLowerCase();
  if (t.length < 5 || t.length > 254) return null;
  if (/[\r\n<>]/.test(t) || /\s/.test(t)) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return null;
  return t;
}

type OrderLine = {
  name: string;
  quantity: number;
  unitPrice: number;
};

type OrderCustomer = {
  customerName: string;
  phone: string;
  /** מנורמל לשליחת עותק; null = בלי מייל ללקוח */
  customerEmail: string | null;
  fulfillment: "maalot" | "other";
};

function fulfillmentLabelRestaurant(f: OrderCustomer["fulfillment"]): string {
  return f === "maalot" ? "מעלות (משלוח)" : "איסוף עצמי — אחר";
}

function parseCustomer(body: Record<string, unknown>): OrderCustomer | null {
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
  return { customerName, phone, customerEmail, fulfillment: fulfillmentRaw };
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

const priceFmt = new Intl.NumberFormat("he-IL", {
  style: "currency",
  currency: "ILS",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function parseLines(raw: unknown): OrderLine[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  if (raw.length > 100) return null;
  const out: OrderLine[] = [];
  for (const row of raw) {
    if (typeof row !== "object" || row === null) return null;
    const r = row as Record<string, unknown>;
    if (typeof r.name !== "string" || r.name.trim().length === 0 || r.name.length > 220) return null;
    const q = Number(r.quantity);
    const up = Number(r.unitPrice);
    if (!Number.isFinite(q) || q < 1 || q > 999 || !Number.isInteger(q)) return null;
    if (!Number.isFinite(up) || up < 0 || up > 1_000_000) return null;
    out.push({ name: r.name.trim(), quantity: q, unitPrice: roundMoney(up) });
  }
  return out;
}

function orderPlainTextRestaurant(
  lines: OrderLine[],
  total: number,
  itemCount: number,
  customer: OrderCustomer,
  orderCode: string | null,
): string {
  const body = lines
    .map(
      (l) =>
        `${l.name} × ${l.quantity} | יחידה ${priceFmt.format(l.unitPrice)} | סיכום שורה ${priceFmt.format(roundMoney(l.unitPrice * l.quantity))}`,
    )
    .join("\n");
  const header =
    orderCode != null
      ? [`מספר הזמנה: #${orderCode}`, ``]
      : [];
  return [
    ...header,
    `הזמנה חדשה מהתפריט הדיגיטלי — Inna Sushi`,
    ``,
    `פרטי לקוח`,
    `שם: ${customer.customerName}`,
    `טלפון: ${customer.phone}`,
    `מייל: ${customer.customerEmail ?? "לא צוין"}`,
    `סוג: ${fulfillmentLabelRestaurant(customer.fulfillment)}`,
    ``,
    body,
    ``,
    `סה״כ פריטים: ${itemCount}`,
    `סה״כ לתשלום: ${priceFmt.format(total)}`,
  ].join("\n");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function orderHtmlRestaurant(
  lines: OrderLine[],
  total: number,
  itemCount: number,
  customer: OrderCustomer,
  orderCode: string | null,
): string {
  const rows = lines
    .map(
      (l) =>
        `<tr><td style="padding:8px;border-bottom:1px solid #eee">${escapeHtml(l.name)}</td>` +
        `<td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${l.quantity}</td>` +
        `<td style="padding:8px;border-bottom:1px solid #eee">${priceFmt.format(l.unitPrice)}</td>` +
        `<td style="padding:8px;border-bottom:1px solid #eee;text-align:left">${priceFmt.format(roundMoney(l.unitPrice * l.quantity))}</td></tr>`,
    )
    .join("");
  const custBlock =
    `<div style="background:#ecfdf5;border:1px solid #6ee7b7;border-radius:8px;padding:14px;margin-bottom:16px;line-height:1.6">` +
    (orderCode != null
      ? `<div style="margin-bottom:10px;font-size:17px;font-weight:800;color:#065f46">מספר הזמנה: #${escapeHtml(orderCode)}</div>`
      : "") +
    `<strong style="display:block;margin-bottom:8px;color:#065f46">פרטי לקוח</strong>` +
    `<div><strong>שם:</strong> ${escapeHtml(customer.customerName)}</div>` +
    `<div><strong>טלפון:</strong> ${escapeHtml(customer.phone)}</div>` +
    `<div><strong>מייל:</strong> ${escapeHtml(customer.customerEmail ?? "לא צוין")}</div>` +
    `<div><strong>סוג:</strong> ${escapeHtml(fulfillmentLabelRestaurant(customer.fulfillment))}</div>` +
    `</div>`;
  const mainTitle =
    orderCode != null
      ? `הזמנה חדשה — מספר #${escapeHtml(orderCode)} — Inna Sushi`
      : `הזמנה חדשה — Inna Sushi`;
  return `<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="utf-8"></head><body style="font-family:sans-serif;background:#f6f6f6;padding:16px">
<p style="font-size:18px;font-weight:bold">${mainTitle}</p>
${custBlock}
<table style="width:100%;max-width:560px;background:#fff;border-collapse:collapse;margin-top:12px;box-shadow:0 1px 3px rgba(0,0,0,.08)">
<thead><tr style="background:#111;color:#fff">
<th style="padding:8px;text-align:right">פריט</th>
<th style="padding:8px">כמות</th>
<th style="padding:8px">יחידה</th>
<th style="padding:8px;text-align:left">סיכום</th>
</tr></thead>
<tbody>${rows}</tbody>
</table>
<p style="margin-top:16px"><strong>סה״כ פריטים:</strong> ${itemCount}</p>
<p><strong>סה״כ לתשלום:</strong> ${priceFmt.format(total)}</p>
</body></html>`;
}

function parseOrderCode(body: Record<string, unknown>): string | null {
  const raw = body.orderCode ?? body.order_code;
  if (raw == null) return null;
  if (typeof raw !== "string") return null;
  const t = raw.trim().toUpperCase();
  if (t.length < 4 || t.length > 12) return null;
  if (!/^[2-9A-HJ-NP-Z]+$/.test(t)) return null;
  return t;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

/** Resend במצב dev: שליחה רק לכתובת שנרשמת איתה, אלא אם יש דומיין מאומת. */
function resendRestrictsTestRecipients(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("verify a domain") ||
    m.includes("testing emails") ||
    m.includes("only send testing emails") ||
    m.includes("your own email address")
  );
}

async function postResend(
  apiKey: string,
  body: { from: string; to: string[]; subject: string; text: string; html: string },
): Promise<{
  res: Response;
  resJson: { message?: string; id?: string } | null;
}> {
  const res = await fetch(RESEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const resJson = (await res.json().catch(() => null)) as { message?: string; id?: string } | null;
  return { res, resJson };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "גוף בקשה לא תקין" }, 400);
  }

  const body = payload as Record<string, unknown>;
  const lines = parseLines(body.lines);
  if (!lines) {
    return json({ error: "פירוט הזמנה לא תקין" }, 400);
  }

  const customer = parseCustomer(body);
  if (!customer) {
    return json({ error: "פרטי לקוח לא תקינים (שם, טלפון, סוג הזמנה)" }, 400);
  }

  const totalRaw = Number(body.totalShekels);
  if (!Number.isFinite(totalRaw) || totalRaw < 0 || totalRaw > 1_000_000) {
    return json({ error: "סכום לא תקין" }, 400);
  }
  const total = roundMoney(totalRaw);
  const sumLines = roundMoney(lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0));
  if (Math.abs(sumLines - total) > 0.02) {
    return json({ error: "סכום אינו תואם לפריטים" }, 400);
  }

  const orderCode = parseOrderCode(body);
  if (orderCode == null) {
    console.warn("notify-order-email: no orderCode in body (expected orderCode or order_code)", Object.keys(body));
  }

  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("ORDER_NOTIFY_FROM");
  const to = Deno.env.get("ORDER_NOTIFY_TO");

  if (!apiKey || !from || !to) {
    return json(
      {
        error:
          "חסרים Secrets בפרויקט: RESEND_API_KEY, ORDER_NOTIFY_FROM, ORDER_NOTIFY_TO",
        code: "EMAIL_NOT_CONFIGURED",
      },
      503,
    );
  }

  const itemCount = lines.reduce((s, l) => s + l.quantity, 0);
  const subject =
    orderCode != null
      ? `[#${orderCode}] הזמנה חדשה — ${customer.customerName} | ${fulfillmentLabelRestaurant(customer.fulfillment)}`
      : `הזמנה חדשה — ${customer.customerName} | ${fulfillmentLabelRestaurant(customer.fulfillment)}`;
  const text = orderPlainTextRestaurant(lines, total, itemCount, customer, orderCode);
  const html = orderHtmlRestaurant(lines, total, itemCount, customer, orderCode);

  const restaurantTo = to.trim();
  const recipients: string[] = [restaurantTo];
  if (
    customer.customerEmail &&
    restaurantTo.toLowerCase() !== customer.customerEmail.toLowerCase()
  ) {
    recipients.push(customer.customerEmail);
  }

  const mailPayload = {
    from,
    to: recipients,
    subject,
    text,
    html,
  };

  let { res, resJson } = await postResend(apiKey, mailPayload);

  if (
    !res.ok &&
    recipients.length > 1 &&
    resendRestrictsTestRecipients(typeof resJson?.message === "string" ? resJson.message : "")
  ) {
    console.warn("Resend restricted extra recipients; retrying restaurant only", resJson);
    const retry = await postResend(apiKey, { ...mailPayload, to: [restaurantTo] });
    res = retry.res;
    resJson = retry.resJson;
    if (res.ok) {
      return json({
        ok: true,
        id: resJson?.id ?? null,
        code: "CUSTOMER_COPY_SKIPPED_RESEND",
        info:
          "ההזמנה נשלחה למסעדה. עותק ללקוח לא נשלח — בחשבון Resend ללא דומיין מאומת אפשר לשלוח רק לכתובת הבדיקות. אמתו דומיין ב-resend.com/domains והגדירו ORDER_NOTIFY_FROM מכתובת בדומיין.",
      });
    }
  }

  if (!res.ok) {
    console.error("Resend error", res.status, resJson);
    return json(
      {
        error:
          typeof resJson?.message === "string" ? resJson.message : "שליחת המייל נכשלה",
        code: resendRestrictsTestRecipients(typeof resJson?.message === "string" ? resJson.message : "")
          ? "RESEND_DOMAIN_OR_TESTING_REQUIRED"
          : undefined,
      },
      502,
    );
  }

  return json({ ok: true, id: resJson?.id ?? null });
});
