"use server";

import { createClient } from "@/lib/supabase/server";
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

/**
 * 在庫アイテム一覧（ロットと調達先を含む）の取得
 */
export async function getItems(location?: LocationType): Promise<ItemWithDetails[]> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return [];
    }

    let query = supabase
      .from("items")
      .select("*, item_procurement_channels(*), item_batches(*)")
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("ログインが必要です");
  }

  const { data: userProfile, error: userError } = await supabase
    .from("users")
    .select("household_id")
    .eq("id", user.id)
    .single();

  const householdId = (userProfile as { household_id: string | null } | null)?.household_id;

  if (userError || !householdId) {
    throw new Error("世帯情報が見つかりません");
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

  const { data: itemData, error: itemError } = await supabase
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
    const { data: cData } = await supabase
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("ログインが必要です");
  }

  const { data: itemData, error: itemError } = await supabase
    .from("items")
    .select("*, item_batches(*)")
    .eq("id", itemId)
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

  const { data: newBatchData, error: batchError } = await supabase
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

  await supabase
    .from("items")
    .update({
      current_quantity: newTotal,
      expiry_date: earliestExpiry,
      updated_at: new Date().toISOString(),
    } as unknown as never)
    .eq("id", itemId);

  await supabase.from("inventory_logs").insert([
    {
      household_id: item.household_id,
      item_id: itemId,
      change_amount: input.quantity,
      reason: "purchase",
      created_by: user.id,
    },
  ] as unknown as never);

  revalidatePath("/");
  return { success: true, batch: newBatch, totalQuantity: newTotal };
}

/**
 * 数量の先入れ先出し（FIFO）自動消費 / クイック増減
 * 開封済みロットを最優先、次に古い期限/購入日のロットから自動減算
 */
export async function adjustItemQuantity(itemId: string, delta: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("ログインが必要です");
  }

  const { data: itemData, error: fetchError } = await supabase
    .from("items")
    .select("*, item_batches(*)")
    .eq("id", itemId)
    .single();

  if (fetchError || !itemData) {
    throw new Error("アイテムが見つかりません");
  }

  const item = itemData as unknown as ItemWithDetails;
  const batches = sortBatchesForConsumption(item.item_batches || [], item.track_expiry);

  const oldTotal = Number(item.current_quantity);
  const newTotal = Math.max(0, Number((oldTotal + delta).toFixed(2)));

  if (delta < 0) {
    // 消費（FIFO: 開封済み優先 ➔ 古い期限/購入日順に減算）
    let remainingToDeduct = Math.abs(delta);

    for (const batch of batches) {
      if (remainingToDeduct <= 0.001) break;
      const bQty = Number(batch.quantity);

      if (bQty <= remainingToDeduct + 0.001) {
        remainingToDeduct = Math.max(0, Number((remainingToDeduct - bQty).toFixed(2)));
        await supabase.from("item_batches").delete().eq("id", batch.id);
      } else {
        const updatedQty = Number((bQty - remainingToDeduct).toFixed(2));
        remainingToDeduct = 0;
        await supabase
          .from("item_batches")
          .update({ quantity: updatedQty } as unknown as never)
          .eq("id", batch.id);
      }
    }
  } else if (delta > 0) {
    // 加算
    if (batches.length > 0) {
      const lastBatch = batches[batches.length - 1];
      const updatedQty = Number((Number(lastBatch.quantity) + delta).toFixed(2));
      await supabase
        .from("item_batches")
        .update({ quantity: updatedQty } as unknown as never)
        .eq("id", lastBatch.id);
    } else {
      await supabase.from("item_batches").insert([
        {
          item_id: itemId,
          quantity: delta,
          expiry_date: item.track_expiry ? item.expiry_date : null,
          purchased_at: new Date().toISOString().split("T")[0],
        },
      ] as unknown as never);
    }
  }

  let nextEarliest: string | null = null;
  if (item.track_expiry) {
    const { data: remainingBatches } = await supabase
      .from("item_batches")
      .select("expiry_date")
      .eq("item_id", itemId)
      .order("expiry_date", { ascending: true, nullsFirst: false });

    nextEarliest = (remainingBatches as { expiry_date: string | null }[] | null)?.[0]?.expiry_date || null;
  }

  await supabase
    .from("items")
    .update({
      current_quantity: newTotal,
      expiry_date: nextEarliest,
      updated_at: new Date().toISOString(),
    } as unknown as never)
    .eq("id", itemId);

  await supabase.from("inventory_logs").insert([
    {
      household_id: item.household_id,
      item_id: itemId,
      change_amount: delta,
      reason: delta > 0 ? "purchase" : "consumption",
      created_by: user.id,
    },
  ] as unknown as never);

  revalidatePath("/");
  return { success: true, newQuantity: newTotal, earliestExpiry: nextEarliest };
}

/**
 * ロットを開封済みに設定（数量が2以上の場合は1本分を分離して開封済みロットを作成）
 */
export async function openBatch(batchId: string, itemId: string, openQuantity?: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("ログインが必要です");
  }

  const { data: batchData, error: batchError } = await supabase
    .from("item_batches")
    .select("*, items(*)")
    .eq("id", batchId)
    .single();

  if (batchError || !batchData) {
    throw new Error("ロットが見つかりません");
  }

  const batch = batchData as unknown as ItemBatch & { items: Database["public"]["Tables"]["items"]["Row"] };
  const todayStr = new Date().toISOString().split("T")[0];
  const step = Number(batch.items?.consumption_step) || 1;
  const qtyToOpen = openQuantity ? Math.min(Number(batch.quantity), openQuantity) : Math.min(Number(batch.quantity), step >= 1 ? 1 : step);
  const currentQty = Number(batch.quantity);

  if (currentQty <= qtyToOpen + 0.001) {
    const { error } = await supabase
      .from("item_batches")
      .update({ opened_at: todayStr } as unknown as never)
      .eq("id", batchId);

    if (error) {
      throw new Error(`開封日更新エラー: ${error.message}`);
    }

    revalidatePath("/");
    return { success: true, openedBatchId: batchId, split: false };
  } else {
    const remainingQty = Number((currentQty - qtyToOpen).toFixed(2));

    await supabase
      .from("item_batches")
      .update({ quantity: remainingQty } as unknown as never)
      .eq("id", batchId);

    const newBatchPayload: Database["public"]["Tables"]["item_batches"]["Insert"] = {
      item_id: itemId,
      quantity: qtyToOpen,
      expiry_date: batch.expiry_date,
      opened_at: todayStr,
      purchased_at: batch.purchased_at,
    };

    const { data: newBatchData, error: insertError } = await supabase
      .from("item_batches")
      .insert([newBatchPayload] as unknown as never)
      .select()
      .single();

    if (insertError || !newBatchData) {
      throw new Error(`開封ロット作成エラー: ${insertError?.message}`);
    }

    revalidatePath("/");
    return {
      success: true,
      split: true,
      remainingBatch: { ...batch, quantity: remainingQty },
      openedBatch: newBatchData as unknown as ItemBatch,
    };
  }
}

export type BatchProcessReason = "consumption" | "waste" | "correction";

/**
 * ロットの処理・削除（消費完了、廃棄、誤登録取消）
 */
export async function deleteBatch(
  batchId: string,
  itemId: string,
  reason: BatchProcessReason = "consumption"
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("ログインが必要です");
  }

  // 対象ロットと親アイテムを取得
  const { data: batchData } = await supabase
    .from("item_batches")
    .select("*, items(*)")
    .eq("id", batchId)
    .single();

  const batch = batchData as unknown as (ItemBatch & { items: Database["public"]["Tables"]["items"]["Row"] }) | null;
  const householdId = batch?.items?.household_id;
  const batchQty = batch ? Number(batch.quantity) : 0;

  // ロット削除
  await supabase.from("item_batches").delete().eq("id", batchId);

  // 親アイテムの合計と期限を再集計
  const { data: remBatches } = await supabase
    .from("item_batches")
    .select("quantity, expiry_date")
    .eq("item_id", itemId)
    .order("expiry_date", { ascending: true, nullsFirst: false });

  const batches = (remBatches as { quantity: number; expiry_date: string | null }[]) || [];
  const newTotal = Number(batches.reduce((sum, b) => sum + Number(b.quantity), 0).toFixed(2));
  const nextEarliest = batches[0]?.expiry_date || null;

  await supabase
    .from("items")
    .update({
      current_quantity: newTotal,
      expiry_date: nextEarliest,
      updated_at: new Date().toISOString(),
    } as unknown as never)
    .eq("id", itemId);

  // 在庫ログ記録（誤登録取消以外はログを残す）
  if (householdId && batchQty > 0) {
    if (reason === "consumption" || reason === "waste") {
      await supabase.from("inventory_logs").insert([
        {
          household_id: householdId,
          item_id: itemId,
          change_amount: -batchQty,
          reason: reason,
          created_by: user.id,
        },
      ] as unknown as never);
    } else if (reason === "correction") {
      await supabase.from("inventory_logs").insert([
        {
          household_id: householdId,
          item_id: itemId,
          change_amount: -batchQty,
          reason: "correction",
          created_by: user.id,
        },
      ] as unknown as never);
    }
  }

  revalidatePath("/");
  return { success: true, newTotal };
}

/**
 * アイテム（品目マスタ）の更新
 */
export async function updateItem(itemId: string, input: Partial<ItemInput>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("ログインが必要です");
  }

  const updatePayload: Database["public"]["Tables"]["items"]["Update"] = {
    name: input.name,
    category: input.category,
    location: input.location,
    unit: input.unit,
    min_quantity: input.min_quantity,
    consumption_step: input.consumption_step,
    package_quantity: input.package_quantity,
    track_expiry: input.track_expiry,
    track_opened: input.track_opened,
    opened_shelf_life_days: input.opened_shelf_life_days,
    memo: input.memo,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("items")
    .update(updatePayload as unknown as never)
    .eq("id", itemId);

  if (error) {
    throw new Error(`アイテム更新エラー: ${error.message}`);
  }

  revalidatePath("/");
  return { success: true };
}

/**
 * アイテムの削除
 */
export async function deleteItem(itemId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("ログインが必要です");
  }

  const { error } = await supabase.from("items").delete().eq("id", itemId);

  if (error) {
    throw new Error(`アイテム削除エラー: ${error.message}`);
  }

  revalidatePath("/");
  return { success: true };
}
