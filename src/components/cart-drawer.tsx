"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Drawer,
  Separator,
  toast,
  TextField,
  Label,
  Input,
  Modal,
  useOverlayState,
  cn,
} from "@heroui/react";
import { useCart } from "@/context/cart-context";
import { priceFmtMenu } from "@/components/menu-pass-cards";
import { roundMoney } from "@/lib/menu-price";
import type { OrderFulfillment } from "@/lib/order-format";

export function CartDrawer() {
  const {
    lines,
    itemCount,
    totalShekels,
    removeLine,
    setLineQuantity,
    clearCart,
    isOpen,
    setCartOpen,
  } = useCart();

  const [sendingMail, setSendingMail] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [fulfillment, setFulfillment] = useState<OrderFulfillment>("maalot");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [cartPlacement, setCartPlacement] = useState<"bottom" | "right">("right");
  /* Honeypot — שדה מוסתר; בני אדם לא ימלאו, בוטים בד״כ כן ויסומנו בשרת */
  const [honeypot, setHoneypot] = useState("");

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const sync = () => setCartPlacement(mq.matches ? "bottom" : "right");
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const detailsModal = useOverlayState({
    isOpen: detailsOpen,
    onOpenChange: (open) => setDetailsOpen(open),
  });

  useEffect(() => {
    if (!isOpen) setDetailsOpen(false);
  }, [isOpen]);

  async function submitOrder() {
    if (lines.length === 0) return;
    const nameT = customerName.trim();
    if (nameT.length < 2) {
      toast.info("נא למלא שם");
      return;
    }
    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length < 9 || phone.trim().length > 30) {
      toast.info("נא למלא מספר טלפון תקין");
      return;
    }
    setSendingMail(true);
    try {
      const res = await fetch("/api/notify-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          customerName: nameT,
          phone: phone.trim(),
          fulfillment,
          _company: honeypot,
          lines: lines.map((l) => ({
            name: l.name,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
          })),
          totalShekels: roundMoney(totalShekels),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
        orderCode?: string;
      };
      if (res.ok) {
        toast.success(
          typeof data.orderCode === "string" && data.orderCode.length > 0
            ? `ההזמנה נשלחה · מספר ${data.orderCode}`
            : "ההזמנה נשלחה למסעדה",
        );
        setCustomerName("");
        setPhone("");
        setFulfillment("maalot");
        setDetailsOpen(false);
        clearCart();
        setCartOpen(false);
      } else if (typeof data.orderCode === "string" && data.orderCode.length > 0) {
        toast.warning("ההזמנה נרשמה במערכת", {
          description:
            `מספר הזמנה: ${data.orderCode}. ` +
            (typeof data.error === "string" ? data.error : "ייתכן שהמייל לא נשלח — בדקו עם המסעדה."),
        });
        setCustomerName("");
        setPhone("");
        setFulfillment("maalot");
        setDetailsOpen(false);
        clearCart();
        setCartOpen(false);
      } else if (data.code === "EMAIL_NOT_CONFIGURED") {
        toast.info("מייל למסעדה לא הוגדר — בדקו Secrets ב-Supabase (מייל + Resend)");
      } else if (data.code === "SUPABASE_FN_NOT_CONFIGURED") {
        toast.info("חסרים Supabase URL או SUPABASE_SERVICE_ROLE_KEY בשרת");
      } else if (data.code === "RESEND_DOMAIN_OR_TESTING_REQUIRED") {
        toast.info("שליחת מייל לכל הנמענים דורשת דומיין מאומת ב-Resend", {
          description:
            typeof data.error === "string" ? data.error : "https://resend.com/domains",
        });
      } else if (data.code === "EDGE_FUNCTION_NOT_FOUND") {
        toast.info(
          "יש לפרוס את notify-order-email ב-Supabase (supabase functions deploy notify-order-email)",
        );
      } else {
        toast.danger(
          typeof data.error === "string" ? data.error : "שליחת המייל נכשלה",
        );
      }
    } catch {
      toast.danger("שגיאת רשת בשליחת המייל");
    } finally {
      setSendingMail(false);
    }
  }

  return (
    <>
      <Drawer.Backdrop
        isOpen={isOpen}
        onOpenChange={setCartOpen}
        variant="blur"
      >
        <Drawer.Content placement={cartPlacement}>
        <Drawer.Dialog
          className={cn(
            "border border-white/10 bg-zinc-950/98",
            cartPlacement === "bottom" &&
              "mx-0 w-full max-w-none rounded-none rounded-t-2xl border-x-0 border-b-0 max-h-[min(92dvh,100dvh)]",
          )}
        >
          <Drawer.Header className="flex w-full flex-row items-center justify-between gap-3 border-b border-white/10 px-4 pb-3 pt-4 max-[639px]:pt-[max(1rem,env(safe-area-inset-top))]">
            <Drawer.Heading className="min-w-0 flex-1 text-start text-lg font-semibold text-white">
              עגלת קניות
            </Drawer.Heading>
            <Drawer.CloseTrigger className="shrink-0" />
          </Drawer.Header>
          <Drawer.Body
            className={cn(
              "flex flex-col gap-3",
              cartPlacement === "bottom"
                ? "max-h-[min(58dvh,26rem)] overflow-y-auto overflow-x-hidden [-webkit-overflow-scrolling:touch] sm:max-h-[min(70dvh,32rem)]"
                : "max-h-[85dvh] overflow-y-auto overflow-x-hidden [-webkit-overflow-scrolling:touch]",
            )}
          >
            {lines.length === 0 ? (
              <p className="text-center text-sm text-foreground/60">העגלה ריקה — הוסיפו פריטים מהתפריט.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {lines.map((line) => (
                  <li
                    key={line.menuItemId}
                    className="rounded-xl border border-white/10 bg-white/[0.04] p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-white">{line.name}</p>
                        <p className="mt-0.5 text-xs text-foreground/55">
                          יחידה: {priceFmtMenu.format(line.unitPrice)}
                        </p>
                      </div>
                      <Button
                        variant="tertiary"
                        size="sm"
                        className="shrink-0 text-foreground/70"
                        onPress={() => removeLine(line.menuItemId)}
                      >
                        הסר
                      </Button>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="tertiary"
                          size="sm"
                          className="min-w-9 px-0"
                          onPress={() =>
                            setLineQuantity(line.menuItemId, line.quantity - 1)
                          }
                          aria-label="הפחת כמות"
                        >
                          −
                        </Button>
                        <span className="min-w-8 text-center tabular-nums text-sm font-semibold text-white">
                          {line.quantity}
                        </span>
                        <Button
                          variant="tertiary"
                          size="sm"
                          className="min-w-9 px-0"
                          onPress={() =>
                            setLineQuantity(line.menuItemId, line.quantity + 1)
                          }
                          aria-label="הוסף כמות"
                        >
                          +
                        </Button>
                      </div>
                      <span className="font-semibold tabular-nums text-[color:var(--color-accent-display)]">
                        {priceFmtMenu.format(roundMoney(line.unitPrice * line.quantity))}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Drawer.Body>
          {lines.length > 0 ? (
            <Drawer.Footer className="flex flex-col gap-3 border-t border-white/10 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground/70">סה״כ ({itemCount} פריטים)</span>
                <span className="text-lg font-bold tabular-nums text-white">
                  {priceFmtMenu.format(totalShekels)}
                </span>
              </div>
              <Separator className="bg-white/10" />
              <Button
                variant="primary"
                className="w-full"
                onPress={() => setDetailsOpen(true)}
              >
                שליחת הזמנה
              </Button>
              <Button
                variant="tertiary"
                className="w-full"
                onPress={() => {
                  clearCart();
                  toast.info("העגלה רוקנה");
                }}
              >
                רוקן עגלה
              </Button>
            </Drawer.Footer>
          ) : null}
        </Drawer.Dialog>
      </Drawer.Content>
    </Drawer.Backdrop>

      <Modal.Root state={detailsModal}>
        <Modal.Trigger className="sr-only">
          <span>פרטי שליחה</span>
        </Modal.Trigger>
        <Modal.Backdrop isDismissable>
          <Modal.Container placement="center" className="px-4" size="md">
            <Modal.Dialog className="border border-white/10 bg-zinc-950 text-start shadow-2xl">
              <Modal.Header className="border-b border-white/10">
                <Modal.Icon />
                <Modal.Heading className="text-white">
                  פרטים לשליחת ההזמנה
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body className="flex flex-col gap-3 pt-4">
                <div
                  aria-hidden
                  className="pointer-events-none absolute -left-[9999px] top-0 h-0 w-0 overflow-hidden opacity-0"
                >
                  <label htmlFor="cart-hp-company">Company</label>
                  <input
                    id="cart-hp-company"
                    type="text"
                    name="company"
                    tabIndex={-1}
                    autoComplete="off"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                  />
                </div>
                <TextField isRequired className="w-full">
                  <Label>שם מלא</Label>
                  <Input
                    variant="secondary"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    autoComplete="name"
                  />
                </TextField>
                <TextField isRequired className="w-full">
                  <Label>טלפון</Label>
                  <Input
                    variant="secondary"
                    type="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    autoComplete="tel"
                  />
                </TextField>
                <div className="space-y-2">
                  <Label className="text-foreground/90">אזור / סוג הזמנה</Label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant={fulfillment === "maalot" ? "primary" : "tertiary"}
                      size="sm"
                      className="min-h-10 flex-1"
                      onPress={() => setFulfillment("maalot")}
                    >
                      מעלות
                    </Button>
                    <Button
                      type="button"
                      variant={fulfillment === "other" ? "primary" : "tertiary"}
                      size="sm"
                      className="min-h-10 flex-1"
                      onPress={() => setFulfillment("other")}
                    >
                      אחר
                    </Button>
                  </div>
                  {fulfillment === "other" ? (
                    <p className="rounded-lg border border-white/10 bg-white/4 px-3 py-2 text-xs leading-relaxed text-foreground/70">
                      איסוף עצמי מהמסעדה — ההזמנה לא כוללת משלוח; נא לאסוף מול המסעדה לפי תיאום.
                    </p>
                  ) : null}
                </div>
              </Modal.Body>
              <Modal.Footer className="flex flex-col gap-2 border-t border-white/10 sm:flex-row sm:justify-end">
                <Button
                  variant="tertiary"
                  className="w-full sm:w-auto"
                  onPress={() => setDetailsOpen(false)}
                >
                  ביטול
                </Button>
                <Button
                  variant="primary"
                  className="w-full sm:min-w-36"
                  isDisabled={sendingMail}
                  onPress={() => void submitOrder()}
                >
                  {sendingMail ? "שולח…" : "אישור שליחה"}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal.Root>
    </>
  );
}
