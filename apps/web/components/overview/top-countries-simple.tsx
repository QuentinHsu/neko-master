"use client";

import React, { useMemo } from "react";
import { Globe } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  TrafficRankingList,
  type TrafficRankingItem,
} from "@/components/common";
import { CountryFlag } from "@/components/features/countries";
import { useResponsiveItemCount } from "@/lib/hooks/use-responsive-item-count";
import { useCountryName } from "@/lib/i18n-country";
import type { CountryStats } from "@neko-master/shared";

interface TopCountriesSimpleProps {
  countries: CountryStats[];
  sortBy: "traffic" | "connections";
  onSortChange: (mode: "traffic" | "connections") => void;
  onViewAll?: () => void;
  isLoading?: boolean;
}

export const TopCountriesSimple = React.memo(function TopCountriesSimple({
  countries,
  sortBy,
  onSortChange,
  onViewAll,
  isLoading,
}: TopCountriesSimpleProps) {
  const t = useTranslations("topCountries");
  const countryName = useCountryName();
  const itemCount = useResponsiveItemCount();

  const items = useMemo<TrafficRankingItem[]>(
    () =>
      (countries ?? []).map((country) => ({
        id: country.country,
        name: countryName(country.country),
        title: countryName(country.country),
        totalDownload: country.totalDownload,
        totalUpload: country.totalUpload,
        totalConnections: country.totalConnections,
        icon: <CountryFlag country={country.country} className="h-3.5 w-5" />,
      })),
    [countries, countryName],
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
    JSON.stringify(prev.countries) === JSON.stringify(next.countries) &&
    prev.sortBy === next.sortBy
  );
});
