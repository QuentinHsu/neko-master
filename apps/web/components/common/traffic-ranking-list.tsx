"use client";

import { memo, type ReactNode } from "react";
import { ArrowRight, BarChart3, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MetricSummaryRow } from "@/components/common/metric-summary-row";
import { cn, formatBytes, formatNumber } from "@/lib/utils";

export type TrafficRankingSortMode = "traffic" | "connections";

export interface TrafficRankingItem {
  id: string;
  name: string;
  totalDownload: number;
  totalUpload: number;
  totalConnections: number;
  icon?: ReactNode;
  title?: string;
  disabled?: boolean;
  titleClassName?: string;
  extraContent?: ReactNode;
}

interface TrafficRankingListProps {
  title: string;
  icon: ReactNode;
  items: TrafficRankingItem[];
  sortBy: TrafficRankingSortMode;
  sortTrafficLabel: string;
  sortConnectionsLabel: string;
  emptyTitle: string;
  emptyHint: string;
  viewAllLabel?: string;
  onSortChange?: (mode: TrafficRankingSortMode) => void;
  onSelect?: (id: string) => void;
  selectedId?: string | null;
  onViewAll?: () => void;
  isLoading?: boolean;
  limit?: number;
  skeletonCount?: number;
  scrollHeightClassName?: string;
}

function getRankBadgeClass(index: number): string {
  if (index === 0) {
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
  }
  if (index === 1) {
    return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  }
  if (index === 2) {
    return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
  }
  return "bg-muted text-muted-foreground";
}

function sortItems(
  items: TrafficRankingItem[],
  sortBy: TrafficRankingSortMode,
): TrafficRankingItem[] {
  return [...items].sort((left, right) => {
    if (sortBy === "connections") {
      return right.totalConnections - left.totalConnections;
    }

    const leftTotal = left.totalDownload + left.totalUpload;
    const rightTotal = right.totalDownload + right.totalUpload;
    return rightTotal - leftTotal;
  });
}

export const TrafficRankingList = memo(function TrafficRankingList({
  title,
  icon,
  items,
  sortBy,
  sortTrafficLabel,
  sortConnectionsLabel,
  emptyTitle,
  emptyHint,
  viewAllLabel,
  onSortChange,
  onSelect,
  selectedId,
  onViewAll,
  isLoading,
  limit,
  skeletonCount = limit ?? 5,
  scrollHeightClassName,
}: TrafficRankingListProps) {
  const sortedItems = sortItems(items ?? [], sortBy);
  const visibleItems =
    typeof limit === "number" ? sortedItems.slice(0, limit) : sortedItems;
  const hasData = visibleItems.length > 0;

  const totalTraffic = items.reduce(
    (sum, item) => sum + item.totalDownload + item.totalUpload,
    0,
  );
  const maxTotal = visibleItems.length
    ? Math.max(
        ...visibleItems.map((item) => item.totalDownload + item.totalUpload),
      )
    : 1;

  const listContent = hasData ? (
    <div className="space-y-2">
      {visibleItems.map((item, index) => {
        const total = item.totalDownload + item.totalUpload;
        const percentage = totalTraffic > 0 ? (total / totalTraffic) * 100 : 0;
        const barPercent = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
        const isSelected = selectedId === item.id;
        const itemClassName = cn(
          "w-full p-2.5 rounded-xl border text-left transition-all duration-200 overflow-hidden",
          item.disabled
            ? "border-border/30 bg-card/30 opacity-50 cursor-default"
            : onSelect
              ? isSelected
                ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                : "border-border/50 bg-card/50 hover:bg-card hover:border-primary/30"
              : "border-border/50 bg-card/50 hover:bg-card transition-colors",
        );

        const content = (
          <>
            <div className="flex items-center gap-2 mb-1.5 min-w-0">
              <span
                className={cn(
                  "w-5 h-5 rounded-md text-[10px] font-bold flex items-center justify-center shrink-0",
                  getRankBadgeClass(index),
                )}
              >
                {index + 1}
              </span>
              {item.icon ? (
                <div className="w-5 h-5 rounded bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                  {item.icon}
                </div>
              ) : null}
              <span
                className={cn(
                  "flex-1 text-sm font-medium truncate min-w-0",
                  item.titleClassName,
                )}
                title={item.title ?? item.name}
              >
                {item.name}
              </span>
              <span className="text-sm font-bold tabular-nums shrink-0 whitespace-nowrap ml-auto">
                {formatBytes(total)}
              </span>
            </div>
            <div className={cn("space-y-1.5", item.icon ? "pl-7" : "pl-7")}>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden flex">
                <div
                  className="h-full bg-blue-500 dark:bg-blue-400"
                  style={{
                    width: `${total > 0 ? (item.totalDownload / total) * barPercent : 0}%`,
                  }}
                />
                <div
                  className="h-full bg-purple-500 dark:bg-purple-400"
                  style={{
                    width: `${total > 0 ? (item.totalUpload / total) * barPercent : 0}%`,
                  }}
                />
              </div>
              <MetricSummaryRow
                download={formatBytes(item.totalDownload)}
                upload={formatBytes(item.totalUpload)}
                connections={formatNumber(item.totalConnections)}
                share={`${percentage.toFixed(1)}%`}
              />
              {item.extraContent}
            </div>
          </>
        );

        if (!onSelect || item.disabled) {
          return (
            <div key={item.id} className={itemClassName}>
              {content}
            </div>
          );
        }

        return (
          <button
            key={item.id}
            type="button"
            className={itemClassName}
            onClick={() => onSelect(item.id)}
          >
            {content}
          </button>
        );
      })}
    </div>
  ) : isLoading ? (
    Array.from({ length: skeletonCount }).map((_, index) => (
      <div
        key={index}
        className="p-2.5 rounded-xl border border-border/50 bg-card/50"
      >
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-5 h-5 rounded-md bg-muted/60 animate-pulse shrink-0" />
          <div className="w-5 h-5 rounded bg-muted/60 animate-pulse shrink-0" />
          <div className="flex-1 h-4 bg-muted/60 rounded animate-pulse" />
          <div className="w-12 h-4 bg-muted/60 rounded animate-pulse shrink-0" />
        </div>
        <div className="pl-7 space-y-1.5">
          <div className="h-1.5 rounded-full bg-muted/60 animate-pulse" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-14 h-3 bg-muted/60 rounded animate-pulse" />
              <div className="w-14 h-3 bg-muted/60 rounded animate-pulse" />
              <div className="w-10 h-3 bg-muted/60 rounded animate-pulse" />
            </div>
            <div className="w-8 h-3 bg-muted/60 rounded animate-pulse" />
          </div>
        </div>
      </div>
    ))
  ) : (
    <div className="h-full min-h-[220px] rounded-xl border border-dashed border-border/60 bg-card/30 px-4 py-5">
      <div className="space-y-2">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-8 rounded-lg bg-muted/60 animate-pulse" />
        ))}
      </div>
      <div className="mt-4 text-center">
        <p className="text-sm font-medium text-muted-foreground">{emptyTitle}</p>
        <p className="text-xs text-muted-foreground/80 mt-1">{emptyHint}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-3 h-full flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 pt-0.5">
          <div className="text-sm font-semibold leading-none text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            {icon}
            {title}
          </div>
        </div>
        {onSortChange ? (
          <div className="flex shrink-0 items-center gap-0.5 rounded-lg bg-muted/50 p-0.5">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-7 w-7 rounded-md transition-all",
                sortBy === "traffic"
                  ? "bg-background shadow-sm text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => onSortChange("traffic")}
              title={sortTrafficLabel}
              aria-label={sortTrafficLabel}
            >
              <BarChart3 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-7 w-7 rounded-md transition-all",
                sortBy === "connections"
                  ? "bg-background shadow-sm text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => onSortChange("connections")}
              title={sortConnectionsLabel}
              aria-label={sortConnectionsLabel}
            >
              <Link2 className="w-4 h-4" />
            </Button>
          </div>
        ) : null}
      </div>

      {scrollHeightClassName ? (
        <ScrollArea className={cn("pr-3", scrollHeightClassName)}>
          {listContent}
        </ScrollArea>
      ) : (
        <div className="space-y-2 flex-1">{listContent}</div>
      )}

      {onViewAll && viewAllLabel ? (
        <div className="pt-2 border-t border-border/30">
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-9 text-xs"
            onClick={onViewAll}
            disabled={!hasData}
          >
            {viewAllLabel}
            <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      ) : null}
    </div>
  );
});
