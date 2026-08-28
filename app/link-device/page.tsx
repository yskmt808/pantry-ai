"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import {
  getDeviceLinkSessionInfo,
  authorizeDeviceLink,
} from "@/app/actions/device-auth";
import {
  Tablet,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  ArrowRight,
  LogIn,
} from "lucide-react";

function LinkDeviceContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = searchParams.get("code");

  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [sessionData, setSessionData] = useState<{
    deviceName: string;
    userCode: string;
    expiresAt: string;
    isExpired: boolean;
    status: string;
  } | null>(null);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [householdName, setHouseholdName] = useState<string>("我が家のパントリー");
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!code) {
        setErrorMsg("無効なQRコードリンクです。");
        setLoading(false);
        return;
      }

      const supabase = createClient();
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      setUser(authUser);

      const res = await getDeviceLinkSessionInfo(code);
      if (res.success && res.data) {
        setSessionData(res.data);
      } else {
        setErrorMsg(res.error || "セッションが見つかりません。");
      }
      setLoading(false);
    }
    load();
  }, [code]);

  // Google ログイン処理
  const handleGoogleLogin = async () => {
    const supabase = createClient();
    const origin = window.location.origin;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(`/link-device?code=${code}`)}`,
      },
    });
  };

  // 連携の承認
  const handleApprove = async () => {
    if (!code) return;
    try {
      setApproving(true);
      setErrorMsg(null);
      const res = await authorizeDeviceLink(code);
      if (res.success) {
        setHouseholdName(res.householdName || "我が家のパントリー");
        setIsSuccess(true);
      } else {
        setErrorMsg(res.error || "承認に失敗しました。");
      }
    } catch {
      setErrorMsg("通信エラーが発生しました。");
    } finally {
      setApproving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <RefreshCw className="h-8 w-8 animate-spin text-emerald-600 mb-3" />
        <p className="text-sm text-neutral-500">端末情報を取得しています...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-6 sm:p-8 shadow-xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 mb-1">
            <Tablet className="h-6 w-6" />
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-neutral-100">
            共有端末の連携リクエスト
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            冷蔵庫のiPadなど、家族の共有端末と pantry-ai を連携します。
          </p>
        </div>

        {/* Error State */}
        {errorMsg && (
          <div className="rounded-2xl bg-rose-50 p-4 text-xs text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">エラーが発生しました</p>
              <p className="mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Success State */}
        {isSuccess ? (
          <div className="text-center space-y-4 py-4 animate-in fade-in zoom-in">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                連携を承認しました！
              </h2>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                「{householdName}」の在庫データが共有端末に同期されました。
              </p>
              <p className="text-[11px] text-neutral-400 pt-2">
                共有端末側の画面が自動的に切り替わります。この画面は閉じて構いません。
              </p>
            </div>
            <Button
              onClick={() => router.push("/")}
              className="w-full rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-900"
            >
              スマホのパントリーへ戻る
            </Button>
          </div>
        ) : (
          /* Normal State */
          sessionData && (
            <div className="space-y-4">
              {/* Target Device Card */}
              <div className="rounded-2xl border border-neutral-200/80 bg-neutral-50/70 p-4 dark:border-neutral-800 dark:bg-neutral-800/40 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-500">連携する端末:</span>
                  <span className="font-bold text-neutral-900 dark:text-neutral-100">
                    {sessionData.deviceName}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-500">画面の確認コード:</span>
                  <span className="font-mono font-bold bg-neutral-200 dark:bg-neutral-700 px-2 py-0.5 rounded text-neutral-900 dark:text-neutral-100">
                    {sessionData.userCode}
                  </span>
                </div>
              </div>

              {/* User Logged in / Guest Check */}
              {!user ? (
                /* Prompt to login with Google */
                <div className="space-y-3 pt-2">
                  <div className="rounded-xl bg-blue-50 p-3 text-xs text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 flex items-start gap-2">
                    <LogIn className="h-4 w-4 shrink-0 mt-0.5 text-blue-600" />
                    <p>
                      共有端末に世帯データを連携するため、まずあなたの Google アカウントでログインしてください。
                    </p>
                  </div>
                  <Button
                    onClick={handleGoogleLogin}
                    className="w-full flex items-center justify-center gap-2 py-6 text-sm font-semibold rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900"
                  >
                    <span>Google でログインして連携を続ける</span>
                  </Button>
                </div>
              ) : (
                /* Logged in, Approve Button */
                <div className="space-y-3 pt-2">
                  <div className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-start gap-2">
                    <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
                    <div>
                      <p className="font-semibold">安全な世帯セッション連携</p>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                        あなたの個人パスワードは共有端末には送信されず、世帯の在庫閲覧・操作権限のみが安全に付与されます。
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={handleApprove}
                    disabled={approving || sessionData.isExpired}
                    className="w-full py-6 text-sm font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 gap-2"
                  >
                    {approving ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        <span>この端末の連携を承認する</span>
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )
        )}

        <div className="text-center">
          <span className="text-[11px] text-neutral-400">pantry-ai Cross-Device Device Flow</span>
        </div>
      </div>
    </div>
  );
}

export default function LinkDevicePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      }
    >
      <LinkDeviceContent />
    </Suspense>
  );
}
