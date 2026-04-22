/**
 * Shared Batch Buffer
 *
 * Extracts the common BatchBuffer class, TrafficUpdate / GeoIPResult interfaces,
 * and toMinuteKey helper used by both collector.ts and surge-collector.ts.
 */
import type { StatsDatabase } from "../db/db.js";
import type { GeoIPService } from "../geo/geo.service.js";
import {
  getClickHouseWriter,
  type TrafficWriteOutcome,
} from "../clickhouse/clickhouse.writer.js";
import { shouldSkipSqliteStatsWrites } from "../stats/stats-write-mode.js";

export interface TrafficUpdate {
  domain: string;
  ip: string;
  chain: string;
  chains: string[];
  rule: string;
  rulePayload: string;
  upload: number;
  download: number;
  connections?: number;
  sourceIP?: string;
  sampleDurationMs?: number;
  timestampMs?: number;
}

export interface GeoIPResult {
  ip: string;
  geo: {
    country: string;
    country_name: string;
    continent: string;
  } | null;
  upload: number;
  download: number;
  connections?: number;
  timestampMs?: number;
}

function normalizeConnections(value: number | undefined): number {
  const safe =
    typeof value === "number" && Number.isFinite(value) ? value : 1;
  return Math.max(0, Math.floor(safe));
}

export function toMinuteKey(timestampMs?: number): string {
  const date = new Date(timestampMs ?? Date.now()).toISOString();
  return `${date.slice(0, 16)}:00`;
}

export interface FlushResult {
  domains: number;
  rules: number;
  trafficOk: boolean;
  countryOk: boolean;
  hasTrafficUpdates: boolean;
  hasCountryUpdates: boolean;
  hasUpdates: boolean;
  /** Pending traffic write, including detail+agg table status */
  pendingTrafficWrite?: Promise<TrafficWriteOutcome>;
  /** Pending country write */
  pendingCountryWrite?: Promise<void>;
}

type NodeSecondRate = {
  minute: string;
  node: string;
  uploadPerSecond: number;
  downloadPerSecond: number;
  lastSeen: string;
};

type NodePeak = {
  node: string;
  maxUploadPerSecond: number;
  maxDownloadPerSecond: number;
  lastSeen: string;
};

type MinuteNodePeak = {
  minute: string;
  node: string;
  maxUploadPerSecond: number;
  maxDownloadPerSecond: number;
  lastSeen: string;
};

function toSecondKey(timestampMs?: number): string {
  return new Date(timestampMs ?? Date.now()).toISOString().slice(0, 19);
}

function calculateBytesPerSecond(bytes: number, sampleDurationMs?: number): number {
  if (!Number.isFinite(bytes) || bytes <= 0) return 0;
  if (!Number.isFinite(sampleDurationMs) || sampleDurationMs === undefined || sampleDurationMs <= 0) {
    return 0;
  }
  return Math.max(0, Math.floor((bytes * 1000) / sampleDurationMs));
}

function buildFlowPath(update: TrafficUpdate): string[] {
  const ruleName =
    update.chains.length > 1
      ? update.chains[update.chains.length - 1]
      : update.rulePayload
        ? `${update.rule}(${update.rulePayload})`
        : update.rule;
  const chainParts = (update.chains.join(" > ") || update.chain || "DIRECT")
    .split(">")
    .map((part) => part.trim())
    .filter(Boolean);

  if (chainParts.length === 0) {
    return [];
  }

  const exactIndex = chainParts.findIndex((part) => part === ruleName);
  if (exactIndex !== -1) {
    return chainParts.slice(0, exactIndex + 1).reverse();
  }

  const reversed = [...chainParts].reverse();
  if (reversed[0] === ruleName) {
    return reversed;
  }

  return [ruleName, ...reversed];
}

export class BatchBuffer {
  private buffer: Map<string, TrafficUpdate> = new Map();
  private nodeSecondBuffer: Map<string, NodeSecondRate> = new Map();
  private geoQueue: GeoIPResult[] = [];
  private lastLogTime = 0;
  private logCounter = 0;

  private recordNodeRate(update: TrafficUpdate) {
    const uploadPerSecond = calculateBytesPerSecond(
      update.upload,
      update.sampleDurationMs,
    );
    const downloadPerSecond = calculateBytesPerSecond(
      update.download,
      update.sampleDurationMs,
    );
    if (uploadPerSecond <= 0 && downloadPerSecond <= 0) {
      return;
    }

    const flowPath = buildFlowPath(update);
    if (flowPath.length === 0) {
      return;
    }

    const minute = toMinuteKey(update.timestampMs);
    const second = toSecondKey(update.timestampMs);
    const lastSeen = new Date(update.timestampMs ?? Date.now()).toISOString();

    for (const node of flowPath) {
      const key = `${second}:${node}`;
      const existing = this.nodeSecondBuffer.get(key);
      if (existing) {
        existing.uploadPerSecond += uploadPerSecond;
        existing.downloadPerSecond += downloadPerSecond;
        if (lastSeen > existing.lastSeen) {
          existing.lastSeen = lastSeen;
        }
      } else {
        this.nodeSecondBuffer.set(key, {
          minute,
          node,
          uploadPerSecond,
          downloadPerSecond,
          lastSeen,
        });
      }
    }
  }

  private buildNodePeakMaps(): {
    minuteNodeMap: Map<string, MinuteNodePeak>;
    nodePeakMap: Map<string, NodePeak>;
  } {
    const minuteNodeMap = new Map<string, MinuteNodePeak>();
    const nodePeakMap = new Map<string, NodePeak>();

    for (const item of this.nodeSecondBuffer.values()) {
      const minuteKey = `${item.minute}:${item.node}`;
      const minuteExisting = minuteNodeMap.get(minuteKey);
      if (minuteExisting) {
        minuteExisting.maxUploadPerSecond = Math.max(
          minuteExisting.maxUploadPerSecond,
          item.uploadPerSecond,
        );
        minuteExisting.maxDownloadPerSecond = Math.max(
          minuteExisting.maxDownloadPerSecond,
          item.downloadPerSecond,
        );
        if (item.lastSeen > minuteExisting.lastSeen) {
          minuteExisting.lastSeen = item.lastSeen;
        }
      } else {
        minuteNodeMap.set(minuteKey, {
          minute: item.minute,
          node: item.node,
          maxUploadPerSecond: item.uploadPerSecond,
          maxDownloadPerSecond: item.downloadPerSecond,
          lastSeen: item.lastSeen,
        });
      }

      const nodeExisting = nodePeakMap.get(item.node);
      if (nodeExisting) {
        nodeExisting.maxUploadPerSecond = Math.max(
          nodeExisting.maxUploadPerSecond,
          item.uploadPerSecond,
        );
        nodeExisting.maxDownloadPerSecond = Math.max(
          nodeExisting.maxDownloadPerSecond,
          item.downloadPerSecond,
        );
        if (item.lastSeen > nodeExisting.lastSeen) {
          nodeExisting.lastSeen = item.lastSeen;
        }
      } else {
        nodePeakMap.set(item.node, {
          node: item.node,
          maxUploadPerSecond: item.uploadPerSecond,
          maxDownloadPerSecond: item.downloadPerSecond,
          lastSeen: item.lastSeen,
        });
      }
    }

    return { minuteNodeMap, nodePeakMap };
  }

  add(backendId: number, update: TrafficUpdate) {
    this.recordNodeRate(update);
    const minuteKey = toMinuteKey(update.timestampMs);
    const fullChain = update.chains.join(" > ");
    const key = [
      backendId,
      minuteKey,
      update.domain,
      update.ip,
      update.chain,
      fullChain,
      update.rule,
      update.rulePayload,
      update.sourceIP || "",
    ].join(":");
    const existing = this.buffer.get(key);
    const connections = normalizeConnections(update.connections);

    if (existing) {
      existing.upload += update.upload;
      existing.download += update.download;
      existing.connections =
        normalizeConnections(existing.connections) + connections;
      if ((update.timestampMs ?? 0) > (existing.timestampMs ?? 0)) {
        existing.timestampMs = update.timestampMs;
      }
    } else {
      this.buffer.set(key, { ...update, connections });
    }
  }

  addGeoResult(result: GeoIPResult) {
    this.geoQueue.push(result);
  }

  size(): number {
    return this.buffer.size;
  }

  hasPending(): boolean {
    return this.buffer.size > 0 || this.geoQueue.length > 0;
  }

  clear(): void {
    this.buffer.clear();
    this.nodeSecondBuffer.clear();
    this.geoQueue = [];
  }

  flush(
    db: StatsDatabase,
    _geoService: GeoIPService | undefined,
    backendId: number,
    logPrefix = "Collector",
  ): FlushResult {
    const clickHouseWriter = getClickHouseWriter();
    const skipSqliteStatsWrites = shouldSkipSqliteStatsWrites(
      clickHouseWriter.isHealthy(),
    );
    const updates = Array.from(this.buffer.values());
    const { minuteNodeMap, nodePeakMap } = this.buildNodePeakMaps();
    const geoResults = [...this.geoQueue];

    // Calculate unique domains and rules for logging
    const domains = new Set<string>();
    const rules = new Set<string>();

    for (const update of updates) {
      if (update.domain) domains.add(update.domain);
      const initialRule =
        update.chains.length > 0
          ? update.chains[update.chains.length - 1]
          : "DIRECT";
      rules.add(initialRule);
    }

    let trafficOk = true;
    let countryOk = true;
    const hasTrafficUpdates = updates.length > 0;
    let hasCountryUpdates = false;
    let pendingTrafficWrite: Promise<TrafficWriteOutcome> | undefined;
    let pendingCountryWrite: Promise<void> | undefined;

    if (hasTrafficUpdates) {
      try {
        const reduceSQLiteWrites = clickHouseWriter.isHealthy() && process.env.CH_DISABLE_SQLITE_REDUCTION !== '1';
        if (!skipSqliteStatsWrites) {
          db.batchUpdateTrafficStats(backendId, updates, reduceSQLiteWrites, {
            minuteNodeMap,
            nodePeakMap,
          });
        }
        if (clickHouseWriter.isEnabled()) {
          pendingTrafficWrite = clickHouseWriter.writeTrafficBatch(
            backendId,
            updates,
          );
        }
      } catch (err) {
        trafficOk = false;
        console.error(`[${logPrefix}:${backendId}] Batch write failed:`, err);
      }
    }

    if (trafficOk) {
      this.buffer.clear();
      this.nodeSecondBuffer.clear();
    }

    if (geoResults.length > 0) {
      try {
        const countryUpdates = geoResults
          .filter(
            (r): r is GeoIPResult & { geo: NonNullable<GeoIPResult["geo"]> } =>
              r.geo !== null,
          )
          .map((r) => ({
            country: r.geo.country || 'Unknown',
            countryName: r.geo.country_name || r.geo.country || 'Unknown',
            continent: r.geo.continent || 'Unknown',
            upload: r.upload,
            download: r.download,
            connections: Math.max(0, Math.floor(r.connections ?? 1)),
            timestampMs: r.timestampMs,
          }));
        hasCountryUpdates = countryUpdates.length > 0;
        if (hasCountryUpdates) {
          if (!skipSqliteStatsWrites) {
            db.batchUpdateCountryStats(backendId, countryUpdates);
          }
          if (clickHouseWriter.isEnabled()) {
            pendingCountryWrite = clickHouseWriter.writeCountryBatch(
              backendId,
              countryUpdates,
            );
          }
        }
      } catch (err) {
        countryOk = false;
        console.error(
          `[${logPrefix}:${backendId}] Country batch write failed:`,
          err,
        );
      }
    }

    if (countryOk) {
      this.geoQueue = [];
    }

    return {
      domains: domains.size,
      rules: rules.size,
      trafficOk,
      countryOk,
      hasTrafficUpdates,
      hasCountryUpdates,
      hasUpdates: hasTrafficUpdates || hasCountryUpdates,
      pendingTrafficWrite,
      pendingCountryWrite,
    };
  }

  shouldLog(): boolean {
    const now = Date.now();
    if (now - this.lastLogTime > 10000) {
      this.lastLogTime = now;
      return true;
    }
    return false;
  }

  incrementLogCounter(): number {
    return ++this.logCounter;
  }
}
