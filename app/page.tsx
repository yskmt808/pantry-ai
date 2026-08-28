import { createClient } from "@/lib/supabase/server";
import { getItems } from "@/app/actions/items";
import { InventoryDashboard } from "@/components/inventory/inventory-dashboard";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const items = user ? await getItems() : [];

  return (
    <main>
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl text-neutral-900 dark:text-neutral-100">
          パントリー在庫管理
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
          冷蔵庫・冷凍庫・パントリーの食材を一元管理し、消費期限や在庫切れをチェックします。
        </p>
      </div>

      <InventoryDashboard initialItems={items} user={user} />
    </main>
  );
}
