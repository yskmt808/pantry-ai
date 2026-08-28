"use client";

import { type LocationType } from "@/lib/supabase/types";
import { Snowflake, Refrigerator, Carrot, PackageOpen, Layers } from "lucide-react";
import { cn } from "@/components/ui/button";

export interface LocationTabOption {
  id: LocationType | "all";
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const LOCATIONS: LocationTabOption[] = [
  { id: "all", label: "すべて", icon: Layers },
  { id: "refrigerator", label: "冷蔵室", icon: Refrigerator },
  { id: "vegetable_room", label: "野菜室", icon: Carrot },
  { id: "freezer", label: "冷凍庫", icon: Snowflake },
  { id: "pantry", label: "パントリー", icon: PackageOpen },
];

interface LocationTabsProps {
  currentLocation: LocationType | "all";
  onChange: (location: LocationType | "all") => void;
  counts?: Record<string, number>;
}

export function LocationTabs({
  currentLocation,
  onChange,
  counts = {},
}: LocationTabsProps) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
      {LOCATIONS.map((loc) => {
        const Icon = loc.icon;
        const isSelected = currentLocation === loc.id;
        const count = counts[loc.id] ?? 0;

        return (
          <button
            key={loc.id}
            onClick={() => onChange(loc.id)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all duration-200",
              isSelected
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200/80 dark:bg-neutral-800/80 dark:text-neutral-300 dark:hover:bg-neutral-800"
            )}
          >
            <Icon className={cn("h-4 w-4", isSelected ? "text-white" : "text-neutral-500 dark:text-neutral-400")} />
            <span>{loc.label}</span>
            {count > 0 && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.2 text-[10px] font-bold",
                  isSelected
                    ? "bg-white/20 text-white"
                    : "bg-neutral-200/90 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300"
                )}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
