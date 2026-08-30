"use client";

import { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { createClient } from "@/lib/supabase/client";
import {
  initiateDeviceLink,
  checkDeviceLinkStatus,
  consumeDeviceLink,
  type DeviceLinkSessionInfo,
} from "@/app/actions/device-auth";
import {
  LogIn,
  Sparkles,
  ShieldCheck,
  QrCode,
  Tablet,
  Smartphone,
  CheckCircle2,
  RefreshCw,
  Clock,
  ArrowRight,
  ChevronLeft,
} from "lucide-react";

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function generateLocalCodes() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let userCode = "";
  for (let i = 0; i < 4; i++) {
    userCode += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const tokenChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_";
  let deviceCode = "";
  for (let i = 0; i < 32; i++) {
    deviceCode += tokenChars.charAt(Math.floor(Math.random() * tokenChars.length));
  }
  return { userCode, deviceCode };
}

export function LoginDialog({ open, onOpenChange }: LoginDialogProps) {
  const [mode, setMode] = useState<"select" | "qr">("select");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // QR 連携セッション用ステート
  const [session, setSession] = useState<DeviceLinkSessionInfo | null>(null);
  const [qrStatus, setQrStatus] = useState<"pending" | "approved" | "consumed" | "expired">("pending");
  const [householdName, setHouseholdName] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState<number>(300);

  // ダイアログが開閉されたとき初期化
  useEffect(() => {
    if (!open) {
      setMode("select");
      setErrorMsg(null);
      setSession(null);
      setLoading(false);
    }
  }, [open]);

  // QR モード開始処理
  const startQrSession = async () => {
    setMode("qr");
    setErrorMsg(null);
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const { userCode, deviceCode } = generateLocalCodes();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const linkUrl = `${origin}/link-device?code=${deviceCode}`;

    const initialInfo: DeviceLinkSessionInfo = {
      deviceCode,
      userCode,
      deviceName: "冷蔵庫の共有端末",
      status: "pending",
      expiresAt,
      linkUrl,
    };

    setSession(initialInfo);
    setQrStatus("pending");
    setTimeLeft(300);

    try {
      const res = await initiateDeviceLink("冷蔵庫の共有端末", origin);
      if (res.success && res.data) {
        setSession(res.data);
      }
    } catch {
      // ignore
    }
  };

  // QR ポーリング & カウントダウン
  useEffect(() => {
    if (!open || mode !== "qr" || !session || qrStatus !== "pending") return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setQrStatus("expired");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const pollInterval = setInterval(async () => {
      try {
        const res = await checkDeviceLinkStatus(session.deviceCode);
        if (res.status === "approved") {
          setQrStatus("approved");
          setHouseholdName(res.householdName || "我が家のパントリー");
          await consumeDeviceLink(session.deviceCode);
          setTimeout(() => {
            setQrStatus("consumed");
            setTimeout(() => {
              window.location.reload();
            }, 800);
          }, 1200);
        } else if (res.status === "expired") {
          setQrStatus("expired");
        }
      } catch {
        // ignore polling error
      }
    }, 2000);

    return () => {
      clearInterval(timer);
      clearInterval(pollInterval);
    };
  }, [open, mode, session, qrStatus]);

  // Google ログイン処理
  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const supabase = createClient();
      const origin = window.location.origin;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback`,
        },
      });

      if (error) {
        setErrorMsg(error.message);
        setLoading(false);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "ログイン処理に失敗しました");
      setLoading(false);
    }
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeFormatted = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="md"
      title={mode === "qr" ? "📱 共有端末の連携ログイン" : "pantry-ai にログイン"}
      description={
        mode === "qr"
          ? "個人のスマホでQRコードを読み取るだけで連携できます"
          : "家族で冷蔵庫の在庫を共有・AI献立提案を利用できます"
      }
    >
      <div className="space-y-3.5 pt-1">
        {mode === "select" ? (
          /* Mode 1: ログイン方法選択画面 */
          <>
            <div className="rounded-xl bg-emerald-50/70 p-3 text-xs text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-start gap-2.5">
              <Sparkles className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
              <div className="text-[11px] leading-relaxed">
                <span className="font-bold">Google アカウントで簡単スタート</span>
                <p className="mt-0.5 text-emerald-700/90 dark:text-emerald-400/90">
                  世帯メンバー間での在庫リアルタイム同期や AI 機能が利用可能になります。
                </p>
              </div>
            </div>

            {errorMsg && (
              <div className="rounded-lg bg-rose-50 p-2.5 text-xs text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
                {errorMsg}
              </div>
            )}

            {/* 1. Google ログイン (個人スマホ向け) */}
            <Button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 py-3 text-sm font-semibold rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 shadow-md"
            >
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <>
                  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Google でログイン（個人スマホ）</span>
                </>
              )}
            </Button>

            {/* 区切り線 */}
            <div className="relative flex items-center justify-center my-1">
              <div className="border-t border-neutral-200 dark:border-neutral-800 w-full" />
              <span className="bg-white dark:bg-neutral-900 px-3 text-[10px] text-neutral-400 shrink-0">
                または
              </span>
            </div>

            {/* 2. 共有端末（冷蔵庫iPad）向け QR 連携ボタン */}
            <button
              onClick={startQrSession}
              className="w-full flex items-center justify-between p-3 rounded-xl border border-emerald-300/80 bg-emerald-50/50 hover:bg-emerald-100/60 dark:border-emerald-800 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/60 transition-all text-left group"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm group-hover:scale-105 transition-transform shrink-0">
                  <QrCode className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
                    <Tablet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>冷蔵庫のiPadなど共有端末としてログイン</span>
                  </div>
                  <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">
                    スマホでQRを読み取って簡単連携（文字入力不要）
                  </p>
                </div>
              </div>
            </button>

            <div className="flex items-center justify-center gap-1.5 text-[10px] text-neutral-400 pt-0.5">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Supabase Auth による安全なセッション管理</span>
            </div>
          </>
        ) : (
          /* Mode 2: 共有端末 QR コード連携画面 (同一ダイアログ内) */
          <div className="space-y-3">
            {/* 戻るボタン */}
            <button
              onClick={() => setMode("select")}
              className="inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors mb-1"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>戻る</span>
            </button>

            {/* QR 状態: Pending (即時描画) */}
            {qrStatus === "pending" && session && (
              <div className="flex flex-col sm:flex-row items-center gap-4 py-1">
                {/* 左側: QRコード */}
                <div className="p-2.5 rounded-2xl bg-white shadow-sm border border-neutral-200/80 dark:border-neutral-700 dark:bg-white flex flex-col items-center shrink-0">
                  <QRCodeSVG
                    value={session.linkUrl}
                    size={130}
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

            {/* QR 状態: Approved / Consumed */}
            {(qrStatus === "approved" || qrStatus === "consumed") && (
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

            {/* QR 状態: Expired */}
            {qrStatus === "expired" && (
              <div className="flex flex-col items-center justify-center py-6 text-center space-y-2">
                <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                  有効期限が切れました
                </p>
                <Button size="sm" onClick={startQrSession} className="gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>QRコードを再発行</span>
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
}
