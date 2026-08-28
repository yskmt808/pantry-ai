import type { Database } from "@/lib/supabase/types";

export type ItemBatch = Database["public"]["Tables"]["item_batches"]["Row"];

/**
 * 在庫ロットの優先消費順（FIFO）ソートユーティリティ
 * 優先順位:
 * 1. 開封済み（opened_at があるもの）を最優先（古い開封日順）
 * 2. 未開封の中で賞味期限が早い順（track_expiry が true の場合）
 * 3. 購入日が古い順（purchased_at 昇順）
 */
export function sortBatchesForConsumption(
  batches: ItemBatch[],
  trackExpiry: boolean = true
): ItemBatch[] {
  return [...batches].sort((a, b) => {
    // 1. 開封済みを未開封より優先
    const aOpened = !!a.opened_at;
    const bOpened = !!b.opened_at;
    if (aOpened && !bOpened) return -1;
    if (!aOpened && bOpened) return 1;

    // 両方開封済みの場合
    if (aOpened && bOpened) {
      if (trackExpiry && a.expiry_date && b.expiry_date && a.expiry_date !== b.expiry_date) {
        return a.expiry_date.localeCompare(b.expiry_date);
      }
      if (a.opened_at && b.opened_at && a.opened_at !== b.opened_at) {
        return a.opened_at.localeCompare(b.opened_at);
      }
    }

    // 2. 賞味期限が早い順
    if (trackExpiry) {
      if (a.expiry_date && b.expiry_date && a.expiry_date !== b.expiry_date) {
        return a.expiry_date.localeCompare(b.expiry_date);
      }
      if (a.expiry_date && !b.expiry_date) return -1;
      if (!a.expiry_date && b.expiry_date) return 1;
    }

    // 3. 購入日が古い順
    if (a.purchased_at && b.purchased_at && a.purchased_at !== b.purchased_at) {
      return a.purchased_at.localeCompare(b.purchased_at);
    }
    if (a.purchased_at && !b.purchased_at) return -1;
    if (!a.purchased_at && b.purchased_at) return 1;

    return (a.created_at || "").localeCompare(b.created_at || "");
  });
}
