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
  Globe,
  Store,
  RefreshCw,
  MoreVertical,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
  Layers,
  ShoppingBag,
  Clock,
  Sparkles,
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

  // 賞味期限の計算関数
  const getExpiryStatus = (expiryDateStr: string | null) => {
    if (!expiryDateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDateStr);
    expiry.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { variant: "danger" as const, label: `期限切れ (${Math.abs(diffDays)}日前)` };
    }
    if (diffDays === 0) {
      return { variant: "danger" as const, label: "今日まで" };
    }
    if (diffDays <= 3) {
      return { variant: "warning" as const, label: `あと ${diffDays} 日` };
    }
    return { variant: "secondary" as const, label: `${expiryDateStr}` };
  };

  // 購入日からの日数計算関数
  const getPurchasedStatus = (purchasedDateStr: string | null) => {
    if (!purchasedDateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const purchased = new Date(purchasedDateStr);
    purchased.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((today.getTime() - purchased.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "本日購入";
    if (diffDays < 30) return `${diffDays}日前購入`;
    const months = Math.floor(diffDays / 30);
    return `約${months}ヶ月前購入`;
  };

  // 開封日からの日数計算と目安比較
  const getOpenedStatus = (openedDateStr: string | null) => {
    if (!openedDateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const opened = new Date(openedDateStr);
    opened.setHours(0, 0, 0, 0);

    const elapsedDays = Math.floor((today.getTime() - opened.getTime()) / (1000 * 60 * 60 * 24));
    const limit = item.opened_shelf_life_days;

    if (limit && elapsedDays > limit) {
      return {
        variant: "danger" as const,
        label: `開封後 ${elapsedDays}日目 (目安超過!)`,
      };
    }
    if (limit && elapsedDays >= limit - 7) {
      return {
        variant: "warning" as const,
        label: `開封後 ${elapsedDays}日目 (目安: ${limit}日)`,
      };
    }
    return {
      variant: "secondary" as const,
      label: elapsedDays === 0 ? "本日開封" : `開封後 ${elapsedDays}日目`,
    };
  };

  // 最も直近の賞味期限または購入日
  const earliestExpiry = item.expiry_date || batches[0]?.expiry_date || null;
  const expiryStatus = isTrackExpiry ? getExpiryStatus(earliestExpiry) : null;
  const latestPurchased = batches[batches.length - 1]?.purchased_at || null;
  const purchasedLabel = !isTrackExpiry && latestPurchased ? getPurchasedStatus(latestPurchased) : null;

  // 開封済みロットの有無
  const openedBatch = batches.find((b) => b.opened_at);
  const openedStatus = isTrackOpened && openedBatch ? getOpenedStatus(openedBatch.opened_at) : null;

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

  const defaultChannel = item.item_procurement_channels?.find((c) => c.is_default) || item.item_procurement_channels?.[0];

  return (
    <div className={`group relative rounded-2xl border bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md dark:bg-neutral-900/90 flex flex-col justify-between ${
      isOutOfStock
        ? "border-neutral-200 bg-neutral-50/70 opacity-80 dark:border-neutral-800 dark:bg-neutral-900/40"
        : "border-neutral-200/90 hover:border-emerald-500/50 dark:border-neutral-800"
    }`}>
      {/* Top Header */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium text-neutral-400 dark:text-neutral-500">
              {item.category}
            </span>

            {isOutOfStock ? (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-neutral-500 border-neutral-300 dark:border-neutral-700">
                <span>在庫切れ</span>
              </Badge>
            ) : isLowStock ? (
              <Badge variant="warning" className="text-[10px] px-1.5 py-0">
                <AlertTriangle className="h-2.5 w-2.5" />
                <span>残少</span>
              </Badge>
            ) : null}

            {/* 賞味期限バッジ */}
            {isTrackExpiry && expiryStatus && (
              <Badge variant={expiryStatus.variant} className="text-[10px] px-1.5 py-0">
                <Calendar className="h-2.5 w-2.5" />
                <span>
                  {hasMultipleBatches ? `直近: ${expiryStatus.label}` : expiryStatus.label}
                </span>
              </Badge>
            )}

            {/* 購入日バッジ (賞味期限管理なしの場合) */}
            {!isTrackExpiry && purchasedLabel && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                <Clock className="h-2.5 w-2.5" />
                <span>{purchasedLabel}</span>
              </Badge>
            )}

            {/* 開封ステータスバッジ */}
            {isTrackOpened && openedStatus && (
              <Badge variant={openedStatus.variant} className="text-[10px] px-1.5 py-0">
                <PackageCheck className="h-2.5 w-2.5" />
                <span>{openedStatus.label}</span>
              </Badge>
            )}

            {hasMultipleBatches && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                <Layers className="h-2.5 w-2.5" />
                <span>{batches.length} ロット</span>
              </Badge>
            )}
          </div>

          {/* Menu Dropdown */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 transition-colors"
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 top-6 z-30 w-36 rounded-xl border border-neutral-200 bg-white p-1 shadow-lg dark:border-neutral-800 dark:bg-neutral-900 animate-in fade-in zoom-in-95 duration-150">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenAddBatch(item);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
                  >
                    <ShoppingBag className="h-3.5 w-3.5" />
                    <span>買い足し (ロット追加)</span>
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onEdit(item);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    <span>品目編集</span>
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onDelete(item.id);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>削除</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Item Title */}
        <h4 className="mt-1.5 text-base font-bold text-neutral-900 dark:text-neutral-100 tracking-tight line-clamp-1">
          {item.name}
        </h4>

        {/* Memo & Step info */}
        <div className="mt-0.5 flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
          <span className="truncate max-w-[200px]">{item.memo || ""}</span>
          {step !== 1 && (
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
              消費単位: {step} {item.unit}
            </span>
          )}
        </div>
      </div>

      {/* Lot / Batch Accordion Section */}
      {batches.length > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex w-full items-center justify-between py-1 text-[11px] font-semibold text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Layers className="h-3 w-3" />
              <span>
                {isTrackExpiry
                  ? `賞味期限別の内訳 (${batches.length}件)`
                  : `購入ロット内訳 (${batches.length}件)`}
              </span>
            </span>
            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>

          {isExpanded && (
            <div className="mt-2 space-y-1.5 rounded-xl border border-neutral-200/60 bg-neutral-50/80 p-2.5 dark:border-neutral-800 dark:bg-neutral-800/40 animate-in fade-in duration-150">
              {batches.map((batch, idx) => {
                const bExpiry = isTrackExpiry ? getExpiryStatus(batch.expiry_date) : null;
                const bOpened = getOpenedStatus(batch.opened_at);

                return (
                  <div
                    key={batch.id || `batch-${idx}`}
                    className="flex items-center justify-between rounded-lg bg-white p-2 text-xs border border-neutral-200/40 dark:bg-neutral-900/60 dark:border-neutral-700/40"
                  >
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                          {batch.quantity} {item.unit}
                        </span>

                        {isTrackExpiry && bExpiry ? (
                          <Badge variant={bExpiry.variant} className="text-[9px] px-1 py-0">
                            {bExpiry.label}
                          </Badge>
                        ) : null}

                        {!isTrackExpiry && batch.purchased_at ? (
                          <span className="text-[10px] text-neutral-500">
                            購入: {batch.purchased_at}
                          </span>
                        ) : null}
                      </div>

                      {/* 開封情報または「開封する」ボタン */}
                      {isTrackOpened && (
                        <div className="mt-1 flex items-center gap-1.5">
                          {batch.opened_at ? (
                            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                              開封日: {batch.opened_at}
                              {bOpened && ` (${bOpened.label})`}
                            </span>
                          ) : onOpenBatch ? (
                            <button
                              onClick={() => onOpenBatch(batch.id, item.id)}
                              className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md"
                              title={Number(batch.quantity) > 1 ? `1${item.unit}だけ開封済みロットとして分離します` : "開封日に設定"}
                            >
                              <PackageCheck className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                              <span>
                                {Number(batch.quantity) > (step >= 1 ? 1 : step)
                                  ? `1${item.unit}だけ開封する`
                                  : "開封する（本日）"}
                              </span>
                            </button>
                          ) : null}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => onOpenBatchAction ? onOpenBatchAction(item, batch) : onDeleteBatch(batch.id, item.id)}
                      className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                      title="このロットを処理（使い切り・廃棄・取消）"
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}

              <button
                onClick={() => onOpenAddBatch(item)}
                className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-emerald-500/40 py-1.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/30 transition-colors"
              >
                <Plus className="h-3 w-3" />
                <span>{isTrackExpiry ? "新しい賞味期限で買い足す" : "在庫を追加する"}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Bottom Section: Channel info & Quantity Controls */}
      <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between">
        {/* Channel Icon Badge */}
        <div>
          {defaultChannel ? (
            <div
              className="flex items-center gap-1 text-[11px] text-neutral-500 dark:text-neutral-400"
              title={`${defaultChannel.provider_name} (${defaultChannel.channel_type})`}
            >
              {defaultChannel.channel_type === "physical_store" && <Store className="h-3.5 w-3.5 text-blue-500" />}
              {defaultChannel.channel_type === "online" && <Globe className="h-3.5 w-3.5 text-emerald-500" />}
              {defaultChannel.channel_type === "subscription" && <RefreshCw className="h-3.5 w-3.5 text-purple-500" />}
              <span className="max-w-[75px] truncate">{defaultChannel.provider_name}</span>
            </div>
          ) : (
            <button
              onClick={() => onOpenAddBatch(item)}
              className="text-[11px] text-emerald-600 hover:underline flex items-center gap-1 dark:text-emerald-400"
            >
              <Plus className="h-3 w-3" />
              <span>在庫追加</span>
            </button>
          )}
        </div>

        {/* Quick Quantity Counter (ステップ対応 & FIFO消費) */}
        <div className="flex items-center gap-1.5 bg-neutral-50 dark:bg-neutral-800/80 p-1 rounded-xl border border-neutral-200/60 dark:border-neutral-700/60">
          <Button
            onClick={() => handleAdjust(-1)}
            disabled={isAdjusting || Number(item.current_quantity) <= 0}
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-lg text-neutral-600 hover:bg-neutral-200 dark:text-neutral-300 dark:hover:bg-neutral-700"
            title={`-${step} ${item.unit} (古いロットから先入れ先出しで消費)`}
          >
            <Minus className="h-3 w-3" />
          </Button>

          <span className="min-w-[2.8rem] text-center text-xs font-bold text-neutral-800 dark:text-neutral-200">
            {item.current_quantity} <span className="text-[10px] font-normal text-neutral-500">{item.unit}</span>
          </span>

          <Button
            onClick={() => handleAdjust(1)}
            disabled={isAdjusting}
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-lg text-neutral-600 hover:bg-neutral-200 dark:text-neutral-300 dark:hover:bg-neutral-700"
            title={`+${step} ${item.unit}`}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
