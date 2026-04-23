"use client";

import {
  extractCountryCodeFromText,
  stripLeadingFlagEmoji,
} from "@/components/features/countries";
import type { ProxyStats } from "@neko-master/shared";

export type ProxySortBy = "traffic" | "connections";

export function normalizeProxyName(name: string): string {
  const normalized = name
    .trim()
    .replace(/^\["?/, "")
    .replace(/"?\]$/, "");
  const parts = normalized
    .split(">")
    .map((part) => part.trim())
    .filter(Boolean);
  return parts[0] || normalized;
}

export function getProxyDisplayName(name: string): string {
  if (!name) return "DIRECT";
  return stripLeadingFlagEmoji(normalizeProxyName(name));
}

export function getProxyCountryCode(name: string): string {
  const cleaned = normalizeProxyName(name);
  if (cleaned === "DIRECT" || cleaned === "Direct") {
    return "DIRECT";
  }
  return extractCountryCodeFromText(cleaned) ?? "UNKNOWN";
}

export function getProxyTotal(proxy: ProxyStats): number {
  return proxy.totalDownload + proxy.totalUpload;
}

export function sortProxyStats(
  proxies: ProxyStats[],
  sortBy: ProxySortBy,
): ProxyStats[] {
  return [...proxies].sort((a, b) => {
    if (sortBy === "traffic") {
      return getProxyTotal(b) - getProxyTotal(a);
    }
    return b.totalConnections - a.totalConnections;
  });
}
