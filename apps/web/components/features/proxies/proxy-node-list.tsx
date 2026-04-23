"use client";

import { memo, useMemo } from "react";
import { ArrowRight, BarChart3, Link2, Server } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn, formatBytes, formatNumber, formatRateBytes } from "@/lib/utils";
import { useIsWindows } from "@/lib/hooks/use-is-windows";
import type { ProxyStats } from "@neko-master/shared";
import {
  getProxyDisplayName,
  getProxyTotal,
  sortProxyStats,
  type ProxySortBy,
} from "./proxy-node-utils";

interface ProxyNodeListProps {
  proxies: ProxyStats[];
  sortBy: ProxySortBy;
  title: string;
  emptyTitle: string;
  emptyHint: string;
  onSortChange?: (mode: ProxySortBy) => void;
  onSelect?: (chain: string) => void;
  selectedProxy?: string | null;
  onViewAll?: () => void;
  isLoading?: boolean;
  limit?: number;
  skeletonCount?: number;
  scrollHeightClassName?: string;
  showPeakRates?: boolean;
  peakDownloadLabel?: string;
  peakUploadLabel?: string;
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

function formatRate(bytesPerSecond?: number): string {
  return formatRateBytes(bytesPerSecond ?? 0);
}

export const ProxyNodeList = memo(function ProxyNodeList({
  proxies,
  sortBy,
  title,
  emptyTitle,
  emptyHint,
  onSortChange,
  onSelect,
  selectedProxy,
  onViewAll,
  isLoading,
  limit,
  skeletonCount = limit ?? 5,
  scrollHeightClassName,
  showPeakRates = false,
  peakDownloadLabel,
  peakUploadLabel,
}: ProxyNodeListProps) {
  const t = useTranslations("topProxies");
  const isWindows = useIsWindows();

  const sortedProxies = useMemo(() => {
    const sorted = sortProxyStats(proxies ?? [], sortBy);
    return typeof limit === "number" ? sorted.slice(0, limit) : sorted;
  }, [proxies, sortBy, limit]);

  const totalTraffic = useMemo(() => {
    if (!proxies?.length) return 1;
    return proxies.reduce((sum, proxy) => sum + getProxyTotal(proxy), 0);
  }, [proxies]);

  const maxTotal = useMemo(() => {
    if (!sortedProxies.length) return 1;
    return Math.max(...sortedProxies.map(getProxyTotal));
  }, [sortedProxies]);

  const hasData = sortedProxies.length > 0;

  const listContent = hasData ? (
    <div className="space-y-2">
      {sortedProxies.map((proxy, index) => {
        const total = getProxyTotal(proxy);
        const percentage = totalTraffic > 0 ? (total / totalTraffic) * 100 : 0;
        const barPercent = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
        const isSelected = selectedProxy === proxy.chain;
        const itemClassName = cn(
          "w-full p-2.5 rounded-xl border text-left transition-all duration-200 overflow-hidden",
          onSelect
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
              <span
                className={cn(
                  "flex-1 text-sm font-medium truncate min-w-0",
                  isWindows && "emoji-flag-font",
                )}
                title={proxy.chain}
              >
                {getProxyDisplayName(proxy.chain)}
              </span>
              <span className="text-sm font-bold tabular-nums shrink-0 whitespace-nowrap ml-auto">
                {formatBytes(total)}
              </span>
            </div>
            <div className="pl-7 space-y-1.5">
              <div className="h-1.5 rounded-full bg-muted overflow-hidden flex">
                <div
                  className="h-full bg-blue-500 dark:bg-blue-400"
                  style={{
                    width: `${total > 0 ? (proxy.totalDownload / total) * barPercent : 0}%`,
                  }}
                />
                <div
                  className="h-full bg-purple-500 dark:bg-purple-400"
                  style={{
                    width: `${total > 0 ? (proxy.totalUpload / total) * barPercent : 0}%`,
                  }}
                />
              </div>
              <div className="grid grid-cols-1 min-[300px]:grid-cols-[1fr_auto] gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="text-blue-500 dark:text-blue-400 whitespace-nowrap">
                    ↓ {formatBytes(proxy.totalDownload)}
                  </span>
                  <span className="text-purple-500 dark:text-purple-400 whitespace-nowrap">
                    ↑ {formatBytes(proxy.totalUpload)}
                  </span>
                  <span className="flex items-center gap-1 tabular-nums">
                    <Link2 className="w-3 h-3" />
                    {formatNumber(proxy.totalConnections)}
                  </span>
                </div>
                <span className="tabular-nums text-right">{percentage.toFixed(1)}%</span>
              </div>
              {showPeakRates && (
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px] text-muted-foreground/90">
                  <span className="flex min-w-0 items-center justify-between gap-2 whitespace-nowrap">
                    <span className="text-blue-500 dark:text-blue-400">
                      {peakDownloadLabel}
                    </span>
                    <span className="tabular-nums text-right">
                      {formatRate(proxy.maxDownloadPerSecond)}
                    </span>
                  </span>
                  <span className="flex min-w-0 items-center justify-between gap-2 whitespace-nowrap">
                    <span className="text-purple-500 dark:text-purple-400">
                      {peakUploadLabel}
                    </span>
                    <span className="tabular-nums text-right">
                      {formatRate(proxy.maxUploadPerSecond)}
                    </span>
                  </span>
                </div>
              )}
            </div>
          </>
        );

        if (!onSelect) {
          return (
            <div key={proxy.chain} className={itemClassName}>
              {content}
            </div>
          );
        }

        return (
          <button
            key={proxy.chain}
            type="button"
            className={itemClassName}
            onClick={() => onSelect(proxy.chain)}
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
          {showPeakRates && (
            <div className="grid grid-cols-2 gap-4">
              <div className="h-3 bg-muted/60 rounded animate-pulse" />
              <div className="h-3 bg-muted/60 rounded animate-pulse" />
            </div>
          )}
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
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Server className="w-4 h-4" />
          {title}
        </h3>
        {onSortChange && (
          <div className="flex items-center gap-0.5 bg-muted/50 rounded-lg p-0.5">
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
              title={t("sortByTraffic")}
              aria-label={t("sortByTraffic")}
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
              title={t("sortByConnections")}
              aria-label={t("sortByConnections")}
            >
              <Link2 className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {scrollHeightClassName ? (
        <ScrollArea className={cn("pr-3", scrollHeightClassName)}>
          {listContent}
        </ScrollArea>
      ) : (
        <div className="space-y-2 flex-1">{listContent}</div>
      )}

      {onViewAll && (
        <div className="pt-2 border-t border-border/30">
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-9 text-xs"
            onClick={onViewAll}
            disabled={!hasData}
          >
            {t("viewAll")}
            <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
});
