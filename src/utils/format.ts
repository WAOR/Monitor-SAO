const UNITS = ["B", "KB", "MB", "GB", "TB", "PB"] as const;
const CLOCK_TIME_FORMATTER = new Intl.DateTimeFormat("zh-CN", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
const CLOCK_TIME_DETAILED_FORMATTER = new Intl.DateTimeFormat("zh-CN", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});
const TRAFFIC_RATE_THRESHOLDS: Array<{ unit: Exclude<TrafficRateUnit, "bps">; divisor: number }> = [
  { unit: "Tbps", divisor: 1_000_000_000_000 },
  { unit: "Gbps", divisor: 1_000_000_000 },
  { unit: "Mbps", divisor: 1_000_000 },
  { unit: "Kbps", divisor: 1_000 },
];
export const LONG_TERM_EXPIRE_DAYS = 36500;

type ExpireTone = "ok" | "warn" | "critical" | "long" | "none";
type TrafficRateUnit = "bps" | "Kbps" | "Mbps" | "Gbps" | "Tbps";

interface TrafficRateDisplay {
  value: string;
  unit: TrafficRateUnit;
}

export function trimFixed(value: number, digits: number): string {
  if (!Number.isFinite(value)) return "0";
  return value
    .toFixed(digits)
    .replace(/\.0+$/, "")
    .replace(/(\.\d*?[1-9])0+$/, "$1");
}

export function joinDisplayParts(parts: Array<string | null | undefined>) {
  return parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(" · ");
}

export function formatBytes(n: number | undefined | null): string {
  if (!n || n < 0 || !Number.isFinite(n)) return "0 B";
  let idx = 0;
  let v = n;
  while (v >= 1024 && idx < UNITS.length - 1) {
    v /= 1024;
    idx += 1;
  }
  if (idx === 0) return `${Math.round(v)} ${UNITS[idx]}`;
  const dec = v >= 100 ? 0 : v >= 10 ? 1 : 2;
  return `${v.toFixed(dec)} ${UNITS[idx]}`;
}

/** 只显示时分（本地时区），用于峰值时间、更新时间等场景。 */
export function formatClockTime(timeMs: number | null | undefined): string {
  if (timeMs == null || !Number.isFinite(timeMs)) return "—";
  return CLOCK_TIME_FORMATTER.format(timeMs);
}

/** 显示时分秒（本地时区），用于精确展示刷新时间点。 */
export function formatClockTimeDetailed(timeMs: number | null | undefined): string {
  if (timeMs == null || !Number.isFinite(timeMs)) return "—";
  return CLOCK_TIME_DETAILED_FORMATTER.format(timeMs);
}

function formatRateValue(value: number): string {
  if (value >= 100) return Math.round(value).toString();
  if (value >= 10) return trimFixed(value, 1);
  // 只会以 bitsPerSec / divisor 的形式调用,且 bitsPerSec >= divisor,所以 value 恒 >= 1,
  // 不存在小于 1 的分支。
  return trimFixed(value, 2);
}

function formatTrafficRate(bytesPerSec: number | undefined | null): TrafficRateDisplay {
  if (!bytesPerSec || !Number.isFinite(bytesPerSec) || bytesPerSec <= 0) {
    return {
      value: "0",
      unit: "bps",
    };
  }

  const bitsPerSec = bytesPerSec * 8;
  for (const { unit, divisor } of TRAFFIC_RATE_THRESHOLDS) {
    if (bitsPerSec >= divisor) {
      return {
        value: formatRateValue(bitsPerSec / divisor),
        unit,
      };
    }
  }

  return {
    value: bitsPerSec >= 100 ? Math.round(bitsPerSec).toString() : trimFixed(bitsPerSec, 1),
    unit: "bps",
  };
}

export function formatTrafficRateLabel(bytesPerSec: number | undefined | null): string {
  const rate = formatTrafficRate(bytesPerSec);
  return `${rate.value} ${rate.unit}`;
}

export interface ByteRateDisplay {
  value: string;
  unit: string;
}

// 按字节算的速率(KB/s · MB/s · GB/s · TB/s)——和 formatBytes 同一套 1024 进制,只是加了 "/s" 后缀。
// 用在传输速度按字节比按比特更自然的地方(如首页实时带宽和节点卡速度),而不是 bps/Kbps/Mbps。
export function formatByteRate(bytesPerSec: number | undefined | null): ByteRateDisplay {
  const [value, unit = "B"] = formatBytes(bytesPerSec).split(" ");
  return { value, unit: `${unit}/s` };
}

export function formatByteRateLabel(bytesPerSec: number | undefined | null): string {
  const { value, unit } = formatByteRate(bytesPerSec);
  return `${value} ${unit}`;
}

export function formatUptimeDays(seconds: number): { value: string; unit: string } {
  if (!Number.isFinite(seconds) || seconds <= 0) return { value: "—", unit: "" };
  const days = seconds / 86400;
  if (days >= 1) return { value: Math.floor(days).toString(), unit: "天" };
  const hours = seconds / 3600;
  if (hours >= 1) return { value: Math.floor(hours).toString(), unit: "小时" };
  // 不足 1 分钟向上取整,避免刚上线显示成「0 分钟」而 <=0 又显示「—」的口径分裂。
  const minutes = Math.max(1, Math.floor(seconds / 60));
  return { value: minutes.toString(), unit: "分钟" };
}

// 将 `expired_at` 解析为毫秒；空值、Go 零时和 0/-1 哨兵均表示无到期。
export function resolveExpireTimestamp(
  iso: string | number | null | undefined,
): number | null {
  if (iso == null) return null;
  const raw = String(iso).trim();
  if (raw === "") return null;
  if (/^-?\d+$/.test(raw)) {
    const n = Number(raw);
    if (n <= 0) return null; // 0 / -1 "无到期" 哨兵值
    return n < 1e12 ? n * 1000 : n; // unix 秒 vs. 毫秒
  }
  const ts = Date.parse(raw);
  if (Number.isNaN(ts) || ts <= 0) return null; // 无法解析或 Go 零时
  return ts;
}

export function getExpireDaysRemaining(
  iso: string | number | null | undefined,
  now = Date.now(),
  expiresIn?: number | null,
): number | null {
  // Hub 1.2.0+ 返回 expires_in：按 hub 所在日期的剩余天数，0 为今天，负数为已过期，null 为无到期日。
  // 必须优先使用它，避免访客不同时区产生提前显示「已过期」问题。
  if (expiresIn !== undefined) {
    if (expiresIn === null) return null;
    return Number.isFinite(expiresIn) ? Math.floor(expiresIn) : null;
  }
  const ts = resolveExpireTimestamp(iso);
  if (ts == null || !Number.isFinite(now)) return null;
  return Math.floor((ts - now) / 86400000);
}

function resolveExpireTone(days: number | null | undefined): ExpireTone {
  if (days == null || !Number.isFinite(days)) return "none";
  if (days > LONG_TERM_EXPIRE_DAYS) return "long";
  if (days > 30) return "ok";
  if (days > 7) return "warn";
  return "critical";
}

export function formatExpireDays(
  iso: string | null | undefined,
  now = Date.now(),
  expiresIn?: number | null,
): { value: string; unit: string; tone: ExpireTone } {
  const days = getExpireDaysRemaining(iso, now, expiresIn);
  const tone = resolveExpireTone(days);
  if (days == null) return { value: "—", unit: "", tone };
  if (tone === "long") return { value: "长期", unit: "", tone };
  if (days > 0) return { value: days.toString(), unit: "天", tone };
  if (days === 0) return { value: "今日", unit: "", tone };
  return { value: "已过期", unit: "", tone };
}

function inferPlainTagColor(label: string): string {
  const normalized = label.trim().toLowerCase();

  if (/(cn2gia|9929|cmin2)/i.test(normalized)) {
    return "blue";
  }

  if (/(163pp|163|4837|cmi)/i.test(normalized)) {
    return "green";
  }

  return "violet";
}

/** 把 `tag1<color>;tag2<color2>` (支持中英文分号/逗号分隔) 解析成 [{ label, color }]。 */
export function parseTags(raw: string | undefined | null): Array<{ label: string; color: string }> {
  if (!raw) return [];
  return raw
    .split(/[;,；，]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((item) => {
      const m = item.match(/^(.*?)<([a-zA-Z]+)>$/);
      if (m) return { label: m[1].trim(), color: m[2].toLowerCase() };
      return { label: item, color: inferPlainTagColor(item) };
    });
}

/**
 * 格式化节点离线时长（极简探针 1.4.0+ 规范）
 *
 * 规范要点：
 * 1. 优先使用 hub 计算的 last_seen_ago（秒数，按 hub 时钟计算），不拿 last_seen 减客户端时间，
 *    避免双系统、东八区时差或访客电脑时间不准导致算出负数或刚离线就显示离线 8 小时。
 * 2. 旧版 hub (1.3.2 及更早) 没有该 key 时，降级使用客户端时钟与 lastSeenSec 计算差值。
 * 3. 从未上报过时返回 null。
 */
export function formatOfflineDuration(
  lastSeenAgo?: number | null,
  lastSeenSec?: number | null,
  nowMs = Date.now(),
): string | null {
  let seconds: number | null = null;
  if (lastSeenAgo !== undefined) {
    if (lastSeenAgo === null) return null;
    seconds = Math.max(0, Math.floor(lastSeenAgo));
  } else if (lastSeenSec && lastSeenSec > 0) {
    const diff = Math.floor(nowMs / 1000) - lastSeenSec;
    seconds = Math.max(0, diff);
  }

  if (seconds == null) return null;
  if (seconds < 60) return "刚刚离线";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `离线 ${minutes} 分钟`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `离线 ${hours} 小时`;
  const days = Math.floor(hours / 24);
  return `离线 ${days} 天`;
}

export function formatCompactOfflineDuration(
  lastSeenAgo?: number | null,
  lastSeenSec?: number | null,
  nowMs = Date.now(),
): string | null {
  let seconds: number | null = null;
  if (lastSeenAgo !== undefined) {
    if (lastSeenAgo === null) return null;
    seconds = Math.max(0, Math.floor(lastSeenAgo));
  } else if (lastSeenSec && lastSeenSec > 0) {
    const diff = Math.floor(nowMs / 1000) - lastSeenSec;
    seconds = Math.max(0, diff);
  }

  if (seconds == null) return null;
  if (seconds < 60) return "刚刚离线";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `离线 ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `离线 ${hours}h`;
  const days = Math.floor(hours / 24);
  return `离线 ${days}d`;
}

