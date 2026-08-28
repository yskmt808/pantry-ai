"use client";

import { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { LocationType, ChannelType } from "@/lib/supabase/types";
import type { ItemWithDetails, ItemInput } from "@/app/actions/items";
import { LOCATIONS } from "./location-tabs";
import { Calendar, Clock, Sparkles, Utensils } from "lucide-react";

interface ItemFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem: ItemWithDetails | null;
  onSubmit: (input: ItemInput, itemId?: string) => Promise<void>;
}

const CATEGORIES = [
  "野菜・果物",
  "肉・魚介",
  "乳製品・卵",
  "調味料",
  "加工品・惣菜",
  "冷凍食品",
  "飲料・お酒",
  "主食・米・パン",
  "日用品",
  "その他",
];

const UNITS = ["個", "パック", "本", "袋", "枚", "玉", "g", "kg", "ml", "L", "缶", "束"];

const CONSUMPTION_STEPS = [
  { value: 1, label: "1 (1個/1本ずつ)" },
  { value: 0.5, label: "0.5 (半分 1/2ずつ)" },
  { value: 0.25, label: "0.25 (1/4ずつ: キャベツ等)" },
  { value: 0.1, label: "0.1 (小分け 1/10ずつ)" },
];

export function ItemFormDialog({
  open,
  onOpenChange,
  editingItem,
  onSubmit,
}: ItemFormDialogProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("野菜・果物");
  const [location, setLocation] = useState<LocationType>("refrigerator");
  const [unit, setUnit] = useState("個");
  const [minQuantity, setMinQuantity] = useState(0);
  const [consumptionStep, setConsumptionStep] = useState(1);
  const [packageQuantity, setPackageQuantity] = useState<number>(1);
  const [trackExpiry, setTrackExpiry] = useState(true);
  const [trackOpened, setTrackOpened] = useState(false);
  const [openedShelfLifeDays, setOpenedShelfLifeDays] = useState<string>("");
  const [memo, setMemo] = useState("");

  // 調達ルート
  const [channelType, setChannelType] = useState<ChannelType>("physical_store");
  const [providerName, setProviderName] = useState("");
  const [unitPrice, setUnitPrice] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (editingItem) {
      setName(editingItem.name);
      setCategory(editingItem.category || "その他");
      setLocation(editingItem.location);
      setUnit(editingItem.unit || "個");
      setMinQuantity(Number(editingItem.min_quantity) || 0);
      setConsumptionStep(Number(editingItem.consumption_step) || 1);
      setPackageQuantity(Number(editingItem.package_quantity) || 1);
      setTrackExpiry(editingItem.track_expiry ?? true);
      setTrackOpened(editingItem.track_opened ?? false);
      setOpenedShelfLifeDays(editingItem.opened_shelf_life_days ? String(editingItem.opened_shelf_life_days) : "");
      setMemo(editingItem.memo || "");

      const channel = editingItem.item_procurement_channels?.[0];
      if (channel) {
        setChannelType(channel.channel_type);
        setProviderName(channel.provider_name);
        setUnitPrice(channel.unit_price ? String(channel.unit_price) : "");
      } else {
        setChannelType("physical_store");
        setProviderName("");
        setUnitPrice("");
      }
    } else {
      setName("");
      setCategory("野菜・果物");
      setLocation("refrigerator");
      setUnit("個");
      setMinQuantity(0);
      setConsumptionStep(1);
      setPackageQuantity(1);
      setTrackExpiry(true);
      setTrackOpened(false);
      setOpenedShelfLifeDays("");
      setMemo("");
      setChannelType("physical_store");
      setProviderName("");
      setUnitPrice("");
    }
    setErrorMsg(null);
  }, [editingItem, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("品目名を入力してください");
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);

      const input: ItemInput = {
        name: name.trim(),
        category,
        location,
        unit,
        min_quantity: Number(minQuantity) || 0,
        consumption_step: Number(consumptionStep) || 1,
        package_quantity: Number(packageQuantity) || 1,
        track_expiry: trackExpiry,
        track_opened: trackOpened,
        opened_shelf_life_days: openedShelfLifeDays ? Number(openedShelfLifeDays) : null,
        memo: memo.trim() || null,
        channel: providerName.trim()
          ? {
              channel_type: channelType,
              provider_name: providerName.trim(),
              unit_price: unitPrice ? Number(unitPrice) : null,
            }
          : undefined,
      };

      await onSubmit(input, editingItem?.id);
      onOpenChange(false);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={editingItem ? "品目情報を編集" : "新しい品目を登録"}
      description="品目の消費単位や賞味期限・開封日の管理方法を設定します。"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="rounded-lg bg-rose-50 p-3 text-xs text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
            {errorMsg}
          </div>
        )}

        {/* Name */}
        <div>
          <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
            品目名 <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="例: キャベツ、オリーブオイル、牛乳、たまご"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2 text-sm text-neutral-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          />
        </div>

        {/* Location & Category */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              保管場所
            </label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value as LocationType)}
              className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            >
              {LOCATIONS.filter((l) => l.id !== "all").map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              カテゴリ
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Unit, Consumption Step & Package Quantity */}
        <div className="grid grid-cols-3 gap-2.5">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              基本単位
            </label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full rounded-xl border border-neutral-300 bg-white px-2.5 py-2 text-sm text-neutral-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              消費単位
            </label>
            <select
              value={consumptionStep}
              onChange={(e) => setConsumptionStep(Number(e.target.value))}
              className="w-full rounded-xl border border-neutral-300 bg-white px-2 py-2 text-xs sm:text-sm text-neutral-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 font-medium"
            >
              {CONSUMPTION_STEPS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1" title="買い足し時の1パック/1セットあたりの個数">
              購入単位 (個数)
            </label>
            <input
              type="number"
              min="0.1"
              step="any"
              placeholder="例: 10 (1パック10個)"
              value={packageQuantity}
              onChange={(e) => setPackageQuantity(Number(e.target.value))}
              className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            />
          </div>
        </div>

        {/* Expiry Tracking Option (賞味期限管理の有無) */}
        <div className="rounded-xl border border-neutral-200/80 bg-neutral-50/70 p-3.5 dark:border-neutral-800 dark:bg-neutral-800/50 space-y-2">
          <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200">
            賞味期限の管理設定
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTrackExpiry(true)}
              className={`flex items-start gap-2.5 rounded-xl border p-2.5 text-left transition-all ${
                trackExpiry
                  ? "border-emerald-500 bg-emerald-50/80 text-emerald-900 shadow-sm dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-600"
                  : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400"
              }`}
            >
              <Calendar className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="text-xs font-bold">期限を管理する</p>
                <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5 leading-tight">
                  生鮮食品・乳製品・惣菜など
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setTrackExpiry(false)}
              className={`flex items-start gap-2.5 rounded-xl border p-2.5 text-left transition-all ${
                !trackExpiry
                  ? "border-emerald-500 bg-emerald-50/80 text-emerald-900 shadow-sm dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-600"
                  : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400"
              }`}
            >
              <Clock className="h-4 w-4 shrink-0 mt-0.5 text-neutral-500 dark:text-neutral-400" />
              <div>
                <p className="text-xs font-bold">購入日のみ管理</p>
                <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5 leading-tight">
                  調味料・米・乾物・日用品など
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Opened Tracking Option (開封日の管理) */}
        <div className="rounded-xl border border-neutral-200/80 bg-neutral-50/70 p-3.5 dark:border-neutral-800 dark:bg-neutral-800/50 space-y-2.5">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block">
                開封タイミングを管理する
              </label>
              <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
                オリーブオイル・ドレッシング・調味料・ジャムなど、開封後の日数が重要な品目
              </p>
            </div>
            <input
              type="checkbox"
              checked={trackOpened}
              onChange={(e) => setTrackOpened(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500"
            />
          </div>

          {trackOpened && (
            <div className="pt-2 border-t border-neutral-200/60 dark:border-neutral-700/60">
              <label className="block text-[11px] font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                開封後の推奨消費目安 (日数・任意)
              </label>
              <input
                type="number"
                min="1"
                placeholder="例: 60 (開封後60日以内に使い切る)"
                value={openedShelfLifeDays}
                onChange={(e) => setOpenedShelfLifeDays(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-xs text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              />
            </div>
          )}
        </div>

        {/* Min Quantity & Channel */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              残少アラート基準数
            </label>
            <input
              type="number"
              min="0"
              step="any"
              placeholder="例: 0.5"
              value={minQuantity}
              onChange={(e) => setMinQuantity(Number(e.target.value))}
              className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              主な調達ルート (任意)
            </label>
            <select
              value={channelType}
              onChange={(e) => setChannelType(e.target.value as ChannelType)}
              className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            >
              <option value="physical_store">実店舗 (スーパー等)</option>
              <option value="online">ネット通販 (Amazon等)</option>
              <option value="subscription">定期便 (コープ等)</option>
            </select>
          </div>
        </div>

        {/* Memo */}
        <div>
          <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
            メモ
          </label>
          <textarea
            rows={2}
            placeholder="例: 1/4玉ずつ使う、開封後は冷暗所保管"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2 text-sm text-neutral-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          />
        </div>

        {/* Action Buttons */}
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
            {loading ? "保存中..." : editingItem ? "変更を保存" : "品目を登録"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
