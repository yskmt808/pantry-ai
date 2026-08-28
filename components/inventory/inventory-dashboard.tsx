"use client";

import { useState, useMemo } from "react";
import { LocationTabs } from "./location-tabs";
import { ItemCard } from "./item-card";
import { ItemFormDialog } from "./item-form-dialog";
import { BatchAddDialog } from "./batch-add-dialog";
import { BatchActionDialog } from "./batch-action-dialog";
import { AiConciergeSheet } from "@/components/ai/ai-concierge-sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoginDialog } from "@/components/auth/login-dialog";
import {
  type ItemWithDetails,
  type ItemBatch,
  type ItemInput,
  type BatchInput,
  type BatchProcessReason,
  createItem,
  updateItem,
  adjustItemQuantity,
  deleteItem,
  addBatch,
  deleteBatch,
  openBatch,
} from "@/app/actions/items";
import { sortBatchesForConsumption } from "@/lib/utils/batch-sorter";
import type { LocationType } from "@/lib/supabase/types";
import type { User } from "@supabase/supabase-js";
import {
  Search,
  Plus,
  Sparkles,
  AlertTriangle,
  PackageOpen,
} from "lucide-react";

interface InventoryDashboardProps {
  initialItems: ItemWithDetails[];
  user: User | null;
}

// 未ログイン時用のデモデータ
const DEMO_ITEMS: ItemWithDetails[] = [
  {
    id: "demo-1",
    household_id: "demo-household",
    name: "牛乳 (1000ml)",
    category: "乳製品・卵",
    location: "refrigerator",
    current_quantity: 2,
    unit: "本",
    min_quantity: 1,
    consumption_step: 1,
    package_quantity: 1,
    track_expiry: true,
    track_opened: false,
    opened_shelf_life_days: null,
    expiry_date: new Date(Date.now() + 2 * 86400000).toISOString().split("T")[0],
    memo: "未開封1本、飲みかけ1本",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    item_procurement_channels: [
      {
        id: "demo-ch-1",
        item_id: "demo-1",
        channel_type: "physical_store",
        provider_name: "スーパーライフ",
        url: null,
        unit_price: 218,
        is_default: true,
        created_at: new Date().toISOString(),
      },
    ],
    item_batches: [
      {
        id: "demo-batch-1a",
        item_id: "demo-1",
        quantity: 1,
        expiry_date: new Date(Date.now() + 2 * 86400000).toISOString().split("T")[0],
        opened_at: null,
        purchased_at: new Date(Date.now() - 3 * 86400000).toISOString().split("T")[0],
        created_at: new Date().toISOString(),
      },
      {
        id: "demo-batch-1b",
        item_id: "demo-1",
        quantity: 1,
        expiry_date: new Date(Date.now() + 8 * 86400000).toISOString().split("T")[0],
        opened_at: null,
        purchased_at: new Date().toISOString().split("T")[0],
        created_at: new Date().toISOString(),
      },
    ],
  },
  {
    id: "demo-2",
    household_id: "demo-household",
    name: "たまご",
    category: "乳製品・卵",
    location: "refrigerator",
    current_quantity: 10,
    unit: "個",
    min_quantity: 3,
    consumption_step: 1, // 1個ずつ消費
    package_quantity: 10, // 1パック=10個
    track_expiry: true,
    track_opened: false,
    opened_shelf_life_days: null,
    expiry_date: new Date(Date.now() + 6 * 86400000).toISOString().split("T")[0],
    memo: "1パック(10個)単位で購入、1個ずつ消費",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    item_procurement_channels: [
      {
        id: "demo-ch-4",
        item_id: "demo-2",
        channel_type: "physical_store",
        provider_name: "スーパーライフ",
        url: null,
        unit_price: 248,
        is_default: true,
        created_at: new Date().toISOString(),
      },
    ],
    item_batches: [
      {
        id: "demo-batch-2",
        item_id: "demo-2",
        quantity: 10,
        expiry_date: new Date(Date.now() + 6 * 86400000).toISOString().split("T")[0],
        opened_at: null,
        purchased_at: new Date().toISOString().split("T")[0],
        created_at: new Date().toISOString(),
      },
    ],
  },
  {
    id: "demo-3",
    household_id: "demo-household",
    name: "キャベツ",
    category: "野菜・果物",
    location: "vegetable_room",
    current_quantity: 0.75,
    unit: "玉",
    min_quantity: 0.25,
    consumption_step: 0.25,
    package_quantity: 1,
    track_expiry: true,
    track_opened: false,
    opened_shelf_life_days: null,
    expiry_date: new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0],
    memo: "1/4玉ずつお好み焼きやサラダに利用",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    item_procurement_channels: [],
    item_batches: [
      {
        id: "demo-batch-3",
        item_id: "demo-3",
        quantity: 0.75,
        expiry_date: new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0],
        opened_at: null,
        purchased_at: new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0],
        created_at: new Date().toISOString(),
      },
    ],
  },
  {
    id: "demo-5",
    household_id: "demo-household",
    name: "エキストラバージン オリーブオイル (500ml)",
    category: "調味料",
    location: "pantry",
    current_quantity: 2,
    unit: "本",
    min_quantity: 1,
    consumption_step: 1,
    package_quantity: 1,
    track_expiry: false,
    track_opened: true,
    opened_shelf_life_days: 60,
    expiry_date: null,
    memo: "1本使用中（開封後約15日）、1本未開封ストック",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    item_procurement_channels: [
      {
        id: "demo-ch-3",
        item_id: "demo-5",
        channel_type: "online",
        provider_name: "Amazon",
        url: null,
        unit_price: 980,
        is_default: true,
        created_at: new Date().toISOString(),
      },
    ],
    item_batches: [
      {
        id: "demo-batch-5a",
        item_id: "demo-5",
        quantity: 1,
        expiry_date: null,
        opened_at: new Date(Date.now() - 15 * 86400000).toISOString().split("T")[0],
        purchased_at: new Date(Date.now() - 20 * 86400000).toISOString().split("T")[0],
        created_at: new Date().toISOString(),
      },
      {
        id: "demo-batch-5b",
        item_id: "demo-5",
        quantity: 1,
        expiry_date: null,
        opened_at: null,
        purchased_at: new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0],
        created_at: new Date().toISOString(),
      },
    ],
  },
  {
    id: "demo-4",
    household_id: "demo-household",
    name: "豚バラ肉 (300g)",
    category: "肉・魚介",
    location: "freezer",
    current_quantity: 2,
    unit: "パック",
    min_quantity: 1,
    consumption_step: 1,
    package_quantity: 1,
    track_expiry: true,
    track_opened: false,
    opened_shelf_life_days: null,
    expiry_date: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
    memo: "小分け冷凍済み",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    item_procurement_channels: [
      {
        id: "demo-ch-2",
        item_id: "demo-4",
        channel_type: "online",
        provider_name: "生協コープ",
        url: null,
        unit_price: 580,
        is_default: true,
        created_at: new Date().toISOString(),
      },
    ],
    item_batches: [
      {
        id: "demo-batch-4a",
        item_id: "demo-4",
        quantity: 1,
        expiry_date: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
        opened_at: null,
        purchased_at: new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0],
        created_at: new Date().toISOString(),
      },
      {
        id: "demo-batch-4b",
        item_id: "demo-4",
        quantity: 1,
        expiry_date: new Date(Date.now() + 21 * 86400000).toISOString().split("T")[0],
        opened_at: null,
        purchased_at: new Date().toISOString().split("T")[0],
        created_at: new Date().toISOString(),
      },
    ],
  },
];

export function InventoryDashboard({ initialItems, user }: InventoryDashboardProps) {
  const [items, setItems] = useState<ItemWithDetails[]>(
    user ? initialItems : DEMO_ITEMS
  );
  const [selectedLocation, setSelectedLocation] = useState<LocationType | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [onlyAlerts, setOnlyAlerts] = useState(false);

  // ダイアログ状態
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemWithDetails | null>(null);
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [batchTargetItem, setBatchTargetItem] = useState<ItemWithDetails | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionTargetItem, setActionTargetItem] = useState<ItemWithDetails | null>(null);
  const [actionTargetBatch, setActionTargetBatch] = useState<ItemBatch | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);

  // 各保管場所ごとのアイテム数集計
  const locationCounts = useMemo(() => {
    const counts: Record<string, number> = { all: items.length };
    items.forEach((item) => {
      counts[item.location] = (counts[item.location] || 0) + 1;
    });
    return counts;
  }, [items]);

  // アラート件数
  const alertCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return items.filter((item) => {
      const isLow = Number(item.current_quantity) <= Number(item.min_quantity) && Number(item.min_quantity) > 0;
      let isExpiring = false;
      if (item.track_expiry ?? true) {
        const batches = item.item_batches || [];
        const earliest = item.expiry_date || batches[0]?.expiry_date;
        if (earliest) {
          const expiry = new Date(earliest);
          expiry.setHours(0, 0, 0, 0);
          const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays <= 3) isExpiring = true;
        }
      }

      let isOpenedExpired = false;
      if (item.track_opened && item.opened_shelf_life_days) {
        const openedBatch = (item.item_batches || []).find((b) => b.opened_at);
        if (openedBatch?.opened_at) {
          const opened = new Date(openedBatch.opened_at);
          opened.setHours(0, 0, 0, 0);
          const elapsed = Math.floor((today.getTime() - opened.getTime()) / (1000 * 60 * 60 * 24));
          if (elapsed >= item.opened_shelf_life_days - 7) isOpenedExpired = true;
        }
      }

      return isLow || isExpiring || isOpenedExpired;
    }).length;
  }, [items]);

  // フィルタリングされたアイテム
  const filteredItems = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return items.filter((item) => {
      if (selectedLocation !== "all" && item.location !== selectedLocation) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesCategory = item.category?.toLowerCase().includes(q);
        const matchesMemo = item.memo?.toLowerCase().includes(q);
        if (!matchesName && !matchesCategory && !matchesMemo) {
          return false;
        }
      }

      if (onlyAlerts) {
        const isLow = Number(item.current_quantity) <= Number(item.min_quantity) && Number(item.min_quantity) > 0;
        let isExpiring = false;
        if (item.track_expiry ?? true) {
          const batches = item.item_batches || [];
          const earliest = item.expiry_date || batches[0]?.expiry_date;
          if (earliest) {
            const expiry = new Date(earliest);
            expiry.setHours(0, 0, 0, 0);
            const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays <= 3) isExpiring = true;
          }
        }
        let isOpenedExpired = false;
        if (item.track_opened && item.opened_shelf_life_days) {
          const openedBatch = (item.item_batches || []).find((b) => b.opened_at);
          if (openedBatch?.opened_at) {
            const opened = new Date(openedBatch.opened_at);
            opened.setHours(0, 0, 0, 0);
            const elapsed = Math.floor((today.getTime() - opened.getTime()) / (1000 * 60 * 60 * 24));
            if (elapsed >= item.opened_shelf_life_days - 7) isOpenedExpired = true;
          }
        }
        if (!isLow && !isExpiring && !isOpenedExpired) {
          return false;
        }
      }

      return true;
    });
  }, [items, selectedLocation, searchQuery, onlyAlerts]);

  // 先入れ先出し（FIFO）数量増減ハンドラ（開封済み最優先 ➔ 古い期限/購入日順）
  const handleAdjustQuantity = async (id: string, delta: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const oldTotal = Number(item.current_quantity);
          const newQty = Math.max(0, Number((oldTotal + delta).toFixed(2)));
          let sortedBatches = sortBatchesForConsumption(item.item_batches || [], item.track_expiry);

          if (delta < 0) {
            let remain = Math.abs(delta);
            const nextBatches = [];
            for (const b of sortedBatches) {
              if (remain <= 0.001) {
                nextBatches.push(b);
              } else if (Number(b.quantity) <= remain + 0.001) {
                remain = Math.max(0, Number((remain - Number(b.quantity)).toFixed(2)));
              } else {
                nextBatches.push({ ...b, quantity: Number((Number(b.quantity) - remain).toFixed(2)) });
                remain = 0;
              }
            }
            sortedBatches = nextBatches;
          } else if (delta > 0) {
            if (sortedBatches.length > 0) {
              const lastIdx = sortedBatches.length - 1;
              sortedBatches[lastIdx] = {
                ...sortedBatches[lastIdx],
                quantity: Number((Number(sortedBatches[lastIdx].quantity) + delta).toFixed(2)),
              };
            }
          }

          const nextEarliest = item.track_expiry ? sortedBatches[0]?.expiry_date || null : null;
          return {
            ...item,
            current_quantity: newQty,
            expiry_date: nextEarliest,
            item_batches: sortedBatches,
          };
        }
        return item;
      })
    );

    if (user) {
      try {
        await adjustItemQuantity(id, delta);
      } catch (err) {
        console.error("Failed to adjust quantity on server:", err);
      }
    }
  };

  // 買い足し（新ロット追加）ハンドラ
  const handleAddBatch = async (itemId: string, input: BatchInput) => {
    if (!user) {
      setItems((prev) =>
        prev.map((item) => {
          if (item.id === itemId) {
            const newBatch = {
              id: `demo-batch-${Date.now()}`,
              item_id: itemId,
              quantity: input.quantity,
              expiry_date: item.track_expiry ? input.expiry_date || null : null,
              opened_at: input.opened_at || null,
              purchased_at: input.purchased_at || new Date().toISOString().split("T")[0],
              created_at: new Date().toISOString(),
            };
            const updatedBatches = sortBatchesForConsumption(
              [...(item.item_batches || []), newBatch],
              item.track_expiry
            );
            const newTotal = Number((Number(item.current_quantity) + input.quantity).toFixed(2));
            return {
              ...item,
              current_quantity: newTotal,
              expiry_date: item.track_expiry ? updatedBatches[0]?.expiry_date || null : null,
              item_batches: updatedBatches,
            };
          }
          return item;
        })
      );
      return;
    }

    const res = await addBatch(itemId, input);
    if (res.batch) {
      setItems((prev) =>
        prev.map((item) => {
          if (item.id === itemId) {
            const updatedBatches = sortBatchesForConsumption(
              [...(item.item_batches || []), res.batch],
              item.track_expiry
            );
            return {
              ...item,
              current_quantity: res.totalQuantity,
              expiry_date: item.track_expiry ? updatedBatches[0]?.expiry_date || null : null,
              item_batches: updatedBatches,
            };
          }
          return item;
        })
      );
    }
  };

  // ロット開封ハンドラ（数量>1の場合は1本分を分離して開封済みロットを作成）
  const handleOpenBatch = async (batchId: string, itemId: string) => {
    const todayStr = new Date().toISOString().split("T")[0];

    if (!user) {
      setItems((prev) =>
        prev.map((item) => {
          if (item.id === itemId) {
            const step = Number(item.consumption_step) || 1;
            const targetBatch = (item.item_batches || []).find((b) => b.id === batchId);
            if (!targetBatch) return item;

            const qtyToOpen = step >= 1 ? 1 : step;
            const currentQty = Number(targetBatch.quantity);

            let nextBatches = [];
            if (currentQty <= qtyToOpen + 0.001) {
              nextBatches = (item.item_batches || []).map((b) =>
                b.id === batchId ? { ...b, opened_at: todayStr } : b
              );
            } else {
              const remQty = Number((currentQty - qtyToOpen).toFixed(2));
              const updatedOriginal = { ...targetBatch, quantity: remQty };
              const newOpenedBatch = {
                id: `demo-batch-${Date.now()}`,
                item_id: itemId,
                quantity: qtyToOpen,
                expiry_date: targetBatch.expiry_date,
                opened_at: todayStr,
                purchased_at: targetBatch.purchased_at,
                created_at: new Date().toISOString(),
              };

              const modifiedBatches = (item.item_batches || []).map((b) =>
                b.id === batchId ? updatedOriginal : b
              );
              nextBatches = [newOpenedBatch, ...modifiedBatches];
            }

            const sorted = sortBatchesForConsumption(nextBatches, item.track_expiry);
            return { ...item, item_batches: sorted };
          }
          return item;
        })
      );
      return;
    }

    const res = await openBatch(batchId, itemId);
    if (res.split && res.openedBatch && res.remainingBatch) {
      setItems((prev) =>
        prev.map((item) => {
          if (item.id === itemId) {
            const nextBatches = (item.item_batches || []).map((b) =>
              b.id === batchId ? res.remainingBatch : b
            );
            const sorted = sortBatchesForConsumption(
              [res.openedBatch, ...nextBatches] as unknown as ItemBatch[],
              item.track_expiry
            );
            return {
              ...item,
              item_batches: sorted,
            };
          }
          return item;
        })
      );
    } else {
      setItems((prev) =>
        prev.map((item) => {
          if (item.id === itemId) {
            const updatedBatches = (item.item_batches || []).map((b) =>
              b.id === batchId ? { ...b, opened_at: todayStr } : b
            );
            const sorted = sortBatchesForConsumption(updatedBatches, item.track_expiry);
            return { ...item, item_batches: sorted };
          }
          return item;
        })
      );
    }
  };

  // ロット処理（使い切り・廃棄・誤登録取消）ハンドラ
  const handleBatchProcess = async (
    batchId: string,
    itemId: string,
    reason: BatchProcessReason
  ) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const remBatches = (item.item_batches || []).filter((b) => b.id !== batchId);
          const newTotal = Number(remBatches.reduce((s, b) => s + Number(b.quantity), 0).toFixed(2));
          return {
            ...item,
            current_quantity: newTotal,
            expiry_date: item.track_expiry ? remBatches[0]?.expiry_date || null : null,
            item_batches: remBatches,
          };
        }
        return item;
      })
    );

    if (user) {
      await deleteBatch(batchId, itemId, reason);
    }
  };

  // ロット削除ハンドラ（フォールバック用）
  const handleDeleteBatch = async (batchId: string, itemId: string) => {
    await handleBatchProcess(batchId, itemId, "consumption");
  };

  // アイテム（品目マスタ）登録・更新ハンドラ
  const handleFormSubmit = async (input: ItemInput, itemId?: string) => {
    if (!user) {
      if (itemId) {
        setItems((prev) =>
          prev.map((it) =>
            it.id === itemId
              ? {
                  ...it,
                  ...input,
                  consumption_step: input.consumption_step || 1,
                  package_quantity: input.package_quantity || 1,
                  track_expiry: input.track_expiry ?? true,
                  track_opened: input.track_opened ?? false,
                  opened_shelf_life_days: input.opened_shelf_life_days ?? null,
                  updated_at: new Date().toISOString(),
                }
              : it
          )
        );
      } else {
        const newItem: ItemWithDetails = {
          id: `demo-${Date.now()}`,
          household_id: "demo-household",
          name: input.name,
          category: input.category || "その他",
          location: input.location,
          current_quantity: 0,
          unit: input.unit,
          min_quantity: input.min_quantity || 0,
          consumption_step: input.consumption_step || 1,
          package_quantity: input.package_quantity || 1,
          track_expiry: input.track_expiry ?? true,
          track_opened: input.track_opened ?? false,
          opened_shelf_life_days: input.opened_shelf_life_days ?? null,
          expiry_date: null,
          memo: input.memo || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          item_procurement_channels: input.channel
            ? [
                {
                  id: `demo-ch-${Date.now()}`,
                  item_id: `demo-${Date.now()}`,
                  channel_type: input.channel.channel_type,
                  provider_name: input.channel.provider_name,
                  url: input.channel.url || null,
                  unit_price: input.channel.unit_price || null,
                  is_default: true,
                  created_at: new Date().toISOString(),
                },
              ]
            : [],
          item_batches: [],
        };
        setItems((prev) => [newItem, ...prev]);

        setBatchTargetItem(newItem);
        setBatchDialogOpen(true);
      }
      return;
    }

    if (itemId) {
      await updateItem(itemId, input);
      setItems((prev) =>
        prev.map((it) =>
          it.id === itemId
            ? {
                ...it,
                ...input,
                consumption_step: input.consumption_step || 1,
                package_quantity: input.package_quantity || 1,
                track_expiry: input.track_expiry ?? true,
                track_opened: input.track_opened ?? false,
                opened_shelf_life_days: input.opened_shelf_life_days ?? null,
                updated_at: new Date().toISOString(),
              }
            : it
        )
      );
    } else {
      const res = await createItem(input);
      if (res.item) {
        setItems((prev) => [res.item as ItemWithDetails, ...prev]);
        setBatchTargetItem(res.item as ItemWithDetails);
        setBatchDialogOpen(true);
      }
    }
  };

  // 削除ハンドラ
  const handleDelete = async (id: string) => {
    if (!confirm("この品目を削除しますか？関連するすべての在庫ロットも削除されます。")) return;
    setItems((prev) => prev.filter((it) => it.id !== id));
    if (user) {
      await deleteItem(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* 未ログイン時のデモバナー */}
      {!user && (
        <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-teal-500/10 p-4 sm:p-5 dark:border-emerald-500/20">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/30">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                  <span>卵の「1パック10個購入・1個消費」＆ パック単位管理体験中</span>
                  <Badge variant="default" className="text-[10px]">
                    Demo
                  </Badge>
                </h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-0.5">
                  卵のように「購入は1パック(10個)だが消費は1個ずつ」行う品目も、自然な個数管理とワンタップのパック買い足しができます。
                </p>
              </div>
            </div>
            <Button
              onClick={() => setLoginOpen(true)}
              size="sm"
              className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 font-semibold"
            >
              ログインして始める
            </Button>
          </div>
        </div>
      )}

      {/* Control Bar: Search & Action buttons */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="品目名やカテゴリ、調達先を検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 bg-white pl-10 pr-4 py-2.5 text-xs sm:text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100 shadow-sm"
          />
        </div>

        {/* Action Filters & Add Button */}
        <div className="flex items-center gap-2">
          {alertCount > 0 && (
            <button
              onClick={() => setOnlyAlerts(!onlyAlerts)}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all border ${
                onlyAlerts
                  ? "border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200"
                  : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              <span>要確認 ({alertCount})</span>
            </button>
          )}

          <Button
            onClick={() => {
              setEditingItem(null);
              setFormOpen(true);
            }}
            className="gap-2 shadow-md shadow-emerald-600/20 bg-emerald-600 hover:bg-emerald-700 font-semibold"
          >
            <Plus className="h-4 w-4" />
            <span>品目を追加</span>
          </Button>
        </div>
      </div>

      {/* Location Tabs */}
      <LocationTabs
        currentLocation={selectedLocation}
        onChange={setSelectedLocation}
        counts={locationCounts}
      />

      {/* Item Grid */}
      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onAdjustQuantity={handleAdjustQuantity}
              onEdit={(it) => {
                setEditingItem(it);
                setFormOpen(true);
              }}
              onDelete={handleDelete}
              onOpenAddBatch={(it) => {
                setBatchTargetItem(it);
                setBatchDialogOpen(true);
              }}
              onDeleteBatch={handleDeleteBatch}
              onOpenBatch={handleOpenBatch}
              onOpenBatchAction={(it, b) => {
                setActionTargetItem(it);
                setActionTargetBatch(b);
                setActionDialogOpen(true);
              }}
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-neutral-300 bg-neutral-50/50 p-12 text-center dark:border-neutral-800 dark:bg-neutral-900/40">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500">
            <PackageOpen className="h-7 w-7" />
          </div>
          <h3 className="mt-4 text-base font-bold text-neutral-800 dark:text-neutral-200">
            品目が見つかりません
          </h3>
          <p className="mt-1 max-w-sm text-xs text-neutral-500 dark:text-neutral-400">
            {searchQuery || onlyAlerts
              ? "検索条件に一致する品目がありません。"
              : "この保管場所にはまだ品目が登録されていません。右上の「品目を追加」から登録してみましょう。"}
          </p>
          <Button
            onClick={() => {
              setEditingItem(null);
              setFormOpen(true);
            }}
            size="sm"
            className="mt-5 gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>新しい品目を登録</span>
          </Button>
        </div>
      )}

      {/* Add / Edit Item Master Dialog */}
      <ItemFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editingItem={editingItem}
        onSubmit={handleFormSubmit}
      />

      {/* Add Batch (買い足し/ロット追加) Dialog */}
      <BatchAddDialog
        open={batchDialogOpen}
        onOpenChange={setBatchDialogOpen}
        item={batchTargetItem}
        onSubmit={handleAddBatch}
      />

      {/* Process Batch (使い切り・廃棄・誤登録取消) Dialog */}
      <BatchActionDialog
        open={actionDialogOpen}
        onOpenChange={setActionDialogOpen}
        item={actionTargetItem}
        batch={actionTargetBatch}
        onProcess={handleBatchProcess}
      />

      {/* AI Concierge (自然言語・音声対話 & 在庫操作執事) */}
      <AiConciergeSheet items={items} onOptimisticAdjust={handleAdjustQuantity} />

      {/* Login Dialog */}
      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
    </div>
  );
}
