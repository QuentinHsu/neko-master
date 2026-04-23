import type { TabId } from "@/lib/types/dashboard";

export const DEFAULT_DASHBOARD_TAB: TabId = "overview";

export const dashboardTabs = [
  "overview",
  "rules",
  "domains",
  "countries",
  "proxies",
  "devices",
  "health",
  "network",
] as const satisfies readonly TabId[];

const dashboardTabSet = new Set<TabId>(dashboardTabs);

export function isDashboardTab(value: string | undefined): value is TabId {
  return !!value && dashboardTabSet.has(value as TabId);
}

export function getDashboardPath(locale: string, tab: TabId = DEFAULT_DASHBOARD_TAB): string {
  return `/${locale}/dashboard/${tab}`;
}

export function getDashboardTabFromPath(pathname: string): TabId | null {
  const match = pathname.match(/^\/[^/]+\/dashboard\/([^/]+)/);
  const tab = match?.[1];

  return isDashboardTab(tab) ? tab : null;
}
