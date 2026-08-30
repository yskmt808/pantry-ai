"use client";

import { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import {
  initiateDeviceLink,
  checkDeviceLinkStatus,
  consumeDeviceLink,
  type DeviceLinkSessionInfo,
} from "@/app/actions/device-auth";
import {
  Tablet,
  Smartphone,
  CheckCircle2,
  RefreshCw,
  Clock,
  ArrowRight,
} from "lucide-react";

interface SharedDeviceLoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoginSuccess?: () => void;
}

export function SharedDeviceLoginDialog({
  open,
  onOpenChange,
  onLoginSuccess,
}: SharedDeviceLoginDialogProps) {
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<DeviceLinkSessionInfo | null>(null);
  const [status, setStatus] = useState<"loading" | "pending" | "approved" | "consumed" | "expired">("loading");
  const [householdName, setHouseholdName] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState<number>(300);

  // セッション発行
  const startSession = async () => {
    try {
      setLoading(true);
      setStatus("loading");
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const timeoutPromise = new Promise<{ success: false; error: string }>((_, reject) =>
        setTimeout(() => reject(new Error("タイムアウト")), 8000)
      );

      const res = await Promise.race([
        initiateDeviceLink("冷蔵庫の共有端末", origin),
        timeoutPromise,
      ]);

      if (res.success && res.data) {
        setSession(res.data);
        setStatus("pending");
        setTimeLeft(300);
      } else {
        setStatus("expired");
      }
    } catch (err) {
      console.error("Failed to start session:", err);
      setStatus("expired");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      startSession();
    } else {
      setSession(null);
      setStatus("loading");
    }
  }, [open]);

  // ポーリング & カウントダウン
  useEffect(() => {
    if (!open || !session || status !== "pending") return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setStatus("expired");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const pollInterval = setInterval(async () => {
      const res = await checkDeviceLinkStatus(session.deviceCode);
      if (res.status === "approved") {
        setStatus("approved");
        setHouseholdName(res.householdName || "我が家のパントリー");
        await consumeDeviceLink(session.deviceCode);
        setTimeout(() => {
          setStatus("consumed");
          if (onLoginSuccess) onLoginSuccess();
          setTimeout(() => {
            window.location.reload();
          }, 1200);
        }, 1500);
      } else if (res.status === "expired") {
        setStatus("expired");
      }
    }, 2500);

    return () => {
      clearInterval(timer);
      clearInterval(pollInterval);
    };
  }, [open, session, status, onLoginSuccess]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeFormatted = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="📱 共有端末の連携ログイン"
      description="個人のスマホでQRコードを読み取るだけで連携できます"
    >
      <div className="space-y-3 pt-1">
        {/* Status: Loading */}
        {status === "loading" && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <RefreshCw className="h-7 w-7 animate-spin text-emerald-600 dark:text-emerald-400 mb-2" />
            <p className="text-xs text-neutral-500">QRコードを発行しています...</p>
          </div>
        )}

        {/* Status: Pending (コンパクトなスマート2カラムレイアウト) */}
        {status === "pending" && session && (
          <div className="flex flex-col sm:flex-row items-center gap-4 py-1">
            {/* 左側: QRコード */}
            <div className="p-2.5 rounded-2xl bg-white shadow-sm border border-neutral-200/80 dark:border-neutral-700 dark:bg-white flex flex-col items-center shrink-0">
              <QRCodeSVG
                value={session.linkUrl}
                size={135}
                level="M"
                includeMargin={false}
                className="rounded-lg"
              />
              <div className="mt-1.5 flex items-center gap-1 text-[10px] font-bold text-neutral-700 tracking-wider">
                <span>確認コード:</span>
                <span className="bg-neutral-100 text-neutral-900 px-1.5 py-0.5 rounded font-mono text-[11px] border border-neutral-300">
                  {session.userCode}
                </span>
              </div>
            </div>

            {/* 右側: ガイダンス & 待機ステータス */}
            <div className="flex-1 space-y-2.5 text-left w-full">
              {/* フロー案内 */}
              <div className="flex items-center gap-2 text-[10px] text-neutral-600 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-800/60 px-2.5 py-1 rounded-full w-fit">
                <Tablet className="h-3 w-3 text-emerald-600" />
                <span>この端末</span>
                <ArrowRight className="h-2.5 w-2.5 text-neutral-400" />
                <Smartphone className="h-3 w-3 text-blue-600" />
                <span>スマホ</span>
              </div>

              <div>
                <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                  スマホのカメラでQRをスキャン
                </p>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 leading-tight">
                  Googleパスワード入力不要で、この端末に世帯の在庫を安全に同期します。
                </p>
              </div>

              {/* カウントダウン & 待機バナー */}
              <div className="flex items-center justify-between rounded-xl bg-emerald-50/80 px-2.5 py-1.5 text-[10px] text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-500/20">
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-ping" />
                  <span className="font-semibold">承認待機中...</span>
                </div>
                <div className="flex items-center gap-1 text-emerald-600 font-mono">
                  <Clock className="h-3 w-3" />
                  <span>{timeFormatted}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Status: Approved / Consumed */}
        {(status === "approved" || status === "consumed") && (
          <div className="flex flex-col items-center justify-center py-6 text-center space-y-2 animate-in fade-in zoom-in duration-300">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 shadow-md">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                🎉 端末の連携が完了しました！
              </h3>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                「{householdName}」に接続しました
              </p>
            </div>
          </div>
        )}

        {/* Status: Expired */}
        {status === "expired" && (
          <div className="flex flex-col items-center justify-center py-6 text-center space-y-2">
            <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
              有効期限が切れました
            </p>
            <Button size="sm" onClick={startSession} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" />
              <span>QRコードを再発行</span>
            </Button>
          </div>
        )}

        <div className="pt-1 flex justify-end">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            閉じる
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
