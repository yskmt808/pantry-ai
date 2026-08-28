"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
}: DialogProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    if (open) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onOpenChange]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* 1. Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
        onClick={() => onOpenChange(false)}
      />

      {/* 2. Modal Box: body直下Portalにより最前面に完全独立して中央配置 */}
      <div className="relative z-10 w-full max-w-md my-auto rounded-3xl border border-neutral-200 bg-white p-5 sm:p-6 shadow-2xl animate-in zoom-in-95 duration-150 dark:border-neutral-800 dark:bg-neutral-900 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
          <div className="pr-2">
            <h3 className="text-base sm:text-lg font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
              {title}
            </h3>
            {description && (
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 leading-tight">
                {description}
              </p>
            )}
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 transition-colors shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="pt-3">{children}</div>
      </div>
    </div>,
    document.body
  );
}
