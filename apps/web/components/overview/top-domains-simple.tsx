"use client";

import React, { useMemo } from "react";
import { Globe } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Favicon,
  TrafficRankingList,
  type TrafficRankingItem,
} from "@/components/common";
import { useResponsiveItemCount } from "@/lib/hooks/use-responsive-item-count";
import type { DomainStats } from "@neko-master/shared";

interface TopDomainsSimpleProps {
  domains: DomainStats[];
  sortBy: "traffic" | "connections";
  onSortChange: (mode: "traffic" | "connections") => void;
  onViewAll?: () => void;
  isLoading?: boolean;
}

export const TopDomainsSimple = React.memo(function TopDomainsSimple({
  domains,
  sortBy,
  onSortChange,
  onViewAll,
  isLoading,
}: TopDomainsSimpleProps) {
  const t = useTranslations("topDomains");
  const itemCount = useResponsiveItemCount();

  const items = useMemo<TrafficRankingItem[]>(
    () =>
      (domains ?? []).map((domain) => ({
        id: domain.domain,
        name: domain.domain,
        totalDownload: domain.totalDownload,
        totalUpload: domain.totalUpload,
        totalConnections: domain.totalConnections,
        icon: <Favicon domain={domain.domain} size="sm" className="rounded" />,
      })),
    [domains],
  );

  return (
    <TrafficRankingList
      title={t("title")}
      icon={<Globe className="w-4 h-4" />}
      items={items}
      sortBy={sortBy}
      onSortChange={onSortChange}
      onViewAll={onViewAll}
      isLoading={isLoading}
      limit={itemCount}
      skeletonCount={itemCount}
      sortTrafficLabel={t("sortByTraffic")}
      sortConnectionsLabel={t("sortByConnections")}
      viewAllLabel={t("viewAll")}
      emptyTitle={t("noData")}
      emptyHint={t("noDataHint")}
    />
  );
}, (prev, next) => {
  return (
    JSON.stringify(prev.domains) === JSON.stringify(next.domains) &&
    prev.sortBy === next.sortBy
  );
});
