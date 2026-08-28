"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { ItemWithDetails, ItemBatch, BatchProcessReason } from "@/app/actions/items";
import { Utensils, Trash2, Undo2, AlertTriangle, CheckCircle2 } from "lucide-react";

interface BatchActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ItemWithDetails | null;
  batch: ItemBatch | null;
  onProcess: (batchId: string, itemId: string, reason: BatchProcessReason) => Promise<void>;
}

export function BatchActionDialog({
  open,
  onOpenChange,
  item,
  batch,
  onProcess,
}: BatchActionDialogProps) {
  const [loading, setLoading] = useState(false);

  if (!item || !batch) return null;

  const handleAction = async (reason: BatchProcessReason) => {
    try {
      setLoading(true);
      await onProcess(batch.id, item.id, reason);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={`${item.name} のロットを処理`}
      description={`対象ロット: ${batch.quantity} ${item.unit} ${
        batch.expiry_date ? `(期限: ${batch.expiry_date})` : ""
      } ${batch.opened_at ? `(開封: ${batch.opened_at})` : ""}`}
    >
      <div className="space-y-3 pt-1">
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          このロットの処理理由を選択してください。AIの消費サイクル予測やフードロス分析に活用されます。
        </p>

        {/* 1. 使い切った (消費) */}
        <button
          disabled={loading}
          onClick={() => handleAction("consumption")}
          className="w-full flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3.5 text-left transition-all hover:bg-emerald-100/70 hover:border-emerald-400 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/60 group"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm shadow-emerald-600/30 group-hover:scale-105 transition-transform">
            <Utensils className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
              <span>使い切った（消費完了）</span>
              <span className="text-[10px] font-normal text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.2 rounded">
                おすすめ
              </span>
            </div>
            <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 mt-0.5 leading-tight">
              料理などで美味しく食べきりました。家族の消費サイクルとして学習されます。
            </p>
          </div>
        </button>

        {/* 2. 廃棄した (フードロス) */}
        <button
          disabled={loading}
          onClick={() => handleAction("waste")}
          className="w-full flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50/50 p-3.5 text-left transition-all hover:bg-rose-100/70 hover:border-rose-400 dark:border-rose-900/60 dark:bg-rose-950/30 dark:hover:bg-rose-950/60 group"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-600 text-white shadow-sm shadow-rose-600/30 group-hover:scale-105 transition-transform">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-rose-950 dark:text-rose-200">
              廃棄した（フードロス）
            </div>
            <p className="text-[11px] text-rose-700/80 dark:text-rose-400/80 mt-0.5 leading-tight">
              賞味期限切れや傷みで処分しました。買いすぎ防止や食品ロス削減レポートに反映されます。
            </p>
          </div>
        </button>

        {/* 3. 登録を取り消す (誤入力) */}
        <button
          disabled={loading}
          onClick={() => handleAction("correction")}
          className="w-full flex items-start gap-3 rounded-2xl border border-neutral-200 bg-neutral-50/70 p-3.5 text-left transition-all hover:bg-neutral-100 hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900/60 dark:hover:bg-neutral-800 group"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-500 text-white shadow-sm group-hover:scale-105 transition-transform">
            <Undo2 className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
              登録を取り消す（誤入力修正）
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 leading-tight">
              間違えて登録したため削除します（消費・廃棄統計には含めません）。
            </p>
          </div>
        </button>

        <div className="pt-2 flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            キャンセル
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
