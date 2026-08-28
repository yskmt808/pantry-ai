"use client";

import { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { ItemWithDetails, BatchInput } from "@/app/actions/items";
import { Plus, Calendar, Clock, ShoppingBag } from "lucide-react";

interface BatchAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ItemWithDetails | null;
  onSubmit: (itemId: string, input: BatchInput) => Promise<void>;
}

export function BatchAddDialog({
  open,
  onOpenChange,
  item,
  onSubmit,
}: BatchAddDialogProps) {
  const pkgQty = item ? Number(item.package_quantity) || 1 : 1;
  const [quantity, setQuantity] = useState<number>(pkgQty);
  const [expiryDate, setExpiryDate] = useState("");
  const [purchasedAt, setPurchasedAt] = useState(new Date().toISOString().split("T")[0]);
  const [openedAt, setOpenedAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (open && item) {
      const defaultQty = Number(item.package_quantity) || 1;
      setQuantity(defaultQty);
      setExpiryDate("");
      setPurchasedAt(new Date().toISOString().split("T")[0]);
      setOpenedAt("");
      setErrorMsg(null);
    }
  }, [open, item]);

  if (!item) return null;

  const isTrackExpiry = item.track_expiry ?? true;
  const hasPackageQty = pkgQty > 1;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) {
      setErrorMsg("数量は 0 より大きい値を指定してください");
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);

      const input: BatchInput = {
        quantity: Number(quantity),
        expiry_date: isTrackExpiry ? expiryDate || null : null,
        opened_at: openedAt || null,
        purchased_at: purchasedAt || new Date().toISOString().split("T")[0],
      };

      await onSubmit(item.id, input);
      onOpenChange(false);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "ロット追加に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={`${item.name} を買い足す（ロット追加）`}
      description={
        isTrackExpiry
          ? "賞味期限の異なる新しいロットを追加します"
          : "購入日を指定して在庫数量を追加します（賞味期限の管理は不要）"
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="rounded-lg bg-rose-50 p-3 text-xs text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
            {errorMsg}
          </div>
        )}

        <div className="rounded-xl bg-neutral-50 p-3 text-xs text-neutral-600 dark:bg-neutral-800/60 dark:text-neutral-300 flex items-center justify-between">
          <span>現在の合計在庫:</span>
          <span className="font-bold text-neutral-900 dark:text-neutral-100 text-sm">
            {item.current_quantity} {item.unit}
          </span>
        </div>

        {/* Quantity */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              追加する数量 ({item.unit}) <span className="text-rose-500">*</span>
            </label>
            {hasPackageQty && (
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                1パック = {pkgQty} {item.unit}
              </span>
            )}
          </div>

          <input
            type="number"
            min="0.1"
            step="any"
            required
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2 text-sm text-neutral-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 font-bold"
          />

          {/* Quick Package Selector (卵1パック=10個などの場合) */}
          {hasPackageQty && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-neutral-400">クイック選択:</span>
              <button
                type="button"
                onClick={() => setQuantity(pkgQty * 1)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all border ${
                  quantity === pkgQty * 1
                    ? "bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                    : "bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-100 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-300"
                }`}
              >
                1パック ({pkgQty}{item.unit})
              </button>
              <button
                type="button"
                onClick={() => setQuantity(pkgQty * 2)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all border ${
                  quantity === pkgQty * 2
                    ? "bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                    : "bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-100 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-300"
                }`}
              >
                2パック ({pkgQty * 2}{item.unit})
              </button>
              <button
                type="button"
                onClick={() => setQuantity(pkgQty * 3)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all border ${
                  quantity === pkgQty * 3
                    ? "bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                    : "bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-100 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-300"
                }`}
              >
                3パック ({pkgQty * 3}{item.unit})
              </button>
            </div>
          )}
        </div>

        {/* Expiry Date (track_expiry === true の場合) */}
        {isTrackExpiry ? (
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              賞味期限 / 消費期限
            </label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2 text-sm text-neutral-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            />
            <p className="mt-1 text-[11px] text-neutral-400">
              ※ 異なる賞味期限が存在する場合、消費時は古いロットから自動で減算されます。
            </p>
          </div>
        ) : (
          /* Purchased At (track_expiry === false の場合) */
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              購入日 / 補充日
            </label>
            <input
              type="date"
              value={purchasedAt}
              onChange={(e) => setPurchasedAt(e.target.value)}
              className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2 text-sm text-neutral-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            />
            <p className="mt-1 text-[11px] text-neutral-400">
              ※ この品目は賞味期限管理がOFFのため、購入日ベースで管理されます。
            </p>
          </div>
        )}

        {/* Opened At */}
        <div>
          <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
            開封日 (任意)
          </label>
          <input
            type="date"
            value={openedAt}
            onChange={(e) => setOpenedAt(e.target.value)}
            className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2 text-sm text-neutral-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          />
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            キャンセル
          </Button>
          <Button type="submit" disabled={loading} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
            <Plus className="h-4 w-4" />
            <span>{loading ? "追加中..." : "在庫を追加"}</span>
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
