import { describe, it, expect } from "vitest";

describe("消費計算とロット分割ロジック", () => {
  describe("端数消費の浮動小数点丸め計算", () => {
    it("キャベツ 0.75玉 から 0.25玉 消費したとき、正確に 0.50玉 になること", () => {
      const current = 0.75;
      const delta = -0.25;
      const result = Math.max(0, Number((current + delta).toFixed(2)));
      expect(result).toBe(0.5);
    });

    it("キャベツ 0.25玉 から 0.25玉 消費したとき、0 になること", () => {
      const current = 0.25;
      const delta = -0.25;
      const result = Math.max(0, Number((current + delta).toFixed(2)));
      expect(result).toBe(0);
    });

    it("在庫以上の消費（例: 残り0.25玉で0.5玉消費要求）があった場合、0未満にならず0で止まること", () => {
      const current = 0.25;
      const delta = -0.5;
      const result = Math.max(0, Number((current + delta).toFixed(2)));
      expect(result).toBe(0);
    });
  });

  describe("複数ロット跨ぎの FIFO 減算アルゴリズム", () => {
    it("ロットA(0.25玉)とロットB(0.50玉)から 0.50玉消費した際、ロットAが完全に消化され、ロットBから0.25玉減算されること", () => {
      let remainToDeduct = 0.5;
      const batches = [
        { id: "batch-A", quantity: 0.25 },
        { id: "batch-B", quantity: 0.5 },
      ];

      const nextBatches = [];
      for (const b of batches) {
        if (remainToDeduct <= 0.001) {
          nextBatches.push(b);
        } else if (b.quantity <= remainToDeduct + 0.001) {
          remainToDeduct = Math.max(0, Number((remainToDeduct - b.quantity).toFixed(2)));
        } else {
          nextBatches.push({
            ...b,
            quantity: Number((b.quantity - remainToDeduct).toFixed(2)),
          });
          remainToDeduct = 0;
        }
      }

      expect(nextBatches).toHaveLength(1);
      expect(nextBatches[0].id).toBe("batch-B");
      expect(nextBatches[0].quantity).toBe(0.25);
      expect(remainToDeduct).toBe(0);
    });
  });

  describe("ロット分割（1本だけ開封）アルゴリズム", () => {
    it("未開封ロット(2本)から1本開封した際、未開封1本と本日開封済み1本に分割されること", () => {
      const originalBatch = {
        id: "batch-orig",
        quantity: 2,
        opened_at: null,
        purchased_at: "2026-08-01",
      };
      const qtyToOpen = 1;
      const todayStr = "2026-08-20";

      // 分割処理
      const remainingQty = Number((originalBatch.quantity - qtyToOpen).toFixed(2));
      const remainingBatch = { ...originalBatch, quantity: remainingQty };
      const openedBatch = {
        id: "batch-new-opened",
        quantity: qtyToOpen,
        opened_at: todayStr,
        purchased_at: originalBatch.purchased_at,
      };

      expect(remainingBatch.quantity).toBe(1);
      expect(remainingBatch.opened_at).toBeNull();
      expect(openedBatch.quantity).toBe(1);
      expect(openedBatch.opened_at).toBe("2026-08-20");
    });
  });
});
