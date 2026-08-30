"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ItemWithDetails, ItemBatch } from "@/app/actions/items";
import {
  Plus,
  Minus,
  Calendar,
  AlertTriangle,
  MoreVertical,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
  Layers,
  ShoppingBag,
  PackageCheck,
  SlidersHorizontal,
} from "lucide-react";

interface ItemCardProps {
  item: ItemWithDetails;
  onAdjustQuantity: (id: string, delta: number) => Promise<void>;
  onEdit: (item: ItemWithDetails) => void;
  onDelete: (id: string) => Promise<void>;
  onOpenAddBatch: (item: ItemWithDetails) => void;
  onDeleteBatch: (batchId: string, itemId: string) => Promise<void>;
  onOpenBatch?: (batchId: string, itemId: string) => Promise<void>;
  onOpenBatchAction?: (item: ItemWithDetails, batch: ItemBatch) => void;
}

export function ItemCard({
  item,
  onAdjustQuantity,
  onEdit,
  onDelete,
  onOpenAddBatch,
  onDeleteBatch,
  onOpenBatch,
  onOpenBatchAction,
}: ItemCardProps) {
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const batches = item.item_batches || [];
  const hasMultipleBatches = batches.length > 1;
  const isTrackExpiry = item.track_expiry ?? true;
  const isTrackOpened = item.track_opened ?? false;
  const step = Number(item.consumption_step) || 1;

  // 賞味期限ステータス
  const getExpiryStatus = (expiryDateStr: string | null) => {
    if (!expiryDateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDateStr);
    expiry.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { variant: "danger" as const, label: `期限切 (${Math.abs(diffDays)}日前)` };
    }
    if (diffDays === 0) {
      return { variant: "danger" as const, label: "今日まで" };
    }
    if (diffDays <= 3) {
      return { variant: "warning" as const, label: `あと${diffDays}日` };
    }
    return null; // 余裕がある場合はカード上をすっきりさせるためバッジを省略
  };

  // 開封日ステータス
  const getOpenedStatus = (openedDateStr: string | null) => {
    if (!openedDateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const opened = new Date(openedDateStr);
    opened.setHours(0, 0, 0, 0);

    const elapsedDays = Math.floor((today.getTime() - opened.getTime()) / (1000 * 60 * 60 * 24));
    const limit = item.opened_shelf_life_days;

    if (limit && elapsedDays > limit) {
      return { variant: "danger" as const, label: `開封${elapsedDays}日(超過!)` };
    }
    if (limit && elapsedDays >= limit - 7) {
      return { variant: "warning" as const, label: `開封${elapsedDays}日目` };
    }
    return null;
  };

  const earliestExpiry = item.expiry_date || batches[0]?.expiry_date || null;
  const expiryAlert = isTrackExpiry ? getExpiryStatus(earliestExpiry) : null;
  const openedBatch = batches.find((b) => b.opened_at);
  const openedAlert = isTrackOpened && openedBatch ? getOpenedStatus(openedBatch.opened_at) : null;

  const isLowStock = Number(item.current_quantity) <= Number(item.min_quantity) && Number(item.min_quantity) > 0;
  const isOutOfStock = Number(item.current_quantity) === 0;

  const handleAdjust = async (direction: 1 | -1) => {
    if (isAdjusting) return;
    const delta = direction * step;
    try {
      setIsAdjusting(true);
      await onAdjustQuantity(item.id, delta);
    } finally {
      setIsAdjusting(false);
    }
  };

  return (
    <div
      className={`group relative rounded-2xl sm:rounded-3xl border bg-white p-3 sm:p-4 shadow-sm transition-all duration-200 hover:shadow-md dark:bg-neutral-900/90 flex flex-col justify-between ${
        isOutOfStock
          ? "border-neutral-200 bg-neutral-50/70 opacity-80 dark:border-neutral-800 dark:bg-neutral-900/40"
          : "border-neutral-200/90 hover:border-emerald-500/50 dark:border-neutral-800"
      }`}
    >
      {/* 1. Header: カテゴリ・警告バッジ・メニューボタン */}
      <div>
        <div className="flex items-center justify-between gap-1.5 min-h-[24px]">
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[10px] sm:text-xs font-semibold text-neutral-400 dark:text-neutral-500 truncate max-w-[80px] sm:max-w-[120px]">
              {item.category || "食品"}
            </span>

            {isOutOfStock ? (
              <Badge variant="outline" className="text-[9px] sm:text-[10px] px-1.5 py-0 text-neutral-500 border-neutral-300 dark:border-neutral-700">
                在庫切
              </Badge>
            ) : isLowStock ? (
              <Badge variant="warning" className="text-[9px] sm:text-[10px] px-1.5 py-0">
                <AlertTriangle className="h-2.5 w-2.5" />
                <span>残少</span>
              </Badge>
            ) : null}

            {expiryAlert && (
              <Badge variant={expiryAlert.variant} className="text-[9px] sm:text-[10px] px-1.5 py-0">
                <Calendar className="h-2.5 w-2.5" />
                <span>{expiryAlert.label}</span>
              </Badge>
            )}

            {openedAlert && (
              <Badge variant={openedAlert.variant} className="text-[9px] sm:text-[10px] px-1.5 py-0">
                <PackageCheck className="h-2.5 w-2.5" />
                <span>{openedAlert.label}</span>
              </Badge>
            )}

            {hasMultipleBatches && (
              <Badge variant="secondary" className="text-[9px] sm:text-[10px] px-1.5 py-0 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                <Layers className="h-2.5 w-2.5" />
                <span>{batches.length}</span>
              </Badge>
            )}
          </div>

          {/* More Menu Dropdown */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 transition-colors"
              title="メニュー"
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 top-6 z-30 w-40 rounded-2xl border border-neutral-200 bg-white p-1.5 shadow-xl dark:border-neutral-800 dark:bg-neutral-900 animate-in fade-in zoom-in-95 duration-150">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenAddBatch(item);
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    <span>買い足し (ロット追加)</span>
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onEdit(item);
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  >
                    <Edit2 className="h-4 w-4" />
                    <span>品目編集</span>
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onDelete(item.id);
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>削除</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 2. 品目名（極めて読みやすい大文字） */}
        <h4 className="mt-1.5 text-base sm:text-lg md:text-xl font-extrabold text-neutral-900 dark:text-neutral-100 tracking-tight line-clamp-1">
          {item.name}
        </h4>
      </div>

      {/* ロット内訳アコーディオン（ロットが複数ある場合のみ控えめに表示） */}
      {hasMultipleBatches && (
        <div className="mt-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex w-full items-center justify-between py-0.5 text-[10px] sm:text-[11px] font-semibold text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 transition-colors"
          >
            <span className="flex items-center gap-1">
              <Layers className="h-3 w-3" />
              <span>ロット内訳 ({batches.length})</span>
            </span>
            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          {isExpanded && (
            <div className="mt-1.5 space-y-1 rounded-xl border border-neutral-200/60 bg-neutral-50/80 p-2 dark:border-neutral-800 dark:bg-neutral-800/40 text-[11px]">
              {batches.map((batch, idx) => (
                <div
                  key={batch.id || `batch-${idx}`}
                  className="flex items-center justify-between rounded-lg bg-white p-1.5 border border-neutral-200/40 dark:bg-neutral-900/60 dark:border-neutral-700/40"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-neutral-800 dark:text-neutral-200">
                      {batch.quantity}{item.unit}
                    </span>
                    {batch.expiry_date && (
                      <span className="text-[10px] text-neutral-500 font-mono">
                        {batch.expiry_date}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => onOpenBatchAction ? onOpenBatchAction(item, batch) : onDeleteBatch(batch.id, item.id)}
                    className="text-neutral-400 hover:text-neutral-700 p-1"
                    title="ロット操作"
                  >
                    <SlidersHorizontal className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. 相対サイズ（フルワイズ）大型コントローラー */}
      <div className="mt-3 sm:mt-4 pt-2 border-t border-neutral-100 dark:border-neutral-800/80">
        <div className="flex items-stretch justify-between gap-1.5 sm:gap-2">
          {/* マイナスボタン（カード幅の約38%を占有する大型タッチ領域） */}
          <button
            onClick={() => handleAdjust(-1)}
            disabled={isAdjusting || Number(item.current_quantity) <= 0}
            className="flex-1 h-12 sm:h-14 rounded-2xl bg-neutral-100 text-neutral-800 hover:bg-neutral-200 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center justify-center dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700 shadow-sm"
            title={`-${step} ${item.unit}`}
          >
            <Minus className="h-5 w-5 sm:h-6 sm:w-6 stroke-[3]" />
          </button>

          {/* 中央の極大数量表示 */}
          <div className="flex flex-col items-center justify-center min-w-[3.2rem] sm:min-w-[4.2rem] px-1">
            <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight leading-none">
              {item.current_quantity}
            </span>
            <span className="text-[10px] sm:text-xs font-bold text-neutral-500 dark:text-neutral-400 mt-0.5">
              {item.unit}
            </span>
          </div>

          {/* プラスボタン（カード幅の約38%を占有する大型タッチ領域） */}
          <button
            onClick={() => handleAdjust(1)}
            disabled={isAdjusting}
            className="flex-1 h-12 sm:h-14 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center justify-center shadow-md shadow-emerald-600/20"
            title={`+${step} ${item.unit}`}
          >
            <Plus className="h-5 w-5 sm:h-6 sm:w-6 stroke-[3]" />
          </button>
        </div>
      </div>
    </div>
  );
}
