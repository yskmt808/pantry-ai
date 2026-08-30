"use client";

import { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getHouseholdInfo,
  updateHouseholdName,
  type HouseholdDetail,
} from "@/app/actions/household";
import {
  Home,
  Copy,
  Check,
  Edit2,
  Save,
  Users,
  Tablet,
  Info,
  GitBranch,
  Calendar,
  Sparkles,
} from "lucide-react";

interface HouseholdSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSharedDevice?: boolean;
}

export function HouseholdSettingsDialog({
  open,
  onOpenChange,
  isSharedDevice = false,
}: HouseholdSettingsDialogProps) {
  const [household, setHousehold] = useState<HouseholdDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchInfo = async () => {
    try {
      setLoading(true);
      const data = await getHouseholdInfo();
      if (data) {
        setHousehold(data);
        setNewName(data.name);
      }
    } catch (err) {
      console.error("Failed to fetch household info:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchInfo();
      setMsg(null);
      setEditingName(false);
    }
  }, [open]);

  const handleCopyId = async () => {
    if (!household?.id) return;
    try {
      await navigator.clipboard.writeText(household.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard fallback
    }
  };

  const handleSaveName = async () => {
    if (!newName.trim()) return;
    try {
      setSaving(true);
      setMsg(null);
      const res = await updateHouseholdName(newName);
      if (res.success) {
        setMsg({ type: "success", text: "世帯名を更新しました" });
        setEditingName(false);
        if (household) {
          setHousehold({ ...household, name: newName.trim() });
        }
      } else {
        setMsg({ type: "error", text: res.error || "更新に失敗しました" });
      }
    } catch (err) {
      setMsg({ type: "error", text: "世帯名の更新中にエラーが発生しました" });
    } finally {
      setSaving(false);
    }
  };

  const buildVersion = process.env.NEXT_PUBLIC_BUILD_VERSION || "dev-local";
  const buildTime = process.env.NEXT_PUBLIC_BUILD_TIME || new Date().toLocaleString("ja-JP");

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="⚙️ 世帯設定 & アプリ情報"
      description="世帯情報の確認・変更およびビルドバージョン情報"
    >
      <div className="space-y-4 pt-1 text-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent mb-2" />
            <p className="text-xs text-neutral-500">世帯情報を取得しています...</p>
          </div>
        ) : !household ? (
          <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800 p-4 text-center text-xs text-neutral-500">
            世帯情報が見つかりませんでした。ログインまたは共有端末の連携を行ってください。
          </div>
        ) : (
          <>
            {msg && (
              <div
                className={`rounded-xl p-2.5 text-xs ${
                  msg.type === "success"
                    ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
                }`}
              >
                {msg.text}
              </div>
            )}

            {/* 1. 世帯名 */}
            <div className="rounded-2xl border border-neutral-200/80 bg-neutral-50/50 p-3.5 dark:border-neutral-800 dark:bg-neutral-800/40 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-700 dark:text-neutral-300">
                  <Home className="h-3.5 w-3.5 text-emerald-600" />
                  <span>世帯名</span>
                </div>
                {!editingName && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingName(true)}
                    className="h-7 px-2 text-xs gap-1 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
                  >
                    <Edit2 className="h-3 w-3" />
                    <span>変更</span>
                  </Button>
                )}
              </div>

              {editingName ? (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="flex-1 rounded-xl border border-neutral-300 bg-white px-3 py-1.5 text-sm font-semibold text-neutral-900 focus:border-emerald-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                    placeholder="例: 山田家のパントリー"
                    autoFocus
                  />
                  <Button
                    size="sm"
                    onClick={handleSaveName}
                    disabled={saving}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>保存</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingName(false);
                      setNewName(household.name);
                    }}
                  >
                    キャンセル
                  </Button>
                </div>
              ) : (
                <p className="text-base font-extrabold text-neutral-900 dark:text-neutral-100">
                  {household.name}
                </p>
              )}
            </div>

            {/* 2. 世帯ID (UUID) */}
            <div className="rounded-2xl border border-neutral-200/80 bg-neutral-50/50 p-3.5 dark:border-neutral-800 dark:bg-neutral-800/40 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                  世帯ID（Household ID）
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyId}
                  className="h-7 px-2.5 text-xs gap-1.5 border-neutral-300 dark:border-neutral-700"
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-600" />
                      <span className="text-emerald-600 font-semibold">コピー完了</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 text-neutral-500" />
                      <span>IDをコピー</span>
                    </>
                  )}
                </Button>
              </div>
              <div className="rounded-lg bg-white dark:bg-neutral-900 p-2 font-mono text-[11px] text-neutral-600 dark:text-neutral-400 break-all select-all border border-neutral-200/60 dark:border-neutral-800">
                {household.id}
              </div>
              <p className="text-[10px] text-neutral-400">
                スマホや共有端末でこの世帯IDが一致していることで、リアルタイムに在庫が同期されます。
              </p>
            </div>

            {/* 3. 連携ステータス */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl border border-neutral-200/80 bg-neutral-50/50 p-2.5 dark:border-neutral-800 dark:bg-neutral-800/40">
                <div className="flex items-center gap-1.5 text-neutral-500 mb-1">
                  <Users className="h-3.5 w-3.5" />
                  <span>家族メンバー</span>
                </div>
                <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  {household.memberCount} 人
                </p>
              </div>
              <div className="rounded-xl border border-neutral-200/80 bg-neutral-50/50 p-2.5 dark:border-neutral-800 dark:bg-neutral-800/40">
                <div className="flex items-center gap-1.5 text-neutral-500 mb-1">
                  <Tablet className="h-3.5 w-3.5" />
                  <span>連携中の共有端末</span>
                </div>
                <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  {isSharedDevice ? "この端末が連携中" : `${household.activeDeviceCount} 台`}
                </p>
              </div>
            </div>
          </>
        )}

        {/* 4. ビルド番号 & ビルド日時 */}
        <div className="border-t border-neutral-200 dark:border-neutral-800 pt-3 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-600 dark:text-neutral-400">
            <Info className="h-3.5 w-3.5 text-neutral-500" />
            <span>アプリケーション・ビルド情報</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] text-neutral-600 dark:text-neutral-400 bg-neutral-100/60 dark:bg-neutral-800/60 p-2.5 rounded-xl">
            <div className="flex items-center gap-1.5">
              <GitBranch className="h-3 w-3 text-neutral-400 shrink-0" />
              <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200">
                v{buildVersion}
              </span>
            </div>
            <div className="flex items-center gap-1.5 justify-end">
              <Calendar className="h-3 w-3 text-neutral-400 shrink-0" />
              <span className="font-mono text-[10px] truncate">{buildTime}</span>
            </div>
          </div>
        </div>

        <div className="pt-1 flex justify-end">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            閉じる
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
