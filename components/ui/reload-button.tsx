"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RotateCw } from "lucide-react";

export function ReloadButton() {
  const [isReloading, setIsReloading] = useState(false);

  const handleReload = () => {
    if (isReloading) return;
    setIsReloading(true);
    // PWAキャッシュをリフレッシュして最新の世帯在庫データを取得
    window.location.reload();
  };

  return (
    <Button
      onClick={handleReload}
      variant="ghost"
      size="sm"
      disabled={isReloading}
      className="h-8 w-8 p-0 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
      title="画面を再読み込み・最新データに同期"
    >
      <RotateCw className={`h-4 w-4 ${isReloading ? "animate-spin text-emerald-600" : ""}`} />
    </Button>
  );
}
