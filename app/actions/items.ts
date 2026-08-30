"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import type { Database, LocationType, ChannelType } from "@/lib/supabase/types";
import { sortBatchesForConsumption } from "@/lib/utils/batch-sorter";

export type ItemBatch = Database["public"]["Tables"]["item_batches"]["Row"];
export type ItemChannel = Database["public"]["Tables"]["item_procurement_channels"]["Row"];

export type ItemWithDetails = Database["public"]["Tables"]["items"]["Row"] & {
  item_procurement_channels?: ItemChannel[];
  item_batches?: ItemBatch[];
};

export type ItemInput = {
  name: string;
  category?: string;
  location: LocationType;
  unit: string;
  min_quantity?: number;
  consumption_step?: number;
  package_quantity?: number;
  track_expiry?: boolean;
  track_opened?: boolean;
  opened_shelf_life_days?: number | null;
  memo?: string | null;
  channel?: {
    channel_type: ChannelType;
    provider_name: string;
    url?: string | null;
    unit_price?: number | null;
  };
};

export type BatchInput = {
  quantity: number;
  expiry_date?: string | null;
  opened_at?: string | null;
  purchased_at?: string | null;
};

export type BatchProcessReason = "consumption" | "waste" | "correction";

/**
 * ログインユーザーまたは共有端末クッキーから世帯IDを取得
 */
export async function getEffectiveHousehold(supabaseClient?: Awaited<ReturnType<typeof createClient>>): Promise<{
  householdId: string | null;
  userId: string | null;
  isSharedDevice: boolean;
}> {
  const supabase = supabaseClient || (await createClient());

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const admin = createAdminClient();
      const { data: userProfile } = await admin
        .from("users")
        .select("household_id")
        .eq("id", user.id)
        .maybeSingle();

      const profile = userProfile as unknown as { household_id: string | null } | null;
      if (profile?.household_id) {
        return {
          householdId: profile.household_id,
          userId: user.id,
          isSharedDevice: false,
        };
      }
    }
  } catch {
    // auth.getUser failed or test environment
  }

  // 共有端末セッションクッキーの確認
  try {
    const cookieStore = await cookies();
    const isShared = cookieStore.get("pantry_shared_device")?.value === "true";
    const sharedHouseholdId = cookieStore.get("pantry_household_id")?.value;

    if (isShared && sharedHouseholdId) {
      return {
        householdId: sharedHouseholdId,
        userId: null,
        isSharedDevice: true,
      };
    }
  } catch {
    // cookies() unavailable in tests
  }

  return { householdId: null, userId: null, isSharedDevice: false };
}

/**
 * 在庫アイテム一覧（ロットと調達先を含む）の取得
 */
export async function getItems(location?: LocationType): Promise<ItemWithDetails[]> {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    const { householdId } = await getEffectiveHousehold(supabase);

    if (!householdId) {
      return [];
    }

    let query = admin
      .from("items")
      .select("*, item_procurement_channels(*), item_batches(*)")
      .eq("household_id", householdId)
      .order("created_at", { ascending: false });

    if (location) {
      query = query.eq("location", location);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching items:", error);
      return [];
    }

    const items = (data as unknown as ItemWithDetails[]) || [];

    // 各アイテムの item_batches を優先消費順にソート
    items.forEach((item) => {
      if (item.item_batches && item.item_batches.length > 0) {
        item.item_batches = sortBatchesForConsumption(item.item_batches, item.track_expiry);
      }
    });

    return items;
  } catch (err) {
    console.error("Failed to get items:", err);
    return [];
  }
}

/**
 * アイテム（品目マスタ）の新規作成
 */
export async function createItem(input: ItemInput) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { householdId } = await getEffectiveHousehold(supabase);

  if (!householdId) {
    throw new Error("ログインまたは共有端末の連携が必要です");
  }

  const itemPayload: Database["public"]["Tables"]["items"]["Insert"] = {
    household_id: householdId,
    name: input.name,
    category: input.category || "食品",
    location: input.location,
    current_quantity: 0,
    unit: input.unit,
    min_quantity: input.min_quantity ?? 0,
    consumption_step: input.consumption_step ?? 1,
    package_quantity: input.package_quantity ?? 1,
    track_expiry: input.track_expiry ?? true,
    track_opened: input.track_opened ?? false,
    opened_shelf_life_days: input.opened_shelf_life_days ?? null,
    expiry_date: null,
    memo: input.memo || null,
  };

  const { data: itemData, error: itemError } = await admin
    .from("items")
    .insert([itemPayload] as unknown as never)
    .select()
    .single();

  if (itemError || !itemData) {
    throw new Error(`アイテム作成エラー: ${itemError?.message}`);
  }

  const createdItem = itemData as unknown as Database["public"]["Tables"]["items"]["Row"];

  let createdChannel: ItemChannel | null = null;
  if (input.channel && input.channel.provider_name) {
    const channelPayload: Database["public"]["Tables"]["item_procurement_channels"]["Insert"] = {
      item_id: createdItem.id,
      channel_type: input.channel.channel_type,
      provider_name: input.channel.provider_name,
      url: input.channel.url || null,
      unit_price: input.channel.unit_price || null,
      is_default: true,
    };
    const { data: cData } = await admin
      .from("item_procurement_channels")
      .insert([channelPayload] as unknown as never)
      .select()
      .single();
    createdChannel = cData as unknown as ItemChannel;
  }

  const fullItem: ItemWithDetails = {
    ...createdItem,
    item_batches: [],
    item_procurement_channels: createdChannel ? [createdChannel] : [],
  };

  revalidatePath("/");
  return { success: true, item: fullItem };
}

/**
 * 買い足し / 在庫ロットの追加
 */
export async function addBatch(itemId: string, input: BatchInput) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { householdId, userId } = await getEffectiveHousehold(supabase);

  if (!householdId) {
    throw new Error("ログインまたは共有端末の連携が必要です");
  }

  const { data: itemData, error: itemError } = await admin
    .from("items")
    .select("*, item_batches(*)")
    .eq("id", itemId)
    .eq("household_id", householdId)
    .single();

  if (itemError || !itemData) {
    throw new Error("アイテムが見つかりません");
  }

  const item = itemData as unknown as ItemWithDetails;

  const batchPayload: Database["public"]["Tables"]["item_batches"]["Insert"] = {
    item_id: itemId,
    quantity: input.quantity,
    expiry_date: item.track_expiry ? input.expiry_date || null : null,
    opened_at: input.opened_at || null,
    purchased_at: input.purchased_at || new Date().toISOString().split("T")[0],
  };

  const { data: newBatchData, error: batchError } = await admin
    .from("item_batches")
    .insert([batchPayload] as unknown as never)
    .select()
    .single();

  if (batchError || !newBatchData) {
    throw new Error(`ロット追加エラー: ${batchError?.message}`);
  }

  const newBatch = newBatchData as unknown as ItemBatch;
  const newTotal = Number((Number(item.current_quantity) + input.quantity).toFixed(2));

  let earliestExpiry: string | null = null;
  if (item.track_expiry) {
    const allBatches = [...(item.item_batches || []), newBatch];
    const sortedExpiries = allBatches
      .map((b) => b.expiry_date)
      .filter(Boolean)
      .sort() as string[];
    earliestExpiry = sortedExpiries[0] || null;
  }

  await admin
    .from("items")
    .update({
      current_quantity: newTotal,
      expiry_date: earliestExpiry,
      updated_at: new Date().toISOString(),
    } as unknown as never)
    .eq("id", itemId);

  await admin.from("inventory_logs").insert([
    {
      household_id: item.household_id,
      item_id: itemId,
      change_amount: input.quantity,
      reason: "purchase",
      created_by: userId,
    },
  ] as unknown as never);

  revalidatePath("/");
  return { success: true, batch: newBatch, totalQuantity: newTotal };
}

/**
 * 数量の先入れ先出し（FIFO）自動消費 / クイック増減
 */
export async function adjustItemQuantity(itemId: string, delta: number) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { householdId, userId } = await getEffectiveHousehold(supabase);

  if (!householdId) {
    throw new Error("ログインまたは共有端末の連携が必要です");
  }

  const { data: itemData, error: itemError } = await admin
    .from("items")
    .select("*, item_batches(*)")
    .eq("id", itemId)
    .eq("household_id", householdId)
    .single();

  if (itemError || !itemData) {
    throw new Error("アイテムが見つかりません");
  }

  const item = itemData as unknown as ItemWithDetails;
  const oldTotal = Number(item.current_quantity);
  const newTotal = Math.max(0, Number((oldTotal + delta).toFixed(2)));

  const batches = item.item_batches || [];
  let sortedBatches = sortBatchesForConsumption(batches, item.track_expiry);

  if (delta < 0) {
    let remainingToDeduct = Math.abs(delta);

    for (const batch of sortedBatches) {
      if (remainingToDeduct <= 0.001) break;

      const bQty = Number(batch.quantity);
      if (bQty <= remainingToDeduct) {
        remainingToDeduct = Number((remainingToDeduct - bQty).toFixed(2));
        await admin.from("item_batches").delete().eq("id", batch.id);
      } else {
        const nextQty = Number((bQty - remainingToDeduct).toFixed(2));
        remainingToDeduct = 0;
        await admin
          .from("item_batches")
          .update({ quantity: nextQty } as unknown as never)
          .eq("id", batch.id);
      }
    }
  } else if (delta > 0) {
    const latestBatch = sortedBatches[sortedBatches.length - 1];
    if (latestBatch) {
      const nextQty = Number((Number(latestBatch.quantity) + delta).toFixed(2));
      await admin
        .from("item_batches")
        .update({ quantity: nextQty } as unknown as never)
        .eq("id", latestBatch.id);
    } else {
      await admin.from("item_batches").insert([
        {
          item_id: itemId,
          quantity: delta,
          expiry_date: null,
          purchased_at: new Date().toISOString().split("T")[0],
        },
      ] as unknown as never);
    }
  }

  // 最新のロット一覧から最近の賞味期限を再計算
  const { data: refreshedBatches } = await admin
    .from("item_batches")
    .select("*")
    .eq("item_id", itemId);

  let earliestExpiry: string | null = null;
  if (item.track_expiry && refreshedBatches && refreshedBatches.length > 0) {
    const expiries = (refreshedBatches as ItemBatch[])
      .map((b) => b.expiry_date)
      .filter(Boolean)
      .sort() as string[];
    earliestExpiry = expiries[0] || null;
  }

  await admin
    .from("items")
    .update({
      current_quantity: newTotal,
      expiry_date: earliestExpiry,
      updated_at: new Date().toISOString(),
    } as unknown as never)
    .eq("id", itemId);

  await admin.from("inventory_logs").insert([
    {
      household_id: item.household_id,
      item_id: itemId,
      change_amount: delta,
      reason: delta < 0 ? "consumption" : "manual_adjustment",
      created_by: userId,
    },
  ] as unknown as never);

  revalidatePath("/");
  return { success: true, newQuantity: newTotal };
}

/**
 * アイテムの更新
 */
export async function updateItem(itemId: string, input: Partial<ItemInput>) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { householdId } = await getEffectiveHousehold(supabase);

  if (!householdId) {
    throw new Error("ログインまたは共有端末の連携が必要です");
  }

  const payload: Database["public"]["Tables"]["items"]["Update"] = {
    updated_at: new Date().toISOString(),
  };

  if (input.name !== undefined) payload.name = input.name;
  if (input.category !== undefined) payload.category = input.category;
  if (input.location !== undefined) payload.location = input.location;
  if (input.unit !== undefined) payload.unit = input.unit;
  if (input.min_quantity !== undefined) payload.min_quantity = input.min_quantity;
  if (input.consumption_step !== undefined) payload.consumption_step = input.consumption_step;
  if (input.package_quantity !== undefined) payload.package_quantity = input.package_quantity;
  if (input.track_expiry !== undefined) payload.track_expiry = input.track_expiry;
  if (input.track_opened !== undefined) payload.track_opened = input.track_opened;
  if (input.opened_shelf_life_days !== undefined) payload.opened_shelf_life_days = input.opened_shelf_life_days;
  if (input.memo !== undefined) payload.memo = input.memo;

  const { error } = await admin
    .from("items")
    .update(payload as unknown as never)
    .eq("id", itemId)
    .eq("household_id", householdId);

  if (error) {
    throw new Error(`アイテム更新エラー: ${error.message}`);
  }

  if (input.channel && input.channel.provider_name) {
    const { data: existingChannel } = await admin
      .from("item_procurement_channels")
      .select("id")
      .eq("item_id", itemId)
      .eq("is_default", true)
      .maybeSingle();

    if (existingChannel) {
      await admin
        .from("item_procurement_channels")
        .update({
          channel_type: input.channel.channel_type,
          provider_name: input.channel.provider_name,
          url: input.channel.url || null,
          unit_price: input.channel.unit_price || null,
        } as unknown as never)
        .eq("id", (existingChannel as { id: string }).id);
    } else {
      await admin.from("item_procurement_channels").insert([
        {
          item_id: itemId,
          channel_type: input.channel.channel_type,
          provider_name: input.channel.provider_name,
          url: input.channel.url || null,
          unit_price: input.channel.unit_price || null,
          is_default: true,
        },
      ] as unknown as never);
    }
  }

  revalidatePath("/");
  return { success: true };
}

/**
 * アイテムの削除
 */
export async function deleteItem(itemId: string) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { householdId } = await getEffectiveHousehold(supabase);

  if (!householdId) {
    throw new Error("ログインまたは共有端末の連携が必要です");
  }

  const { error } = await admin
    .from("items")
    .delete()
    .eq("id", itemId)
    .eq("household_id", householdId);

  if (error) {
    throw new Error(`アイテム削除エラー: ${error.message}`);
  }

  revalidatePath("/");
  return { success: true };
}

/**
 * 個別ロットの開封処理
 */
export async function openBatch(batchId: string) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { householdId } = await getEffectiveHousehold(supabase);

  if (!householdId) {
    throw new Error("ログインまたは共有端末の連携が必要です");
  }

  const todayStr = new Date().toISOString().split("T")[0];
  const { error } = await admin
    .from("item_batches")
    .update({ opened_at: todayStr } as unknown as never)
    .eq("id", batchId);

  if (error) {
    throw new Error(`開封日更新エラー: ${error.message}`);
  }

  revalidatePath("/");
  return { success: true, openedAt: todayStr };
}

/**
 * 個別ロットの処理（使い切り・廃棄・登録取消）
 */
export async function processBatch(
  itemId: string,
  batchId: string,
  reason: BatchProcessReason
) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { householdId, userId } = await getEffectiveHousehold(supabase);

  if (!householdId) {
    throw new Error("ログインまたは共有端末の連携が必要です");
  }

  const { data: itemData, error: itemError } = await admin
    .from("items")
    .select("*, item_batches(*)")
    .eq("id", itemId)
    .eq("household_id", householdId)
    .single();

  if (itemError || !itemData) {
    throw new Error("アイテムが見つかりません");
  }

  const item = itemData as unknown as ItemWithDetails;
  const targetBatch = (item.item_batches || []).find((b) => b.id === batchId);

  if (!targetBatch) {
    throw new Error("対象のロットが見つかりません");
  }

  const removedQuantity = Number(targetBatch.quantity);
  const newTotal = Math.max(0, Number((Number(item.current_quantity) - removedQuantity).toFixed(2)));

  const { error: deleteError } = await admin
    .from("item_batches")
    .delete()
    .eq("id", batchId);

  if (deleteError) {
    throw new Error(`ロット削除エラー: ${deleteError.message}`);
  }

  const remainingBatches = (item.item_batches || []).filter((b) => b.id !== batchId);
  let earliestExpiry: string | null = null;
  if (item.track_expiry && remainingBatches.length > 0) {
    const expiries = remainingBatches
      .map((b) => b.expiry_date)
      .filter(Boolean)
      .sort() as string[];
    earliestExpiry = expiries[0] || null;
  }

  await admin
    .from("items")
    .update({
      current_quantity: newTotal,
      expiry_date: earliestExpiry,
      updated_at: new Date().toISOString(),
    } as unknown as never)
    .eq("id", itemId);

  let logReason = "consumption";
  if (reason === "waste") {
    logReason = "expired";
  } else if (reason === "correction") {
    logReason = "manual_adjustment";
  }

  await admin.from("inventory_logs").insert([
    {
      household_id: item.household_id,
      item_id: itemId,
      change_amount: -removedQuantity,
      reason: logReason,
      created_by: userId,
    },
  ] as unknown as never);

  revalidatePath("/");
  return { success: true, newQuantity: newTotal };
}

/**
 * 個別ロットの削除
 */
export async function deleteBatch(itemId: string, batchId: string) {
  return processBatch(itemId, batchId, "correction");
}
