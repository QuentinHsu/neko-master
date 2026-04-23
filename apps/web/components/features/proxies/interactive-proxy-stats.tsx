"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { BarChart3, Waypoints } from "lucide-react";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, Cell as BarCell, LabelList } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CountryFlag } from "@/components/features/countries/country-flag";
import { cn, formatBytes, formatNumber, formatRateBytes } from "@/lib/utils";
import { type TimeRange } from "@/lib/api";
import { useStableTimeRange } from "@/lib/hooks/use-stable-time-range";
import { useStatsWebSocket } from "@/lib/websocket";
import {
  getProxyDomainsQueryKey,
  getProxyIPsQueryKey,
} from "@/lib/stats-query-keys";
import { useProxies, useProxyDomains, useProxyIPs } from "@/hooks/api/use-proxies";
import { Favicon } from "@/components/common";
import { DomainStatsTable, IPStatsTable } from "@/components/features/stats/table";
import { InsightChartSkeleton, InsightThreePanelSkeleton } from "@/components/ui/insight-skeleton";
import { COLORS, type PageSize } from "@/lib/stats-utils";
import type { ProxyStats, StatsSummary } from "@neko-master/shared";
import { ProxyNodeList } from "./proxy-node-list";
import {
  getProxyCountryCode,
  getProxyDisplayName,
  getProxyTotal,
  sortProxyStats,
  type ProxySortBy,
} from "./proxy-node-utils";

interface InteractiveProxyStatsProps {
  data?: ProxyStats[];
  activeBackendId?: number;
  timeRange?: TimeRange;
  backendStatus?: "healthy" | "unhealthy" | "unknown";
  autoRefresh?: boolean;
}
const PROXY_DETAIL_WS_MIN_PUSH_MS = 3_000;

function renderCustomBarLabel(props: {
  x?: number;
  y?: number;
  width?: number;
  value?: number;
  height?: number;
}) {
  const { x = 0, y = 0, width = 0, value = 0, height = 0 } = props;
  return (
    <text x={x + width + 6} y={y + height / 2} fill="currentColor" fontSize={11} dominantBaseline="central" textAnchor="start" style={{ fontVariantNumeric: "tabular-nums" }}>
      {formatBytes(value, 0)}
    </text>
  );
}

function formatRate(bytesPerSecond?: number): string {
  return formatRateBytes(bytesPerSecond ?? 0);
}

// Hook to detect container width for responsive chart items
function useContainerWidth(ref: React.RefObject<HTMLElement | null>) {
  const [width, setWidth] = useState(0);
  
  useEffect(() => {
    if (!ref.current) return;
    
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
      }
    });
    
    observer.observe(ref.current);
    setWidth(ref.current.getBoundingClientRect().width);
    
    return () => observer.disconnect();
  }, [ref]);
  
  return width;
}

export function InteractiveProxyStats({
  data,
  activeBackendId,
  timeRange,
  backendStatus,
  autoRefresh = true,
}: InteractiveProxyStatsProps) {
  const t = useTranslations("proxies");
  const statsT = useTranslations("stats");
  const domainsT = useTranslations("domains");
  const backendT = useTranslations("dashboard");
  const queryClient = useQueryClient();
  const stableTimeRange = useStableTimeRange(timeRange, { roundToMinute: true });
  const detailTimeRange = stableTimeRange;

  const { data: listData, isLoading: listQueryLoading } = useProxies({
    activeBackendId,
    limit: 50,
    range: stableTimeRange,
    enabled: !data && !!activeBackendId,
  });
  
  const proxyData = data ?? listData ?? [];
  const listLoading = !data && listQueryLoading && !listData;
  
  const [selectedProxy, setSelectedProxy] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<ProxySortBy>("traffic");
  const [activeTab, setActiveTab] = useState("domains");
  const [detailPageSize, setDetailPageSize] = useState<PageSize>(10);
  const [showDomainBarLabels, setShowDomainBarLabels] = useState(true);
  
  // Ref for TOP DOMAINS card to detect container width
  const topDomainsCardRef = useRef<HTMLDivElement>(null);
  const topDomainsWidth = useContainerWidth(topDomainsCardRef);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 640px)");
    const update = () => setShowDomainBarLabels(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const chartData = useMemo(() => {
    if (!proxyData) return [];
    return proxyData.map((proxy, index) => ({
      name: getProxyDisplayName(proxy.chain),
      rawName: proxy.chain,
      value: getProxyTotal(proxy),
      download: proxy.totalDownload,
      upload: proxy.totalUpload,
      connections: proxy.totalConnections,
      maxDownloadPerSecond: proxy.maxDownloadPerSecond ?? 0,
      maxUploadPerSecond: proxy.maxUploadPerSecond ?? 0,
      color: COLORS[index % COLORS.length],
      countryCode: getProxyCountryCode(proxy.chain),
      rank: index,
    }));
  }, [proxyData]);

  const sortedProxyData = useMemo(
    () => sortProxyStats(proxyData, sortBy),
    [proxyData, sortBy],
  );

  const topProxies = useMemo(() => [...chartData].sort((a, b) => b.value - a.value).slice(0, 4), [chartData]);

  useEffect(() => {
    if (sortedProxyData.length === 0) {
      setSelectedProxy(null);
      return;
    }
    const exists = !!selectedProxy && sortedProxyData.some((item) => item.chain === selectedProxy);
    if (!exists) {
      setSelectedProxy(sortedProxyData[0]?.chain ?? null);
    }
  }, [sortedProxyData, selectedProxy]);

  const wsDetailEnabled = autoRefresh && !!activeBackendId && !!selectedProxy;
  const { status: wsDetailStatus } = useStatsWebSocket({
    backendId: activeBackendId,
    range: detailTimeRange,
    minPushIntervalMs: PROXY_DETAIL_WS_MIN_PUSH_MS,
    includeSummary: false,
    includeProxyDetails: wsDetailEnabled,
    proxyChain: selectedProxy ?? undefined,
    proxyDetailLimit: 5000,
    trackLastMessage: false,
    enabled: wsDetailEnabled,
    onMessage: useCallback((stats: StatsSummary) => {
      if (!selectedProxy) return;
      if (stats.proxyDetailChain !== selectedProxy) return;
      
      if (stats.proxyDomains) {
        queryClient.setQueryData(
          getProxyDomainsQueryKey(selectedProxy, activeBackendId, detailTimeRange),
          stats.proxyDomains
        );
      }
      if (stats.proxyIPs) {
        queryClient.setQueryData(
          getProxyIPsQueryKey(selectedProxy, activeBackendId, detailTimeRange),
          stats.proxyIPs
        );
      }
    }, [selectedProxy, activeBackendId, detailTimeRange, queryClient]),
  });

  const { data: proxyDomains = [], isLoading: domainsLoading } = useProxyDomains({
    chain: selectedProxy,
    activeBackendId,
    range: detailTimeRange,
    enabled: !wsDetailEnabled || wsDetailStatus !== "connected",
  });

  const { data: proxyIPs = [], isLoading: ipsLoading } = useProxyIPs({
    chain: selectedProxy,
    activeBackendId,
    range: detailTimeRange,
    enabled: !wsDetailEnabled || wsDetailStatus !== "connected",
  });

  // Since we rely on cache updates from WS, we don't need dedicated state to track "hasWsDetails"
  // The cache IS the source of truth.
  const loading = !!selectedProxy && (domainsLoading || ipsLoading) && proxyDomains.length === 0 && proxyIPs.length === 0;

  const handleProxyClick = useCallback((rawName: string) => {
    if (selectedProxy !== rawName) {
      setSelectedProxy(rawName);
    }
  }, [selectedProxy]);

  const selectedProxyData = useMemo(() => chartData.find(d => d.rawName === selectedProxy), [chartData, selectedProxy]);

  const domainChartData = useMemo(() => {
    // Show more items in wide container (single column layout)
    const itemCount = topDomainsWidth >= 500 ? 15 : 10;
    const maxNameLength = topDomainsWidth >= 500 ? 35 : 25;
    return [...proxyDomains]
      .sort((a, b) => (b.totalDownload + b.totalUpload) - (a.totalDownload + a.totalUpload))
      .slice(0, itemCount)
      .map((d, i) => ({
        name: d.domain.length > maxNameLength ? d.domain.slice(0, maxNameLength - 3) + "..." : d.domain,
        fullName: d.domain,
        total: d.totalDownload + d.totalUpload,
        download: d.totalDownload,
        upload: d.totalUpload,
        connections: d.totalConnections,
        color: COLORS[i % COLORS.length],
      }));
  }, [proxyDomains, topDomainsWidth]);

  const isBackendUnavailable = backendStatus === "unhealthy";
  const emptyHint = isBackendUnavailable
    ? backendT("backendUnavailableHint")
    : t("noDataHint");

  if (listLoading) {
    return (
      <Card>
        <CardContent className="p-5 sm:p-6">
          <InsightThreePanelSkeleton />
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardContent className="p-5 sm:p-6">
          <div className="min-h-[220px] rounded-xl border border-dashed border-border/60 bg-card/30 px-4 py-6 flex flex-col items-center justify-center text-center">
            <Waypoints className="h-8 w-8 text-muted-foreground/70 mb-2" />
            <p className="text-sm font-medium text-muted-foreground">{t("noData")}</p>
            <p className="text-xs text-muted-foreground/80 mt-1 max-w-xs">{emptyHint}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-6">
        {/* Pie Chart */}
        <Card className="min-w-0 md:col-span-1 xl:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t("title")}</CardTitle>
          </CardHeader>
          <CardContent className="pt-2 pb-4">
            <div className="h-[165px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value" isAnimationActive={false}>
                    {chartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                  </Pie>
                  <RechartsTooltip content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload;
                      return (
                        <div className="bg-background border border-border p-3 rounded-lg shadow-lg">
                          <div className="mb-1 inline-flex items-center gap-1.5">
                            <CountryFlag country={item.countryCode} className="h-3.5 w-5" />
                            <p className="font-medium text-sm">{item.name}</p>
                          </div>
                          <div className="space-y-1 text-xs">
                            <p className="text-muted-foreground">{formatBytes(item.value)}</p>
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1 border-t border-border/50 pt-2">
                              <span className="text-blue-500">
                                ↓ {statsT("peakDownload")}
                              </span>
                              <span className="text-right tabular-nums">
                                {formatRate(item.maxDownloadPerSecond)}
                              </span>
                              <span className="text-purple-500">
                                ↑ {statsT("peakUpload")}
                              </span>
                              <span className="text-right tabular-nums">
                                {formatRate(item.maxUploadPerSecond)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {topProxies.length > 0 && (
              <div className="mt-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider text-center">Top 4</p>
                <div className="mt-1 space-y-1.5">
                  {topProxies.map((item, idx) => {
                    const rankBadgeClass = idx === 0 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" : idx === 1 ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" : idx === 2 ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" : "bg-muted text-muted-foreground";
                    return (
                      <div key={item.rawName} title={item.name} className="flex items-center gap-1.5 min-w-0">
                        <span className={cn("w-5 h-5 rounded-md text-[10px] font-bold flex items-center justify-center shrink-0", rankBadgeClass)}>{idx + 1}</span>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium text-white/90 truncate min-w-0" style={{ backgroundColor: item.color }}>
                          <CountryFlag country={item.countryCode} className="h-3 w-4" />
                          <span className="truncate min-w-0">{item.name}</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Proxy List */}
        <Card className="min-w-0 md:col-span-1 xl:col-span-4">
          <CardContent className="p-3">
            <ProxyNodeList
              proxies={proxyData}
              sortBy={sortBy}
              onSortChange={setSortBy}
              onSelect={handleProxyClick}
              selectedProxy={selectedProxy}
              scrollHeightClassName="h-[280px]"
              showPeakRates
              peakDownloadLabel={statsT("peakDownload")}
              peakUploadLabel={statsT("peakUpload")}
              title={t("proxyNodes")}
              emptyTitle={t("noData")}
              emptyHint={emptyHint}
            />
          </CardContent>
        </Card>

        {/* Top Domains Chart */}
        <Card className="min-w-0 md:col-span-2 xl:col-span-5" ref={topDomainsCardRef}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2"><BarChart3 className="h-4 w-4" />{domainsT("title")}</CardTitle>
              {selectedProxyData && (
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CountryFlag country={selectedProxyData.countryCode} className="h-3.5 w-5" />
                  <span>{selectedProxyData.name}</span>
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (<InsightChartSkeleton />
            ) : domainChartData.length === 0 ? (
              <div className="h-[280px] rounded-xl border border-dashed border-border/60 bg-card/30 px-4 py-5 flex flex-col items-center justify-center text-center">
                <BarChart3 className="h-5 w-5 text-muted-foreground/70 mb-2" />
                <p className="text-sm font-medium text-muted-foreground">{domainsT("noData")}</p>
                <p className="text-xs text-muted-foreground/80 mt-1 max-w-xs">{emptyHint}</p>
              </div>
            ) : (
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={domainChartData} layout="vertical" margin={{ left: 0, right: showDomainBarLabels ? 70 : 10, top: 5, bottom: 5 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <RechartsTooltip content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (<div className="bg-background border border-border p-3 rounded-lg shadow-lg min-w-[160px]"><div className="flex items-center gap-2 mb-2 pb-2 border-b border-border/50"><Favicon domain={item.fullName} size="sm" /><span className="font-medium text-sm truncate max-w-[180px]" title={item.fullName}>{item.fullName}</span></div><div className="space-y-2 text-xs"><div className="flex justify-between items-center"><span className="text-muted-foreground">{t("total")}</span><span className="font-semibold">{formatBytes(item.total)}</span></div><div className="flex justify-between items-center"><span className="text-blue-500">{t("download")}</span><span>{formatBytes(item.download)}</span></div><div className="flex justify-between items-center"><span className="text-purple-500">{t("upload")}</span><span>{formatBytes(item.upload)}</span></div><div className="flex justify-between items-center pt-1 border-t border-border/50"><span className="text-emerald-500">{t("connections")}</span><span>{formatNumber(item.connections)}</span></div></div></div>);
                      }
                      return null;
                    }} cursor={{ fill: "rgba(128, 128, 128, 0.1)" }} />
                    <Bar dataKey="total" radius={[0, 4, 4, 0]} maxBarSize={24} isAnimationActive={false}>
                      {domainChartData.map((entry, index) => (<BarCell key={`cell-${index}`} fill={entry.color} />))}
                      {showDomainBarLabels && (<LabelList dataKey="total" position="right" content={renderCustomBarLabel} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom: Tabs with shared table components */}
      {selectedProxy && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="glass">
            <TabsTrigger value="domains">{domainsT("domainList")}</TabsTrigger>
            <TabsTrigger value="ips">{domainsT("ipList")}</TabsTrigger>
          </TabsList>
          <TabsContent value="domains" className="mt-4">
            <DomainStatsTable
              domains={proxyDomains}
              loading={loading}
              pageSize={detailPageSize}
              onPageSizeChange={setDetailPageSize}
              activeBackendId={activeBackendId}
              timeRange={timeRange}
              sourceChain={selectedProxy}
              richExpand
              showProxyColumn={false}
              showProxyTrafficInExpand={false}
            />
          </TabsContent>
          <TabsContent value="ips" className="mt-4">
            <IPStatsTable
              ips={proxyIPs}
              loading={loading}
              pageSize={detailPageSize}
              onPageSizeChange={setDetailPageSize}
              activeBackendId={activeBackendId}
              timeRange={timeRange}
              sourceChain={selectedProxy}
              richExpand
              showProxyColumn={false}
              showProxyTrafficInExpand={false}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
