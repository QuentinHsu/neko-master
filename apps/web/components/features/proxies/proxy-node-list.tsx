"use client";

import { memo, useMemo } from "react";
import { Server } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  TrafficRankingList,
  type TrafficRankingItem,
} from "@/components/common";
import { CountryFlag } from "@/components/features/countries/country-flag";
import { cn, formatRateBytes } from "@/lib/utils";
import { useIsWindows } from "@/lib/hooks/use-is-windows";
import type { ProxyStats } from "@neko-master/shared";
import {
  getProxyCountryCode,
  getProxyDisplayName,
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
  skeletonCount,
  scrollHeightClassName,
  showPeakRates = false,
  peakDownloadLabel,
  peakUploadLabel,
}: ProxyNodeListProps) {
  const t = useTranslations("topProxies");
  const isWindows = useIsWindows();

  const items = useMemo<TrafficRankingItem[]>(
    () =>
      (proxies ?? []).map((proxy) => ({
        id: proxy.chain,
        name: getProxyDisplayName(proxy.chain),
        title: proxy.chain,
        titleClassName: cn(isWindows && "emoji-flag-font"),
        totalDownload: proxy.totalDownload,
        totalUpload: proxy.totalUpload,
        totalConnections: proxy.totalConnections,
        icon: (
          <CountryFlag
            country={getProxyCountryCode(proxy.chain)}
            className="h-3.5 w-5"
          />
        ),
        extraContent:
          showPeakRates && peakDownloadLabel && peakUploadLabel ? (
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
          ) : null,
      })),
    [
      isWindows,
      peakDownloadLabel,
      peakUploadLabel,
      proxies,
      showPeakRates,
    ],
  );

  return (
    <TrafficRankingList
      title={title}
      icon={<Server className="w-4 h-4" />}
      items={items}
      sortBy={sortBy}
      onSortChange={onSortChange}
      onSelect={onSelect}
      selectedId={selectedProxy}
      onViewAll={onViewAll}
      isLoading={isLoading}
      limit={limit}
      skeletonCount={skeletonCount}
      scrollHeightClassName={scrollHeightClassName}
      sortTrafficLabel={t("sortByTraffic")}
      sortConnectionsLabel={t("sortByConnections")}
      viewAllLabel={t("viewAll")}
      emptyTitle={emptyTitle}
      emptyHint={emptyHint}
    />
  );
});
