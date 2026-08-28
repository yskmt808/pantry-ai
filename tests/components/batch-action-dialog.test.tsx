import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { BatchActionDialog } from "@/components/inventory/batch-action-dialog";
import type { ItemWithDetails, ItemBatch } from "@/app/actions/items";

const mockItem: ItemWithDetails = {
  id: "item-milk",
  household_id: "household-1",
  name: "牛乳",
  category: "乳製品・卵",
  location: "refrigerator",
  current_quantity: 1,
  unit: "本",
  min_quantity: 1,
  consumption_step: 1,
  package_quantity: 1,
  track_expiry: true,
  track_opened: false,
  opened_shelf_life_days: null,
  expiry_date: "2026-08-22",
  memo: null,
  created_at: "2026-08-20T00:00:00Z",
  updated_at: "2026-08-20T00:00:00Z",
  item_batches: [],
  item_procurement_channels: [],
};

const mockBatch: ItemBatch = {
  id: "batch-1",
  item_id: "item-milk",
  quantity: 1,
  expiry_date: "2026-08-22",
  opened_at: null,
  purchased_at: "2026-08-18",
  created_at: "2026-08-18T00:00:00Z",
};

describe("BatchActionDialog (ロット処理ダイアログ)", () => {
  it("「使い切った」「廃棄した」「登録を取り消す」の3つのアクションが表示されること", () => {
    const onProcessMock = vi.fn().mockResolvedValue(undefined);
    const onOpenChangeMock = vi.fn();

    render(
      <BatchActionDialog
        open={true}
        onOpenChange={onOpenChangeMock}
        item={mockItem}
        batch={mockBatch}
        onProcess={onProcessMock}
      />
    );

    expect(screen.getByText("牛乳 のロットを処理")).toBeInTheDocument();
    expect(screen.getByText("使い切った（消費完了）")).toBeInTheDocument();
    expect(screen.getByText("廃棄した（フードロス）")).toBeInTheDocument();
    expect(screen.getByText("登録を取り消す（誤入力修正）")).toBeInTheDocument();
  });

  it("「使い切った」をクリックすると reason: 'consumption' で onProcess が呼ばれること", async () => {
    const onProcessMock = vi.fn().mockResolvedValue(undefined);
    const onOpenChangeMock = vi.fn();

    render(
      <BatchActionDialog
        open={true}
        onOpenChange={onOpenChangeMock}
        item={mockItem}
        batch={mockBatch}
        onProcess={onProcessMock}
      />
    );

    const consumptionBtn = screen.getByText("使い切った（消費完了）");
    await act(async () => {
      fireEvent.click(consumptionBtn);
    });

    expect(onProcessMock).toHaveBeenCalledWith("batch-1", "item-milk", "consumption");
  });

  it("「廃棄した」をクリックすると reason: 'waste' で onProcess が呼ばれること", async () => {
    const onProcessMock = vi.fn().mockResolvedValue(undefined);
    const onOpenChangeMock = vi.fn();

    render(
      <BatchActionDialog
        open={true}
        onOpenChange={onOpenChangeMock}
        item={mockItem}
        batch={mockBatch}
        onProcess={onProcessMock}
      />
    );

    const wasteBtn = screen.getByText("廃棄した（フードロス）");
    await act(async () => {
      fireEvent.click(wasteBtn);
    });

    expect(onProcessMock).toHaveBeenCalledWith("batch-1", "item-milk", "waste");
  });

  it("「登録を取り消す」をクリックすると reason: 'correction' で onProcess が呼ばれること", async () => {
    const onProcessMock = vi.fn().mockResolvedValue(undefined);
    const onOpenChangeMock = vi.fn();

    render(
      <BatchActionDialog
        open={true}
        onOpenChange={onOpenChangeMock}
        item={mockItem}
        batch={mockBatch}
        onProcess={onProcessMock}
      />
    );

    const correctionBtn = screen.getByText("登録を取り消す（誤入力修正）");
    await act(async () => {
      fireEvent.click(correctionBtn);
    });

    expect(onProcessMock).toHaveBeenCalledWith("batch-1", "item-milk", "correction");
  });
});

