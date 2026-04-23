import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function formatTrafficUnitValue(value: number, unitIndex: number): string {
  if (!Number.isFinite(value)) {
    return "0";
  }
  if (unitIndex <= 1) {
    return Math.round(value).toString();
  }
  return value.toFixed(2);
}

function formatTrafficUnits(value: number, suffix = ""): string {
  const normalizedValue = Number(value);
  if (!Number.isFinite(normalizedValue) || normalizedValue === 0) return `0 B${suffix}`;
  if (normalizedValue < 0) return `-${formatTrafficUnits(-normalizedValue, suffix)}`;

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB"];
  const exponent = Math.log(normalizedValue) / Math.log(k);
  const rawIndex = Number.isFinite(exponent) ? Math.floor(exponent) : 0;
  const i = rawIndex < 0 ? 0 : Math.min(rawIndex, sizes.length - 1);
  const unit = sizes[i] ?? "B";
  const scaled = normalizedValue / Math.pow(k, i);
  const safeScaled = Number.isFinite(scaled) ? scaled : 0;

  return `${formatTrafficUnitValue(safeScaled, i)} ${unit}${suffix}`;
}

export function formatBytes(bytes: number, _decimals = 2): string {
  return formatTrafficUnits(bytes);
}

export function formatRateBytes(bytesPerSecond: number): string {
  return formatTrafficUnits(bytesPerSecond, "/s");
}

export function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
}

function parseApiTimestamp(dateString: string): Date {
  const raw = (dateString || "").trim();
  if (!raw) return new Date(Number.NaN);

  const hasTimezone = /(?:Z|[+-]\d{2}:\d{2})$/i.test(raw);
  if (hasTimezone) {
    return new Date(raw);
  }

  // Range-query rows may return minute keys like "2026-02-08T13:21:00"
  // without timezone info. Treat them as UTC to avoid local-time offsets.
  const isoNoTimezone = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(raw);
  if (isoNoTimezone) {
    return new Date(`${raw}Z`);
  }

  // SQLite CURRENT_TIMESTAMP style: "YYYY-MM-DD HH:MM:SS"
  const sqliteUtc = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(raw);
  if (sqliteUtc) {
    return new Date(raw.replace(" ", "T") + "Z");
  }

  return new Date(raw);
}

export function formatDuration(dateString: string): string {
  const date = parseApiTimestamp(dateString);
  if (Number.isNaN(date.getTime())) return "-";

  const now = new Date();
  const diff = Math.max(0, now.getTime() - date.getTime());

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return `${seconds}s ago`;
}
