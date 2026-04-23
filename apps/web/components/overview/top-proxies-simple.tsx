"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { ProxyNodeList } from "@/components/features/proxies/proxy-node-list";
import type { ProxyStats } from "@neko-master/shared";

interface TopProxiesSimpleProps {
  proxies: ProxyStats[];
  sortBy: "traffic" | "connections";
  onSortChange: (mode: "traffic" | "connections") => void;
  onViewAll?: () => void;
  isLoading?: boolean;
}

const HOT_PROXY_LIMIT = 5;

export const TopProxiesSimple = React.memo(
  function TopProxiesSimple({
    proxies,
    sortBy,
    onSortChange,
    onViewAll,
    isLoading,
  }: TopProxiesSimpleProps) {
    const t = useTranslations("topProxies");
    const statsT = useTranslations("stats");

    return (
      <ProxyNodeList
        proxies={proxies}
        sortBy={sortBy}
        onSortChange={onSortChange}
        onViewAll={onViewAll}
        isLoading={isLoading}
        limit={HOT_PROXY_LIMIT}
        scrollHeightClassName="h-[280px]"
        skeletonCount={HOT_PROXY_LIMIT}
        showPeakRates
        peakDownloadLabel={statsT("peakDownload")}
        peakUploadLabel={statsT("peakUpload")}
        title={t("title")}
        emptyTitle={t("noData")}
        emptyHint={t("noDataHint")}
      />
    );
  },
  (prev, next) => {
    return (
      JSON.stringify(prev.proxies) === JSON.stringify(next.proxies) &&
      prev.sortBy === next.sortBy
    );
  },
);
