"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Key } from "@heroui/react";
import {
  Alert,
  Button,
  Card,
  Input,
  Label,
  ListBox,
  Modal,
  ScrollShadow,
  Select,
  Surface,
  TextArea,
  TextField,
  toast,
  Tooltip,
  useOverlayState,
} from "@heroui/react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { fetchMenuItems } from "@/lib/supabase/fetch-menu-items";
import {
  clampDiscountPercent,
  effectivePriceAfterDiscount,
  effectivePriceForItem,
  formatDiscountShort,
  hasDiscount,
  normalizeMenuItem,
  roundMoney,
} from "@/lib/menu-price";
import { formSetToDb } from "@/lib/menu-sets";
import { removeMenuImageByUrl, uploadMenuImage } from "@/lib/supabase/menu-storage";
import type { MenuItem } from "@/types/menu";
import { MenuPassByCategory, priceFmtMenu } from "@/components/menu-pass-cards";

const categories: { id: string; label: string }[] = [
  { id: "maki", label: "רולים (כרטיס קטן)" },
  { id: "special", label: "קומבינציות (כרטיס גדול)" },
  { id: "other", label: "אחר" },
];

const PREVIEW_ID = "00000000-0000-0000-0000-000000000001";

type FormState = {
  name: string;
  description: string;
  price: string;
  /** 0 = ללא — מחיר לתשלום = מחיר המחירון */
  discount_percent: string;
  category: string;
  image_url: string;
  /** שורות "סט" — רולים/מוצרים (מציגים בכרטיס) */
  setContents: string[];
};

const emptyForm: FormState = {
  name: "",
  description: "",
  price: "",
  discount_percent: "0",
  category: "maki",
  image_url: "",
  setContents: [],
};

const categoryTableLabel: Record<string, string> = {
  maki: "רולים",
  special: "קומבינציות",
  other: "אחר",
};

function FieldHint({ children }: { children: React.ReactNode }) {
  return (
    <Tooltip>
      <Tooltip.Trigger className="inline align-middle">
        <button
          type="button"
          className="ms-0.5 inline-flex size-[1.1rem] shrink-0 items-center justify-center rounded-full border border-foreground/20 text-[10px] font-bold text-foreground/45 leading-none transition-colors hover:border-foreground/35 hover:text-foreground/80"
        >
          ?
        </button>
      </Tooltip.Trigger>
      <Tooltip.Content
        className="max-w-[min(20rem,85vw)] text-pretty text-sm leading-snug"
        showArrow
      >
        {children}
      </Tooltip.Content>
    </Tooltip>
  );
}

function sortItemsForTable(a: MenuItem, b: MenuItem) {
  const order: Record<string, number> = { maki: 0, other: 1, special: 2 };
  const oa = order[a.category] ?? 9;
  const ob = order[b.category] ?? 9;
  if (oa !== ob) return oa - ob;
  return a.name.localeCompare(b.name, "he");
}

function toPreviewItem(form: FormState): MenuItem {
  const price = Number.parseFloat(form.price);
  const list = Number.isNaN(price) || price < 0 ? 0 : roundMoney(price);
  const rawD = form.discount_percent.trim() === "" ? 0 : Number.parseFloat(form.discount_percent);
  const discount =
    Number.isNaN(rawD) || rawD < 0 || rawD > 100 ? 0 : roundMoney(rawD);
  return {
    id: PREVIEW_ID,
    name: (form.name.trim() || "שם הפריט").slice(0, 120),
    description: form.description.trim() || null,
    price: list,
    discount_percent: discount,
    category: form.category,
    image_url: form.image_url.trim() || null,
    set_contents: formSetToDb(form.setContents),
    created_at: "",
    updated_at: "",
  };
}

export function AdminMenuPanel({ initialItems }: { initialItems: MenuItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState<MenuItem[]>(initialItems);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleteItem, setDeleteItem] = useState<MenuItem | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const supabase = useMemo(() => createClient(), []);

  const deleteModal = useOverlayState({
    isOpen: deleteItem !== null,
    onOpenChange: (open) => {
      if (!open) {
        setDeleteItem(null);
      }
    },
  });

  const resetFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const channel = supabase
      .channel("admin-menu-items")
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

  function startEdit(item: MenuItem) {
    setEditorOpen(true);
    resetFileInput();
    setEditingId(item.id);
    setForm({
      name: item.name,
      description: item.description ?? "",
      price: String(item.price),
      discount_percent: String(item.discount_percent ?? 0),
      category: item.category,
      image_url: item.image_url ?? "",
      setContents: item.set_contents?.length ? [...item.set_contents] : [],
    });
    if (typeof document !== "undefined") {
      requestAnimationFrame(() => {
        document.getElementById("admin-menu-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }

  function clearEdit() {
    setEditingId(null);
    setForm(emptyForm);
    resetFileInput();
    setEditorOpen(false);
  }

  async function handleImageFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.danger("נדרשת התחברות מחדש", { description: "התחברו שוב וניסו שוב." });
      return;
    }
    setUploading(true);
    try {
      const url = await uploadMenuImage(supabase, file, user.id);
      setForm((f) => ({ ...f, image_url: url }));
      toast.success("התמונה הועלתה", {
        description: "הקישור בטופס. לשמור את הכרטיס — «שמירה» / «הוספה».",
      });
    } catch (err) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: string }).message)
          : "ההעלאה נכשלה. ודא ש־supabase/storage.sql הורץ בדאשבורד.";
      toast.danger("ההעלאה נכשלה", { description: msg });
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const price = Number.parseFloat(form.price);
    if (!form.name.trim() || Number.isNaN(price) || price < 0) {
      toast.warning("בדקו את הטופס", { description: "מלאו שם פריט ומחיר חוקי (0 ומעלה)." });
      return;
    }
    const rawD = form.discount_percent.trim() === "" ? 0 : Number.parseFloat(form.discount_percent);
    if (Number.isNaN(rawD) || rawD < 0 || rawD > 100) {
      toast.warning("הנחה", { description: "0–100 בלבד." });
      return;
    }
    const discount_percent = roundMoney(rawD);
    setSaving(true);

    const set_contents = formSetToDb(form.setContents);
    const row = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price,
      discount_percent,
      category: form.category,
      image_url: form.image_url.trim() || null,
      set_contents: set_contents ?? [],
    };

    if (editingId) {
      const { data, error } = await supabase
        .from("menu_items")
        .update(row)
        .eq("id", editingId)
        .select()
        .single();
      setSaving(false);
      if (error) {
        toast.danger("השמירה נכשלה", { description: error.message });
        return;
      }
      if (data) {
        setItems((prev) => prev.map((x) => (x.id === editingId ? normalizeMenuItem(data as MenuItem) : x)));
        toast.success("הכרטיס עודכן");
        setForm(emptyForm);
        setEditingId(null);
        setEditorOpen(false);
        resetFileInput();
        router.refresh();
      }
    } else {
      const { data, error } = await supabase
        .from("menu_items")
        .insert(row)
        .select()
        .single();
      setSaving(false);
      if (error) {
        toast.danger("ההוספה נכשלה", { description: error.message });
        return;
      }
      if (data) {
        setItems((prev) => [normalizeMenuItem(data as MenuItem), ...prev]);
        toast.success("כרטיס חדש נוסף");
        setForm(emptyForm);
        setEditorOpen(false);
        resetFileInput();
        router.refresh();
      }
    }
  }

  async function runDeleteById(id: string) {
    setDeleting(id);
    const target = items.find((x) => x.id === id);
    const { error } = await supabase.from("menu_items").delete().eq("id", id);
    if (error) {
      setDeleting(null);
      toast.danger("לא ניתן היה למחוק את הכרטיס", {
        description: error.message,
      });
      return;
    }
    if (target?.image_url) {
      const { error: storageError } = await removeMenuImageByUrl(supabase, target.image_url);
      if (storageError) {
        toast.warning("הכרטיס נמחק", {
          description: `קובץ התמונה ב-Storage לא הוסר: ${storageError.message}`,
        });
      } else {
        toast.success("הכרטיס נמחק", {
          description: "קובץ התמונה הוסר מהאחסון.",
        });
      }
    } else {
      toast.success("הכרטיס נמחק");
    }
    setDeleting(null);
    setItems((prev) => prev.filter((x) => x.id !== id));
    if (editingId === id) {
      clearEdit();
    }
    router.refresh();
  }

  async function confirmDeleteFromModal() {
    if (!deleteItem) {
      return;
    }
    const id = deleteItem.id;
    try {
      await runDeleteById(id);
    } finally {
      setDeleteItem(null);
    }
  }

  const previewItem = toPreviewItem(form);
  const previewKey = useMemo(
    () =>
      [
        form.name,
        form.description,
        form.price,
        form.discount_percent,
        form.category,
        form.image_url,
        JSON.stringify(form.setContents),
      ].join("\u001e"),
    [
      form.name,
      form.description,
      form.price,
      form.discount_percent,
      form.category,
      form.image_url,
      form.setContents,
    ],
  );
  const tableRows = useMemo(() => [...items].sort(sortItemsForTable), [items]);

  return (
    <div className="space-y-10">
      <Modal.Root state={deleteModal}>
        <Modal.Trigger className="sr-only">
          <span>נקודת עוגן לדיאלוג</span>
        </Modal.Trigger>
        <Modal.Backdrop isDismissable>
          <Modal.Container
            placement="center"
            size="sm"
          >
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Icon />
                <Modal.Heading>למחוק כרטיס?</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                {deleteItem ? (
                  <p className="text-foreground/85">
                    הפריט «{deleteItem.name}» יימחק. לא ניתן לשחזר.
                  </p>
                ) : null}
              </Modal.Body>
              <Modal.Footer className="flex flex-wrap items-center justify-end gap-2">
                <Button
                  variant="tertiary"
                  onPress={() => setDeleteItem(null)}
                >
                  ביטול
                </Button>
                <Button
                  variant="primary"
                  isPending={deleteItem != null && deleting === deleteItem.id}
                  onPress={() => void confirmDeleteFromModal()}
                >
                  מחק
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal.Root>

      <h1 className="text-2xl font-bold text-[color:var(--color-accent-display)] sm:text-3xl">דאשבורד ניהול</h1>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        id="admin-menu-image-file"
        aria-label="העלאת תמונה"
        onChange={handleImageFileChange}
      />

      <div className="space-y-2">
        <Button
          type="button"
          fullWidth
          variant="secondary"
          className="h-auto min-h-12 items-center justify-between gap-2 px-4 py-3 text-start"
          onPress={() => setEditorOpen((o) => !o)}
        >
          <span className="text-base font-medium text-foreground">
            {editingId ? "עריכת כרטיס · תצוגה מקדימה" : "כרטיס חדש · תצוגה מקדימה"}
          </span>
          <span
            className="shrink-0 text-foreground/60 transition-transform"
            aria-hidden
            style={{ transform: editorOpen ? "rotate(180deg)" : undefined }}
          >
            ▾
          </span>
        </Button>
        {editorOpen ? (
          <div
            className="grid gap-8 lg:grid-cols-2 lg:items-start"
            id="admin-menu-form"
          >
        <Card
          variant="secondary"
          className="overflow-hidden border border-white/10 shadow-[0_4px_32px_rgba(0,0,0,0.35)]"
        >
          <Card.Header className="gap-0.5 border-b border-white/5 px-4 pb-4 pt-4 md:px-6 md:pt-6">
            <Card.Title className="text-lg font-semibold text-foreground">
              {editingId ? "עריכת כרטיס" : "כרטיס חדש"}
            </Card.Title>
            <Card.Description className="text-foreground/45">
              {editingId ? "נשמר אוטומטית לאתר." : "תצוגה מקדימה · עמודה ימנית."}
            </Card.Description>
          </Card.Header>
          <Card.Content className="px-4 pb-4 md:px-6 md:pb-6">
          <form
            onSubmit={handleSubmit}
            className="grid gap-3"
          >
            {editingId ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="tertiary"
                  size="sm"
                  onPress={clearEdit}
                >
                  ביטול עריכה
                </Button>
              </div>
            ) : null}
            <TextField
              isRequired
              className="md:col-span-2"
            >
              <Label>שם הפריט</Label>
              <Input
                variant="secondary"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="למשל: רול מלפפון"
                autoComplete="off"
              />
            </TextField>
            <TextField>
              <Label>תיאור</Label>
              <TextArea
                rows={2}
                variant="secondary"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="רכיבים, הערות…"
              />
            </TextField>
            <div className="space-y-2">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <span className="inline-flex items-center">
                  <Label>פריטי סט</Label>
                  <FieldHint>רשימה לכרטיס «סט»: מה נכלל במחיר. עד 30 שורות. המחיר בטופס = לסט שלם.</FieldHint>
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onPress={() =>
                    setForm((f) => ({
                      ...f,
                      setContents: f.setContents.length < 30 ? [...f.setContents, ""] : f.setContents,
                    }))
                  }
                >
                  + שורה
                </Button>
              </div>
              {form.setContents.length === 0 ? null : (
                <ul className="space-y-2">
                  {form.setContents.map((line, i) => (
                    <li
                      key={i}
                      className="flex gap-2"
                    >
                      <TextField className="min-w-0 flex-1">
                        <Label className="sr-only">פריט {i + 1} בדופן</Label>
                        <Input
                          variant="secondary"
                          value={line}
                          onChange={(e) => {
                            const v = e.target.value;
                            setForm((f) => {
                              const next = [...f.setContents];
                              next[i] = v;
                              return { ...f, setContents: next };
                            });
                          }}
                          placeholder="למשל: רול פילדלפיה, 6 יח' ניגירי סלמון…"
                        />
                      </TextField>
                      <Button
                        type="button"
                        variant="tertiary"
                        size="sm"
                        className="shrink-0 self-end"
                        onPress={() =>
                          setForm((f) => ({
                            ...f,
                            setContents: f.setContents.filter((_, j) => j !== i),
                          }))
                        }
                      >
                        הסר
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <TextField isRequired>
              <span className="inline-flex items-center">
                <Label>מחיר (₪)</Label>
                <FieldHint>מחיר מחירון לפני הנחה. על כרטיס הלקוח מוצג המחיר לתשלום (אחרי הנחה אם הוגדרה).</FieldHint>
              </span>
              <Input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                variant="secondary"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                placeholder="0.00"
              />
            </TextField>
            <TextField>
              <span className="inline-flex items-center">
                <Label>הנחה %</Label>
                <FieldHint>0 = בלי. המחיר ללקוח = מחיר מחירון אחרי הנחה. עד 100%.</FieldHint>
              </span>
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                max={100}
                step="0.01"
                variant="secondary"
                value={form.discount_percent}
                onChange={(e) => setForm((f) => ({ ...f, discount_percent: e.target.value }))}
                placeholder="0"
              />
            </TextField>
            <Surface
              variant="default"
              className="rounded-lg border border-white/10 px-3 py-2 text-sm"
            >
              {(() => {
                const p = Number.parseFloat(form.price);
                const listOk = !Number.isNaN(p) && p >= 0;
                if (!listOk) {
                  return <p className="text-foreground/45">מחיר → לתשלום: הזינו מחיר</p>;
                }
                const dRaw = form.discount_percent.trim() === "" ? 0 : Number.parseFloat(form.discount_percent);
                const d =
                  Number.isNaN(dRaw) || dRaw < 0 || dRaw > 100 ? 0 : clampDiscountPercent(dRaw);
                const eff = effectivePriceAfterDiscount(p, d);
                if (d <= 0) {
                  return (
                    <p className="text-foreground/90">
                      <span className="text-foreground/45">לתשלום: </span>
                      <strong className="text-[color:var(--color-accent-display)]">{priceFmtMenu.format(eff)}</strong>
                    </p>
                  );
                }
                return (
                  <p className="text-foreground/90">
                    <span className="line-through opacity-75">{priceFmtMenu.format(p)}</span>
                    <span className="mx-1.5 text-foreground/30">→</span>
                    <strong className="text-[color:var(--color-accent-display)]">{priceFmtMenu.format(eff)}</strong>
                    <span className="ms-1 text-foreground/45">({formatDiscountShort(d)})</span>
                  </p>
                );
              })()}
            </Surface>
            <Select
              className="w-full"
              value={form.category as Key}
              onChange={(key) => setForm((f) => ({ ...f, category: key != null ? String(key) : "maki" }))}
              placeholder="בחרו סוג כרטיס"
            >
              <Label>סוג כרטיס</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {categories.map((c) => (
                    <ListBox.Item
                      key={c.id}
                      id={c.id}
                      textValue={c.label}
                    >
                      {c.label}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
            <div className="space-y-2">
              <span className="inline-flex items-center">
                <Label>תמונה</Label>
                <FieldHint>העלאה ל-Storage (עד 10MB, JPEG/PNG/WebP/GIF). או URL למטה. שמירה = רישום בכרטיס.</FieldHint>
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  isPending={uploading}
                  onPress={() => fileInputRef.current?.click()}
                >
                  {uploading ? "מעלה…" : "העלאה מהמחשב"}
                </Button>
                {form.image_url ? (
                  <Button
                    type="button"
                    variant="tertiary"
                    size="sm"
                    onPress={() => {
                      setForm((f) => ({ ...f, image_url: "" }));
                      toast.info("התמונה הוסרה מהטופס");
                    }}
                  >
                    הסר תמונה
                  </Button>
                ) : null}
              </div>
              {form.image_url ? (
                <Surface
                  variant="default"
                  className="mt-1 flex items-start gap-2 rounded-lg border border-white/10 p-1.5"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- dynamic user/storage URL */}
                  <img
                    src={form.image_url}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded-md object-cover"
                  />
                  <p className="line-clamp-2 min-w-0 break-all text-[10px] text-foreground/50">{form.image_url}</p>
                </Surface>
              ) : null}
            </div>
            <TextField>
              <Label>קישור לתמונה (URL)</Label>
              <Input
                type="url"
                variant="secondary"
                value={form.image_url}
                onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
                placeholder="https://…"
              />
            </TextField>
            <div>
              <Button
                type="submit"
                variant="primary"
                isPending={saving || uploading}
              >
                {editingId ? "שמירה" : "הוסף כרטיס לתפריט"}
              </Button>
            </div>
          </form>
          </Card.Content>
        </Card>

        <div className="space-y-2 lg:sticky lg:top-4">
          <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-foreground/45">תצוגה מקדימה</h2>
          <Surface
            variant="transparent"
            className="rounded-2xl border border-dashed border-white/20 p-3"
            aria-live="polite"
          >
            <MenuPassByCategory
              key={previewKey}
              item={previewItem}
            />
          </Surface>
        </div>
      </div>
        ) : null}
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">הכרטיסים בחנות</h2>

        {items.length === 0 ? (
          <Alert
            status="accent"
            className="border-dashed"
          >
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>אין עדיין כרטיסים</Alert.Title>
              <Alert.Description>
                פתחו למעלה «כרטיס חדש · תצוגה מקדימה» והוסיפו כרטיס.
              </Alert.Description>
            </Alert.Content>
          </Alert>
        ) : (
          <Card className="overflow-hidden p-0">
            <ScrollShadow
              hideScrollBar
              orientation="horizontal"
              className="w-full touch-pan-x"
            >
            <table className="w-full min-w-[32rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/10 text-foreground/50">
                  <th className="px-3 py-2.5 text-start font-medium">שם</th>
                  <th className="hidden max-w-[12rem] px-2 py-2.5 text-start font-medium sm:table-cell">תיאור</th>
                  <th className="whitespace-nowrap px-2 py-2.5 text-start font-medium">קטגוריה</th>
                  <th className="w-10 whitespace-nowrap px-1 py-2.5 text-center text-xs font-medium">בסט</th>
                  <th className="whitespace-nowrap px-2 py-2.5 text-start font-medium">מחיר</th>
                  <th className="hidden whitespace-nowrap px-2 py-2.5 text-start font-medium md:table-cell">עודכן</th>
                  <th className="px-2 py-2.5 text-end font-medium">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-white/5 transition-colors last:border-0 hover:bg-white/[0.03]"
                  >
                    <td className="max-w-[10rem] px-3 py-2.5 font-medium text-foreground">
                      {item.name}
                    </td>
                    <td className="hidden max-w-[12rem] px-2 py-2.5 text-foreground/65 sm:table-cell">
                      {item.description ? (
                        <span className="line-clamp-2">{item.description}</span>
                      ) : (
                        <span className="text-foreground/30">—</span>
                      )}
                    </td>
                    <td className="px-2 py-2.5 text-foreground/80">
                      {categoryTableLabel[item.category] ?? item.category}
                    </td>
                    <td className="w-10 px-1 py-2.5 text-center text-xs text-foreground/70">
                      {item.set_contents?.length ? item.set_contents.length : "—"}
                    </td>
                    <td className="min-w-[4.5rem] px-2 py-2.5 text-start tabular-nums text-foreground/90">
                      {hasDiscount(item.discount_percent) ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-foreground/45 line-through">{priceFmtMenu.format(item.price)}</span>
                          <span className="font-medium text-foreground">
                            {priceFmtMenu.format(effectivePriceForItem(item))}
                          </span>
                          <span className="text-[10px] text-foreground/50">
                            −{formatDiscountShort(item.discount_percent)}
                          </span>
                        </div>
                      ) : (
                        priceFmtMenu.format(item.price)
                      )}
                    </td>
                    <td className="hidden whitespace-nowrap px-2 py-2.5 text-foreground/50 md:table-cell">
                      {item.updated_at
                        ? new Date(item.updated_at).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" })
                        : "—"}
                    </td>
                    <td className="px-2 py-2.5 text-end">
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        <Button
                          variant="secondary"
                          size="sm"
                          onPress={() => startEdit(item)}
                        >
                          ערוך
                        </Button>
                        <Button
                          variant="tertiary"
                          size="sm"
                          isPending={deleting === item.id}
                          onPress={() => setDeleteItem(item)}
                        >
                          מחיקה
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </ScrollShadow>
          </Card>
        )}
      </section>
    </div>
  );
}
