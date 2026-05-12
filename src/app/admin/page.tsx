import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { AdminDashboard } from "@/components/admin-dashboard";
import { SiteHeader } from "@/components/site-header";
import { normalizeMenuItems } from "@/lib/menu-price";
import type { MenuItem } from "@/types/menu";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="p-6 text-foreground/80">
        חסרים משתני סביבה של Supabase. הוסיף <code className="text-[color:var(--color-accent-display)]">.env.local</code>.
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const { data } = await supabase
    .from("menu_items")
    .select("*")
    .order("created_at", { ascending: false });

  const items = normalizeMenuItems((data as MenuItem[] | null) ?? []);

  const { count: newOrdersHead, error: newOrdersCountError } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("status", "new");

  const initialNewOrdersCount =
    !newOrdersCountError && typeof newOrdersHead === "number" ? newOrdersHead : 0;

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader showLogout />
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:px-8 md:py-8 md:pb-10">
        <AdminDashboard initialItems={items} initialNewOrdersCount={initialNewOrdersCount} />
      </div>
    </div>
  );
}
