"use client";

import { useMemo } from "react";
import { Link2 } from "lucide-react";
import { CountryFlag } from "./country-flag";
import { formatBytes, formatNumber } from "@/lib/utils";
import { useCountryName } from "@/lib/i18n-country";
import type { CountryStats } from "@neko-master/shared";

interface CountryTrafficListProps {
  data: CountryStats[];
  sortBy?: "traffic" | "connections";
}

// Continent colors
const CONTINENT_COLORS: Record<string, string> = {
  AS: "#F59E0B", NA: "#3B82F6", EU: "#8B5CF6",
  SA: "#10B981", AF: "#EF4444", OC: "#06B6D4",
  LOCAL: "#6B7280", Unknown: "#9CA3AF",
};

function getContinentColor(continent: string): string {
  return CONTINENT_COLORS[continent] || CONTINENT_COLORS.Unknown;
}

export function CountryTrafficList({
  data,
  sortBy = "traffic",
}: CountryTrafficListProps) {
  const countryName = useCountryName();
  const countries = useMemo(() => {
    if (!data) return [];
    return data
      .filter(c => c.country !== "LOCAL" && c.country !== "Unknown")
      .map((country) => ({
        ...country,
        color: getContinentColor(country.continent),
        total: country.totalDownload + country.totalUpload,
      }))
      .sort((a, b) => {
        if (sortBy === "connections") {
          return b.totalConnections - a.totalConnections;
        }
        return b.total - a.total;
      });
  }, [data, sortBy]);

  const totalTraffic = useMemo(() => {
    return countries.reduce((sum, c) => sum + c.total, 0);
  }, [countries]);

  if (countries.length === 0) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="p-3 rounded-xl border border-border/30 bg-muted/50 h-24" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
      {countries.map((country) => {
        const percentage = totalTraffic > 0 ? (country.total / totalTraffic) * 100 : 0;
        
        return (
          <div
            key={country.country}
            className="p-3 rounded-xl border border-border/50 bg-card/50 hover:bg-card transition-colors"
          >
            {/* Header: Flag + Name + Total */}
            <div className="flex items-center gap-2 mb-2">
              <CountryFlag country={country.country} className="h-4 w-6" />
              <p className="flex-1 font-medium text-sm truncate" title={countryName(country.country)}>
                {countryName(country.country)}
              </p>
              <span className="text-base font-bold tabular-nums whitespace-nowrap shrink-0 sm:hidden">
                {formatBytes(country.total)}
              </span>
            </div>

            {/* Traffic Stats */}
            <div className="space-y-1.5">
              {/* Desktop total + share (keep previous layout) */}
              <div className="hidden sm:flex items-baseline justify-between">
                <span className="text-base sm:text-lg font-bold tabular-nums whitespace-nowrap">
                  {formatBytes(country.total)}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                  {percentage.toFixed(1)}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${percentage}%`, backgroundColor: country.color }}
                />
              </div>

              {/* Compact per-card metrics: avoid fixed-width shared row causing overflow in 6-col layout */}
              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-blue-500 dark:text-blue-400 tabular-nums">
                    ↓ {formatBytes(country.totalDownload)}
                  </span>
                  <span className="min-w-0 truncate text-right text-purple-500 dark:text-purple-400 tabular-nums">
                    ↑ {formatBytes(country.totalUpload)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 text-muted-foreground">
                  <span className="inline-flex min-w-0 items-center gap-1 tabular-nums">
                    <Link2 className="w-3 h-3 shrink-0" />
                    <span className="truncate">{formatNumber(country.totalConnections)}</span>
                  </span>
                  <span className="tabular-nums whitespace-nowrap sm:hidden">
                    {percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
