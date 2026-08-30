import { createClient } from "@/lib/supabase/server";
import { getItems, getEffectiveHousehold } from "@/app/actions/items";
import { joinHousehold } from "@/app/actions/household";
import { InventoryDashboard } from "@/components/inventory/inventory-dashboard";

interface HomePageProps {
  searchParams: Promise<{ join?: string }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 招待リンク（?join=<id>）からアクセスされ、Googleログイン済みの場合は自動合流
  if (user && params.join) {
    try {
      await joinHousehold(params.join);
    } catch {
      // ignore
    }
  }

  const { isSharedDevice } = await getEffectiveHousehold(supabase);
  const isAuthenticated = !!user || isSharedDevice;

  const items = isAuthenticated ? await getItems() : [];

  return (
    <main>
      <div className="mb-5 flex flex-col gap-1">
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl text-neutral-900 dark:text-neutral-100">
          パントリー在庫管理
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
          冷蔵庫・冷凍庫・パントリーの食材を一元管理し、消費期限や在庫切れをチェックします。
        </p>
      </div>

      <InventoryDashboard
        initialItems={items}
        user={user}
        isSharedDevice={isSharedDevice}
      />
    </main>
  );
}
