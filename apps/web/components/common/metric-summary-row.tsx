"use client";

import { Link2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricSummaryRowProps {
  download: string;
  upload: string;
  connections: string;
  share?: string;
  className?: string;
}

export function MetricSummaryRow({
  download,
  upload,
  connections,
  share,
  className,
}: MetricSummaryRowProps) {
  return (
    <div
      className={cn(
        "grid w-full max-w-[20rem] grid-cols-[7rem_5.5rem_3rem_minmax(0,1fr)] items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground",
        className,
      )}
    >
      <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-left text-blue-500 dark:text-blue-400 tabular-nums">
        ↓ {download}
      </span>
      <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-left text-purple-500 dark:text-purple-400 tabular-nums">
        ↑ {upload}
      </span>
      <span className="flex w-[3rem] items-center gap-1 whitespace-nowrap text-left tabular-nums">
        <Link2 className="w-3 h-3 shrink-0" />
        <span>{connections}</span>
      </span>
      {share ? (
        <span className="min-w-0 whitespace-nowrap text-right tabular-nums">{share}</span>
      ) : null}
    </div>
  );
}
