import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { BatchAddDialog } from "@/components/inventory/batch-add-dialog";
import type { ItemWithDetails } from "@/app/actions/items";

const mockEggItem: ItemWithDetails = {
  id: "item-egg",
  household_id: "household-1",
  name: "たまご",
  category: "乳製品・卵",
  location: "refrigerator",
  current_quantity: 10,
  unit: "個",
  min_quantity: 3,
  consumption_step: 1,
  package_quantity: 10, // 1パック = 10個
  track_expiry: true,
  track_opened: false,
  opened_shelf_life_days: null,
  expiry_date: "2026-08-28",
  memo: null,
  created_at: "2026-08-20T00:00:00Z",
  updated_at: "2026-08-20T00:00:00Z",
  item_batches: [],
  item_procurement_channels: [],
};

describe("BatchAddDialog (買い足しダイアログ)", () => {
  it("卵のように package_quantity: 10 の場合、初期数量に 10 がセットされ、クイック選択ボタンが表示されること", async () => {
    const onSubmitMock = vi.fn().mockResolvedValue(undefined);
    const onOpenChangeMock = vi.fn();

    render(
      <BatchAddDialog
        open={true}
        onOpenChange={onOpenChangeMock}
        item={mockEggItem}
        onSubmit={onSubmitMock}
      />
    );

    // ダイアログタイトル
    expect(screen.getByText("たまご を買い足す（ロット追加）")).toBeInTheDocument();

    // 1パック=10個の表示
    expect(screen.getByText("1パック = 10 個")).toBeInTheDocument();

    // 数量入力フィールドの初期値
    const input = screen.getByRole("spinbutton") as HTMLInputElement;
    expect(input.value).toBe("10");

    // クイック選択ボタンの存在確認
    const pack2Btn = screen.getByText("2パック (20個)");
    expect(pack2Btn).toBeInTheDocument();

    // 2パックボタンをクリック
    await act(async () => {
      fireEvent.click(pack2Btn);
    });
    expect(input.value).toBe("20");
  });

  it("送信ボタンを押した際、設定した数量と日付で onSubmit が呼ばれること", async () => {
    const onSubmitMock = vi.fn().mockResolvedValue(undefined);
    const onOpenChangeMock = vi.fn();

    render(
      <BatchAddDialog
        open={true}
        onOpenChange={onOpenChangeMock}
        item={mockEggItem}
        onSubmit={onSubmitMock}
      />
    );

    const submitBtn = screen.getByRole("button", { name: /在庫を追加/i });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(onSubmitMock).toHaveBeenCalledWith(
      "item-egg",
      expect.objectContaining({
        quantity: 10,
      })
    );
  });
});

