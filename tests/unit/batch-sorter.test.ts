import { describe, it, expect } from "vitest";
import { sortBatchesForConsumption } from "@/lib/utils/batch-sorter";
import type { ItemBatch } from "@/app/actions/items";

describe("sortBatchesForConsumption (FIFO消費優先順位ソート)", () => {
  it("【最優先】未開封ロットよりも、開封済みロットが優先して先頭に来ること", () => {
    const batches: Partial<ItemBatch>[] = [
      { id: "batch-unopened", quantity: 1, opened_at: null, purchased_at: "2026-08-01" },
      { id: "batch-opened", quantity: 1, opened_at: "2026-08-10", purchased_at: "2026-08-05" },
    ];

    const sorted = sortBatchesForConsumption(batches as ItemBatch[], false);
    expect(sorted[0].id).toBe("batch-opened");
    expect(sorted[1].id).toBe("batch-unopened");
  });

  it("【開封済み同士】複数の開封済みロットがある場合、開封日が古い順にソートされること", () => {
    const batches: Partial<ItemBatch>[] = [
      { id: "opened-recent", quantity: 1, opened_at: "2026-08-15" },
      { id: "opened-old", quantity: 1, opened_at: "2026-08-05" },
    ];

    const sorted = sortBatchesForConsumption(batches as ItemBatch[], false);
    expect(sorted[0].id).toBe("opened-old");
    expect(sorted[1].id).toBe("opened-recent");
  });

  it("【賞味期限管理あり】未開封同士の場合、賞味期限が早い（古い）順にソートされること", () => {
    const batches: Partial<ItemBatch>[] = [
      { id: "late-expiry", quantity: 1, expiry_date: "2026-08-28", opened_at: null },
      { id: "early-expiry", quantity: 1, expiry_date: "2026-08-20", opened_at: null },
    ];

    const sorted = sortBatchesForConsumption(batches as ItemBatch[], true);
    expect(sorted[0].id).toBe("early-expiry");
    expect(sorted[1].id).toBe("late-expiry");
  });

  it("【賞味期限管理なし】賞味期限管理OFF（track_expiry=false）の場合、購入日が古い順にソートされること", () => {
    const batches: Partial<ItemBatch>[] = [
      { id: "new-purchase", quantity: 1, purchased_at: "2026-08-18", opened_at: null },
      { id: "old-purchase", quantity: 1, purchased_at: "2026-08-01", opened_at: null },
    ];

    const sorted = sortBatchesForConsumption(batches as ItemBatch[], false);
    expect(sorted[0].id).toBe("old-purchase");
    expect(sorted[1].id).toBe("new-purchase");
  });

  it("【複合】開封済み1本、期限間近の未開封1本、余裕のある未開封1本が正しい順序になること", () => {
    const batches: Partial<ItemBatch>[] = [
      { id: "unopened-late", quantity: 1, expiry_date: "2026-08-30", opened_at: null },
      { id: "opened", quantity: 1, expiry_date: "2026-08-25", opened_at: "2026-08-10" },
      { id: "unopened-early", quantity: 1, expiry_date: "2026-08-22", opened_at: null },
    ];

    const sorted = sortBatchesForConsumption(batches as ItemBatch[], true);
    expect(sorted[0].id).toBe("opened");
    expect(sorted[1].id).toBe("unopened-early");
    expect(sorted[2].id).toBe("unopened-late");
  });

  it("空配列や1件のみの場合でも安全に動作すること", () => {
    expect(sortBatchesForConsumption([])).toEqual([]);
    const single: Partial<ItemBatch>[] = [{ id: "single", quantity: 1 }];
    expect(sortBatchesForConsumption(single as ItemBatch[])).toEqual(single);
  });
});
