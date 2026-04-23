"use client";

import { Link2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricSummaryRowProps {
  download: string;
  upload: string;
  connections: string;
  share?: string;
  shareVisibility?: "always" | "mobile-only" | "desktop-only";
  className?: string;
}

export function MetricSummaryRow({
  download,
  upload,
  connections,
  share,
  shareVisibility = "always",
  className,
}: MetricSummaryRowProps) {
  const shareClassName =
    shareVisibility === "mobile-only"
      ? "sm:hidden"
      : shareVisibility === "desktop-only"
        ? "hidden sm:inline"
        : "";

  return (
    <div
      className={cn(
        "grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 text-xs text-muted-foreground",
        className,
      )}
    >
      <div className="grid min-w-0 grid-cols-[minmax(0,7rem)_minmax(0,5.5rem)_auto] items-center gap-x-3 overflow-hidden">
        <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-left text-blue-500 dark:text-blue-400 tabular-nums">
          ↓ {download}
        </span>
        <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-left text-purple-500 dark:text-purple-400 tabular-nums">
          ↑ {upload}
        </span>
        <span className="flex items-center gap-1 whitespace-nowrap text-left tabular-nums">
          <Link2 className="w-3 h-3 shrink-0" />
          <span>{connections}</span>
        </span>
      </div>
      {share ? (
        <span
          className={cn(
            "shrink-0 whitespace-nowrap text-right tabular-nums",
            shareClassName,
          )}
        >
          {share}
        </span>
      ) : null}
    </div>
  );
}
