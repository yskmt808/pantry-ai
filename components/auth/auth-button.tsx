"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoginDialog } from "./login-dialog";
import { createClient } from "@/lib/supabase/client";
import { logoutSharedDevice } from "@/app/actions/device-auth";
import { LogIn, LogOut, User as UserIcon, Tablet } from "lucide-react";
import type { User } from "@supabase/supabase-js";

interface AuthButtonProps {
  user: User | null;
}

export function AuthButton({ user }: AuthButtonProps) {
  const [loginOpen, setLoginOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSharedDevice, setIsSharedDevice] = useState(false);

  useEffect(() => {
    if (typeof document !== "undefined") {
      setIsSharedDevice(document.cookie.includes("pantry_shared_device=true"));
    }
  }, []);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      if (isSharedDevice) {
        await logoutSharedDevice();
      } else {
        const supabase = createClient();
        await supabase.auth.signOut();
      }
      window.location.reload();
    } catch (err) {
      console.error("Logout failed:", err);
      setIsLoggingOut(false);
    }
  };

  if (!user && !isSharedDevice) {
    return (
      <>
        <Button
          onClick={() => setLoginOpen(true)}
          size="sm"
          className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm"
        >
          <LogIn className="h-4 w-4" />
          <span>ログイン</span>
        </Button>
        <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
      </>
    );
  }

  // 共有端末セッション時の表示
  if (isSharedDevice && !user) {
    return (
      <div className="flex items-center gap-2">
        <Badge
          variant="outline"
          className="flex items-center gap-1.5 py-1 px-2.5 bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 text-xs font-semibold"
        >
          <Tablet className="h-3.5 w-3.5" />
          <span>冷蔵庫端末 (世帯共有)</span>
        </Badge>
        <Button
          onClick={handleLogout}
          variant="ghost"
          size="sm"
          disabled={isLoggingOut}
          className="h-8 px-2 text-neutral-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
          title="共有端末の連携解除"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  const avatarUrl = user?.user_metadata?.avatar_url;
  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "ユーザー";

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="h-8 w-8 rounded-full border border-neutral-200 object-cover dark:border-neutral-700"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            <UserIcon className="h-4 w-4" />
          </div>
        )}
        <span className="hidden text-xs font-semibold text-neutral-800 dark:text-neutral-200 sm:inline-block max-w-[120px] truncate">
          {displayName}
        </span>
      </div>

      <Button
        onClick={handleLogout}
        variant="ghost"
        size="sm"
        disabled={isLoggingOut}
        className="h-8 px-2 text-neutral-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
        title="ログアウト"
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
}

