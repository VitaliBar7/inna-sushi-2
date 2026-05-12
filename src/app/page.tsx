import { MenuGrid } from "@/components/menu-grid";
import { PublicMenuHero } from "@/components/public-menu-hero";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SupabaseSetupAlert } from "@/components/supabase-setup-alert";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { fetchMenuItems } from "@/lib/supabase/fetch-menu-items";
import type { MenuItem } from "@/types/menu";

export const dynamic = "force-dynamic";

export default async function Home() {
  const hasSupabase = isSupabaseConfigured();

  let items: MenuItem[] = [];

  if (hasSupabase) {
    const supabase = await createClient();
    items = (await fetchMenuItems(supabase)) ?? [];
  }

  return (
    <div className="flex min-h-dvh min-w-0 flex-col overflow-x-clip">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl min-w-0 flex-1 px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:px-8 md:py-10 md:pb-10">
        {!hasSupabase ? <SupabaseSetupAlert /> : null}
        {hasSupabase ? (
          <>
            <PublicMenuHero />
            <MenuGrid items={items} />
          </>
        ) : null}
      </main>
      <SiteFooter />
    </div>
  );
}
