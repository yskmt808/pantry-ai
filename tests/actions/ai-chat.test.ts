import { describe, it, expect, vi } from "vitest";
import { sendChatMessage } from "@/app/actions/ai-chat";
import type { ItemWithDetails } from "@/app/actions/items";

const mockItems: ItemWithDetails[] = [
  {
    id: "item-cabbage",
    household_id: "household-1",
    name: "キャベツ",
    category: "野菜",
    location: "vegetable_room",
    current_quantity: 0.75,
    unit: "玉",
    min_quantity: 0.25,
    consumption_step: 0.25,
    package_quantity: 1,
    track_expiry: true,
    track_opened: false,
    opened_shelf_life_days: null,
    expiry_date: "2026-08-25",
    memo: null,
    created_at: "2026-08-20T00:00:00Z",
    updated_at: "2026-08-20T00:00:00Z",
    item_batches: [],
    item_procurement_channels: [],
  },
  {
    id: "item-egg",
    household_id: "household-1",
    name: "たまご",
    category: "乳製品・卵",
    location: "refrigerator",
    current_quantity: 10,
    unit: "個",
    min_quantity: 3,
    consumption_step: 1,
    package_quantity: 10,
    track_expiry: true,
    track_opened: false,
    opened_shelf_life_days: null,
    expiry_date: "2026-08-28",
    memo: null,
    created_at: "2026-08-20T00:00:00Z",
    updated_at: "2026-08-20T00:00:00Z",
    item_batches: [],
    item_procurement_channels: [],
  },
];

describe("AI Chat & 自然言語在庫操作 (sendChatMessage)", () => {
  it("「キャベツ半分使った」で 0.5玉 の消費アクションが正確に抽出されること", async () => {
    const res = await sendChatMessage({
      message: "キャベツ半分使ったよ",
      items: mockItems,
    });

    expect(res.replyText).toContain("キャベツ");
    expect(res.executedActions).toHaveLength(1);
    expect(res.executedActions[0].actionType).toBe("adjust");
    expect(res.executedActions[0].itemName).toBe("キャベツ");
    expect(res.executedActions[0].newQuantity).toBe(0.25);
  });

  it("「たまご1パック買い足した」で 10個 の買い足しアクションが抽出されること", async () => {
    const res = await sendChatMessage({
      message: "たまごを1パック買い足したよ",
      items: mockItems,
    });

    expect(res.replyText).toContain("たまご");
    expect(res.executedActions).toHaveLength(1);
    expect(res.executedActions[0].actionType).toBe("add_batch");
    expect(res.executedActions[0].itemName).toBe("たまご");
    expect(res.executedActions[0].newQuantity).toBe(20);
  });

  it("「今日の夕飯何作れる？」で在庫に基づいた献立レシピが提案されること", async () => {
    const res = await sendChatMessage({
      message: "今日の夕飯何作れる？",
      items: mockItems,
    });

    expect(res.replyText).toContain("豚平焼き");
    expect(res.executedActions).toHaveLength(1);
    expect(res.executedActions[0].actionType).toBe("recipe_suggestion");
  });

  it("「今の在庫教えて」で在庫一覧の概要が返答されること", async () => {
    const res = await sendChatMessage({
      message: "今の在庫教えて",
      items: mockItems,
    });

    expect(res.replyText).toContain("キャベツ");
    expect(res.replyText).toContain("たまご");
  });
});
