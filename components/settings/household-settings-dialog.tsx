"use client";

import { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QRCodeSVG } from "qrcode.react";
import {
  getHouseholdInfo,
  updateHouseholdName,
  joinHousehold,
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
  UserPlus,
  Link,
  ArrowRightLeft,
  UserCheck,
  QrCode,
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
  const [copiedId, setCopiedId] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [origin, setOrigin] = useState("");

  // 別の世帯への参加用ステート
  const [showJoinSection, setShowJoinSection] = useState(false);
  const [targetJoinId, setTargetJoinId] = useState("");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

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
      setShowJoinSection(false);
      setTargetJoinId("");
    }
  }, [open]);

  const inviteUrl = household ? `${origin}/?join=${household.id}` : "";

  const handleCopyId = async () => {
    if (!household?.id) return;
    try {
      await navigator.clipboard.writeText(household.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } catch {
      // clipboard fallback
    }
  };

  const handleCopyInviteLink = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
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
    } catch {
      setMsg({ type: "error", text: "世帯名の更新中にエラーが発生しました" });
    } finally {
      setSaving(false);
    }
  };

  const handleJoinHousehold = async () => {
    if (!targetJoinId.trim()) return;
    try {
      setJoining(true);
      setMsg(null);
      const res = await joinHousehold(targetJoinId.trim());
      if (res.success) {
        setMsg({ type: "success", text: `「${res.householdName}」に参加しました！画面を更新します...` });
        setTimeout(() => {
          window.location.href = "/";
        }, 1200);
      } else {
        setMsg({ type: "error", text: res.error || "世帯への参加に失敗しました" });
        setJoining(false);
      }
    } catch {
      setMsg({ type: "error", text: "世帯参加処理中にエラーが発生しました" });
      setJoining(false);
    }
  };

  const buildVersion = process.env.NEXT_PUBLIC_BUILD_VERSION || "dev-local";
  const buildTime = process.env.NEXT_PUBLIC_BUILD_TIME || new Date().toLocaleString("ja-JP");

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="⚙️ 世帯設定 & メンバー招待"
      description="家族メンバーの招待・世帯名設定・アプリ情報"
    >
      <div className="space-y-4 pt-1 text-sm max-h-[80vh] overflow-y-auto pr-1">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent mb-2" />
            <p className="text-xs text-neutral-500">世帯情報を取得しています...</p>
          </div>
        ) : !household ? (
          <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800 p-4 text-center text-xs text-neutral-500">
            世帯情報が見つかりませんでした。Googleログインまたは共有端末の連携を行ってください。
          </div>
        ) : (
          <>
            {msg && (
              <div
                className={`rounded-xl p-3 text-xs font-semibold ${
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

            {/* 2. 家族メンバーを招待するセクション (QRコード & リンク共有) */}
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 dark:border-emerald-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  <QrCode className="h-4 w-4 text-emerald-600" />
                  <span>家族メンバーをQRコードで招待・追加</span>
                </div>
                {isSharedDevice && (
                  <Badge variant="default" className="text-[10px] bg-emerald-600">
                    共有端末で表示中
                  </Badge>
                )}
              </div>

              {/* QRコードとガイダンスの2カラム */}
              <div className="flex flex-col sm:flex-row items-center gap-3.5">
                {/* 左側: 世帯参加 QRコード */}
                {inviteUrl && (
                  <div className="p-2 rounded-2xl bg-white shadow-sm border border-emerald-500/20 flex flex-col items-center shrink-0">
                    <QRCodeSVG
                      value={inviteUrl}
                      size={120}
                      level="M"
                      includeMargin={false}
                      className="rounded-lg"
                    />
                    <span className="mt-1 text-[9px] font-bold text-neutral-500">
                      スマホのカメラでスキャン
                    </span>
                  </div>
                )}

                {/* 右側: ガイダンスと共有ボタン */}
                <div className="flex-1 space-y-2 text-left w-full">
                  <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-snug">
                    ご家族のスマホで上のQRコードを読み取るか、招待リンクを開いてGoogleログインすると、この世帯のパントリーに自動合流できます。
                  </p>

                  <div className="flex flex-col gap-1.5 pt-0.5">
                    <Button
                      onClick={handleCopyInviteLink}
                      size="sm"
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs font-semibold shadow-sm h-8"
                    >
                      {copiedLink ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          <span>招待リンクをコピーしました</span>
                        </>
                      ) : (
                        <>
                          <Link className="h-3.5 w-3.5" />
                          <span>招待リンクをコピー (LINE等で送る)</span>
                        </>
                      )}
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyId}
                      className="w-full border-neutral-300 dark:border-neutral-700 gap-1.5 text-xs h-7"
                    >
                      {copiedId ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-600" />
                          <span>世帯IDコピー完了</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3 text-neutral-500" />
                          <span>世帯IDのみをコピー</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-white/80 dark:bg-neutral-900/80 p-2 font-mono text-[10px] text-neutral-600 dark:text-neutral-400 break-all select-all border border-emerald-500/20">
                世帯ID: {household.id}
              </div>
            </div>

            {/* 3. 参加中の家族メンバー一覧 */}
            <div className="rounded-2xl border border-neutral-200/80 bg-neutral-50/50 p-3.5 dark:border-neutral-800 dark:bg-neutral-800/40 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-700 dark:text-neutral-300">
                  <Users className="h-3.5 w-3.5 text-emerald-600" />
                  <span>参加中の家族メンバー ({household.members.length}人)</span>
                </div>
                <Badge variant="secondary" className="text-[10px]">
                  共有端末: {isSharedDevice ? "1台接続中" : `${household.activeDeviceCount}台`}
                </Badge>
              </div>

              <div className="divide-y divide-neutral-200/60 dark:divide-neutral-700/60">
                {household.members.map((m) => (
                  <div key={m.id} className="flex items-center justify-between py-2 first:pt-1 last:pb-1">
                    <div className="flex items-center gap-2">
                      {m.avatarUrl ? (
                        <img
                          src={m.avatarUrl}
                          alt={m.fullName || "メンバー"}
                          className="h-7 w-7 rounded-full object-cover border border-neutral-200"
                        />
                      ) : (
                        <div className="h-7 w-7 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-xs font-bold">
                          {(m.fullName || "U").charAt(0)}
                        </div>
                      )}
                      <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                        {m.fullName || "家族メンバー"}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {m.role === "owner" ? "管理者" : "メンバー"}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. 別の世帯に参加・合流するセクション */}
            {!isSharedDevice && (
              <div className="rounded-2xl border border-neutral-200/80 bg-neutral-50/50 p-3.5 dark:border-neutral-800 dark:bg-neutral-800/40 space-y-2">
                <button
                  onClick={() => setShowJoinSection(!showJoinSection)}
                  className="flex w-full items-center justify-between text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <ArrowRightLeft className="h-3.5 w-3.5 text-blue-600" />
                    <span>別の世帯に参加・合流する</span>
                  </span>
                  <span className="text-[10px] text-neutral-400 font-normal">
                    {showJoinSection ? "閉じる" : "開く"}
                  </span>
                </button>

                {showJoinSection && (
                  <div className="pt-2 space-y-2 animate-in fade-in duration-150">
                    <p className="text-[11px] text-neutral-500">
                      ご家族から共有された「世帯ID」を入力して「参加する」を押すと、その世帯のパントリーに合流できます。
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={targetJoinId}
                        onChange={(e) => setTargetJoinId(e.target.value)}
                        placeholder="家族の世帯ID (UUID) を入力..."
                        className="flex-1 rounded-xl border border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-900 font-mono focus:border-emerald-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                      />
                      <Button
                        size="sm"
                        onClick={handleJoinHousehold}
                        disabled={joining || !targetJoinId.trim()}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1 font-semibold"
                      >
                        <UserCheck className="h-3.5 w-3.5" />
                        <span>参加する</span>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* 5. ビルド番号 & ビルド日時 */}
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
