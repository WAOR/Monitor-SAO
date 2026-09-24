import type {
  AdminClient,
  LoadRecord,
  LoadRecordsResponse,
  Me,
  NodeInfo,
  PingRecord,
  PingRecordsResponse,
  PingTask,
  PingTaskStats,
  PublicConfig,
  ThemeSettings,
} from "@/types/komari";
import {
  convertMonitorNodeToInfo,
  convertMonitorNodeToMetrics,
  safeMonitorNodes,
  type MonitorHistoryPoint,
  type MonitorMe,
  type MonitorMetricsHistoryResponse,
} from "@/types/monitor";
import {
  getLocalThemeSettings,
  replaceLocalThemeSettings,
  saveLocalThemeSettings,
} from "@/services/themeSettingsStore";
import { getRawNode } from "@/services/wsStore";
import {
  THEME_CONFIG_KEYS,
  THEME_CONFIG_KEYS_SET,
  normalizeThemeSettings,
} from "@/utils/themeSettings";
import type { TrafficMetricSeries } from "@/utils/trafficStats";

export const ADMIN_USERNAME_KEY = "sao_admin_username";

export class ApiRequestError extends Error {
  status: number;
  endpoint: string;

  constructor(message: string, status: number, endpoint: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.endpoint = endpoint;
  }
}

export class MetricApiUnavailableError extends Error {
  constructor(message = "Metric API is not available") {
    super(message);
    this.name = "MetricApiUnavailableError";
  }
}

export function warnDegradedOnce(_key: string, _message: string): void {
  // no-op
}

export interface RequestOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
  timeout?: number;
  skipMetricQuery?: boolean;
  forceRefresh?: boolean;
}

export interface TodayTrafficMetricsResponse {
  series: TrafficMetricSeries[];
  rangeStartMs: number;
  rangeEndMs: number;
  intervalSeconds: number;
}

/**
 * 基础 API fetch 工具
 */
async function apiFetch<T>(path: string, options?: RequestOptions & RequestInit): Promise<T> {
  const timeoutVal = options?.timeoutMs ?? options?.timeout ?? 15000;
  const { signal, ...restInit } = options || {};
  const controller = new AbortController();

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  if (timeoutVal > 0) {
    timeoutId = setTimeout(() => controller.abort(), timeoutVal);
  }

  const handleAbort = () => controller.abort();
  if (signal) {
    signal.addEventListener("abort", handleAbort, { once: true });
  }

  try {
    const res = await fetch(path, {
      credentials: "include",
      ...restInit,
      signal: controller.signal,
      headers: restInit.body
        ? { "Content-Type": "application/json", ...restInit.headers }
        : restInit.headers,
    });

    if (!res.ok) {
      const errText = (await res.text().catch(() => "")) || res.statusText;
      throw new ApiRequestError(errText || `Request failed with status ${res.status}`, res.status, path);
    }

    if (res.status === 204) {
      return undefined as T;
    }

    return (await res.json()) as T;
  } catch (error) {
    if (error instanceof ApiRequestError) throw error;
    const msg = error instanceof Error ? error.message : String(error);
    throw new ApiRequestError(msg, 0, path);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
    if (signal) signal.removeEventListener("abort", handleAbort);
  }
}

/** 从 localStorage 读取管理员自定义昵称 */
export function extractUsernameFromStorage(): string {
  if (typeof window === "undefined" || !window.localStorage) return "";
  try {
    const val = window.localStorage.getItem(ADMIN_USERNAME_KEY);
    if (typeof val === "string") {
      const sanitized = val.replace(/[\x00-\x1F\x7F]/g, "").trim();
      if (sanitized && sanitized.toLowerCase() !== "admin" && sanitized.length <= 40) {
        return sanitized;
      }
    }
  } catch {}
  return "";
}

export const THEME_SHORT = "sao";

/** 解析当前登录用户的显示名称，优先级：服务端主题配置 -> Storage 自定义昵称 -> 保底 "Admin" */
export function resolveAuthUsername(authed = true): string {
  if (!authed) return "";
  if (serverThemeSettingsCache && typeof serverThemeSettingsCache.adminNickname === "string") {
    const fromServer = serverThemeSettingsCache.adminNickname.trim();
    if (fromServer && fromServer.toLowerCase() !== "admin") {
      return fromServer;
    }
  }
  const fromStorage = extractUsernameFromStorage();
  if (fromStorage) return fromStorage;
  return "Admin";
}

/** 保存自定义昵称：本地即时响应 + 服务端官方接口持久化 */
export function saveAdminUsername(nickname: string): Promise<void> {
  const sanitized = nickname.replace(/[\x00-\x1F\x7F]/g, "").trim().slice(0, 40);
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      if (sanitized) {
        window.localStorage.setItem(ADMIN_USERNAME_KEY, sanitized);
        saveLocalThemeSettings({ ...getLocalThemeSettings(), adminNickname: sanitized });
      } else {
        window.localStorage.removeItem(ADMIN_USERNAME_KEY);
        const next = { ...getLocalThemeSettings() };
        delete next.adminNickname;
        saveLocalThemeSettings(next);
      }
    } catch {}
  }
  if (serverThemeSettingsCache) {
    serverThemeSettingsCache.adminNickname = sanitized;
  }
  // 仅在真实浏览器运行环境下异步同步到服务端数据库持久化
  if (
    typeof window !== "undefined" &&
    typeof window.location !== "undefined" &&
    Boolean(window.location.origin)
  ) {
    return saveThemeSettings({ adminNickname: sanitized }).catch(() => {});
  }
  return Promise.resolve();
}

/** 消费早期预取的 /api/me 请求 (若存在) */
async function fetchMeWithEarlyData(options?: RequestOptions): Promise<MonitorMe> {
  const early =
    typeof window !== "undefined"
      ? (window as unknown as { __EARLY_DATA__?: { me?: Promise<MonitorMe | null> | null } })
          .__EARLY_DATA__?.me
      : null;
  if (early) {
    try {
      const data = await early;
      if (data && typeof data === "object" && ("site_name" in data || "authed" in data)) {
        return data;
      }
    } catch {}
  }
  return apiFetch<MonitorMe>("/api/me", options);
}

/** 获取当前登录态 /api/me */
export async function getMe(options?: RequestOptions): Promise<Me> {
  const data = await fetchMeWithEarlyData(options);
  const username = data.authed ? resolveAuthUsername(true) : "";

  return {
    logged_in: data.authed,
    username,
    uuid: "",
  };
}

let serverThemeSettingsCache: Record<string, unknown> | null = null;
let serverThemeConfigFetched = false;

export function clearServerThemeSettingsCache(): void {
  serverThemeSettingsCache = null;
  serverThemeConfigFetched = false;
}

/**
 * 获取服务端持久化的主题配置 GET /api/themes/{short}/config
 * 官方标准：401、404 与网络错误一律按默认值兜底，平滑降级，不抛出异常破坏页面渲染
 */
export async function fetchServerThemeConfig(options?: RequestOptions): Promise<Record<string, unknown>> {
  if (serverThemeSettingsCache !== null) {
    return serverThemeSettingsCache;
  }
  if (typeof window === "undefined" || typeof fetch === "undefined") {
    return {};
  }

  // 1. 优先请求官方标准接口 GET /api/themes/{short}/config
  try {
    const res = await fetch(`/api/themes/${THEME_SHORT}/config`, {
      cache: "no-cache",
      signal: options?.signal,
    });
    if (res.ok) {
      const contentType = res.headers.get("content-type") ?? "";
      if (contentType.includes("application/json") || !contentType.includes("text/html")) {
        const data: unknown = await res.json();
        if (data && typeof data === "object" && !Array.isArray(data)) {
          serverThemeSettingsCache = data as Record<string, unknown>;
          serverThemeConfigFetched = true;
          return serverThemeSettingsCache;
        }
      }
    }
  } catch {}

  // 2. 兼容回退：探测部署根目录历史遗留的静态全站配置 (sao-config.json)
  const candidateUrls = ["./sao-config.json", "/sao-config.json"];
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), 800) : null;

  try {
    const fetchPromises = candidateUrls.map(async (url) => {
      const res = await fetch(url, {
        cache: "no-cache",
        signal: controller?.signal,
      });
      const contentType = res.headers.get("content-type") ?? "";
      if (res.ok && !contentType.includes("text/html")) {
        const text = await res.text();
        if (text.trim().startsWith("{")) {
          const data: unknown = JSON.parse(text);
          if (data && typeof data === "object" && !Array.isArray(data)) {
            return data as Record<string, unknown>;
          }
        }
      }
      throw new Error("Invalid config");
    });

    const resolved = await Promise.any(fetchPromises);
    serverThemeSettingsCache = resolved;
    serverThemeConfigFetched = true;
    return serverThemeSettingsCache;
  } catch {
    serverThemeSettingsCache = {};
    serverThemeConfigFetched = false;
    return serverThemeSettingsCache;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

/** 兼容旧命名导出 */
export const fetchStaticThemeSettings = fetchServerThemeConfig;

/** 获取站点全局配置 - 并发请求与早期数据优化 */
export async function getPublic(options?: RequestOptions): Promise<PublicConfig> {
  // 确保重新获取配置时从网络拉取最新的服务端主题配置，而不是死死卡在单例内存变量中
  clearServerThemeSettingsCache();

  const [me, serverSettings] = await Promise.all([
    fetchMeWithEarlyData(options),
    fetchServerThemeConfig(options),
  ]);
  const localSettings = getLocalThemeSettings();

  let mergedSettings: Record<string, unknown>;

  if (serverThemeConfigFetched) {
    // 服务端官方配置成功获取，服务端为绝对唯一权威源：
    // 1. 服务端配置完整继承
    // 2. 本地存储仅保留非 schema 的复杂扩展数据（如 costPremiums/homepagePingBindings 等，若服务端未存储）
    // 3. 官方 schema 字段一律以服务端为准；若服务端未返回或已清空（如 notice），绝不允许本地旧缓存死灰复燃！
    mergedSettings = { ...serverSettings };

    for (const [key, val] of Object.entries(localSettings)) {
      if (!THEME_CONFIG_KEYS_SET.has(key) && !(key in mergedSettings)) {
        mergedSettings[key] = val;
      }
    }

    // 同步刷新本地存储，清理掉已被服务端删除或修改的 schema 字段（如已清空的公告 notice、昵称等）
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        let localDirty = false;
        const nextLocal = { ...localSettings };

        for (const key of THEME_CONFIG_KEYS) {
          if (key in serverSettings) {
            if (nextLocal[key] !== serverSettings[key]) {
              nextLocal[key] = serverSettings[key];
              localDirty = true;
            }
          } else if (key in nextLocal) {
            delete nextLocal[key];
            localDirty = true;
          }
        }

        const sName =
          typeof serverSettings.adminNickname === "string"
            ? serverSettings.adminNickname.trim()
            : "";
        if (sName) {
          window.localStorage.setItem(ADMIN_USERNAME_KEY, sName);
        } else {
          window.localStorage.removeItem(ADMIN_USERNAME_KEY);
        }

        if (localDirty) {
          replaceLocalThemeSettings(nextLocal);
        }
      } catch {}
    }
  } else {
    // 离线或服务端接口异常时：以本地快照垫底兜底
    mergedSettings = {
      ...localSettings,
      ...serverSettings,
    };
  }

  return ({
    sitename: me.site_name || "Monitor",
    description: "",
    theme: THEME_SHORT,
    version: "1.0.12",
    private_site: !me.public_page,
    theme_settings: normalizeThemeSettings(mergedSettings) as ThemeSettings,
    record_preserve_time: 168,
    ping_record_preserve_time: 24,
    allow_theme_switch: true,
  } as unknown) as PublicConfig;
}

/** 获取节点列表 */
export async function getNodes(options?: RequestOptions): Promise<NodeInfo[]> {
  const data = await apiFetch<unknown>("/api/nodes", options);
  const safeList = safeMonitorNodes(data);
  return safeList.map(convertMonitorNodeToInfo);
}

/** 获取所有节点最新状态字典 */
export async function getNodesLatestStatus(options?: RequestOptions): Promise<Record<string, unknown>> {
  const data = await apiFetch<unknown>("/api/nodes", options);
  const safeList = safeMonitorNodes(data);
  const result: Record<string, unknown> = {};

  for (const node of safeList) {
    const uuid = String(node.id);
    const metrics = convertMonitorNodeToMetrics(node);
    result[uuid] = metrics;
  }
  return result;
}

/**
 * 获取节点历史负载记录
 * GET /api/nodes/{id}/metrics?hours={hours}&points=300&series=metrics
 */
export async function getLoadRecords(
  uuid: string,
  hours: number,
  options?: RequestOptions,
): Promise<LoadRecordsResponse> {
  const queryHours = Math.max(1, Math.min(hours || 1, 168));
  const path = `/api/nodes/${encodeURIComponent(uuid)}/metrics?hours=${queryHours}&points=300&series=metrics`;

  try {
    const data = await apiFetch<MonitorMetricsHistoryResponse>(path, options);
    const records: LoadRecord[] = (data.metrics ?? []).map((m: MonitorHistoryPoint) => ({
      cpu: m.cpu,
      gpu: 0,
      ram: m.mem_used,
      ram_total: 0,
      swap: 0,
      swap_total: 0,
      load: 0,
      temp: 0,
      disk: m.disk_used,
      disk_total: 0,
      net_in: m.net_rx,
      net_out: m.net_tx,
      net_total_up: 0,
      net_total_down: 0,
      process: 0,
      connections: 0,
      connections_udp: 0,
      time: m.ts * 1000,
      client: uuid,
    }));

    return {
      count: records.length,
      records,
    };
  } catch (_error) {
    return {
      count: 0,
      records: [],
    };
  }
}

/**
 * 获取节点历史 Ping 记录与探测任务
 * GET /api/nodes/{id}/metrics?hours={hours}&points=300&series=ping
 */
export async function getPingRecords(
  uuid: string,
  hours: number,
  options?: RequestOptions,
): Promise<PingRecordsResponse> {
  const queryHours = Math.max(1, Math.min(hours || 1, 24));
  const path = `/api/nodes/${encodeURIComponent(uuid)}/metrics?hours=${queryHours}&points=300&series=ping`;

  try {
    const data = await apiFetch<MonitorMetricsHistoryResponse>(path, options);
    const records: PingRecord[] = (data.ping ?? []).map((p) => ({
      task_id: p.task_id,
      time: p.ts * 1000,
      value: p.latency ?? 0,
      client: uuid,
      loss: p.loss != null ? p.loss : p.latency === null ? 100 : 0,
    }));

    const tasks: PingTask[] = Object.entries(data.probes ?? {}).map(([idStr, name]) => {
      const id = Number(idStr);
      const loss = data.loss?.[idStr] ?? 0;
      return {
        id,
        name,
        interval: 60,
        loss,
        clients: [uuid],
        type: "icmp",
        target: "",
        weight: 0,
      };
    });

    return {
      count: records.length,
      records,
      tasks,
    };
  } catch (_error) {
    return {
      count: 0,
      records: [],
      tasks: [],
    };
  }
}

// 节点 Ping Metrics 共享请求池与短时内存缓存（彻底解决 N 节点 × M 线路重复并发轰炸）
const nodePingMetricsCache = new Map<string, { data: MonitorMetricsHistoryResponse; expiresAt: number }>();
const inFlightNodePingRequests = new Map<string, Promise<MonitorMetricsHistoryResponse>>();

async function fetchNodePingMetricsShared(
  uuid: string,
  hours: number,
  options?: RequestOptions,
): Promise<MonitorMetricsHistoryResponse> {
  const cacheKey = `${uuid}:${hours}`;
  const now = Date.now();

  const cached = nodePingMetricsCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const inFlight = inFlightNodePingRequests.get(cacheKey);
  if (inFlight) {
    return inFlight;
  }

  const promise = (async () => {
    try {
      const path = `/api/nodes/${encodeURIComponent(uuid)}/metrics?hours=${hours}&points=60&series=ping`;
      const data = await apiFetch<MonitorMetricsHistoryResponse>(path, options);
      nodePingMetricsCache.set(cacheKey, {
        data,
        expiresAt: Date.now() + 10_000,
      });
      return data;
    } finally {
      inFlightNodePingRequests.delete(cacheKey);
    }
  })();

  inFlightNodePingRequests.set(cacheKey, promise);
  return promise;
}

/** 获取首页 Ping 概览（兼容多线路与单线路探测展示） */
export async function getPingOverview(
  hours = 1,
  taskId?: number,
  options?: { signal?: AbortSignal; entityIds?: string[]; includeStats?: boolean },
): Promise<PingRecordsResponse> {
  const queryHours = Math.max(1, Math.min(hours || 1, 24));
  let nodeUuids = options?.entityIds ?? [];
  if (nodeUuids.length === 0) {
    try {
      const nodes = await getNodes(options);
      nodeUuids = nodes.map((n) => n.uuid);
    } catch {
      nodeUuids = [];
    }
  }

  const allRecords: PingRecord[] = [];
  const taskMap = new Map<number, PingTask>();
  const statsList: PingTaskStats[] = [];

  await Promise.all(
    nodeUuids.map(async (uuid) => {
      try {
        const data = await fetchNodePingMetricsShared(uuid, queryHours, options);
        if (data.probes) {
          for (const [idStr, name] of Object.entries(data.probes)) {
            const id = Number(idStr);
            if (!taskMap.has(id)) {
              taskMap.set(id, {
                id,
                name: name || `线路 #${id}`,
                interval: 60,
                loss: data.loss?.[idStr] ?? 0,
                clients: [uuid],
                type: "icmp",
                target: "",
                weight: 0,
              });
            } else {
              const item = taskMap.get(id)!;
              if (!item.clients.includes(uuid)) item.clients.push(uuid);
            }
          }
        }

        const pings = data.ping ?? [];
        for (const p of pings) {
          if (taskId != null && p.task_id !== taskId) continue;
          allRecords.push({
            task_id: p.task_id,
            time: p.ts * 1000,
            value: p.latency ?? 0,
            client: uuid,
            loss: p.loss != null ? p.loss : p.latency === null ? 100 : 0,
          });
        }
      } catch {
        // 忽略节点错误
      }
    }),
  );

  return {
    count: allRecords.length,
    records: allRecords,
    tasks: Array.from(taskMap.values()),
    stats: statsList,
    intervalSeconds: 60,
  };
}

export async function getPingOverviewStats(
  _hours: number,
  _taskIds: number[],
  _options?: RequestOptions & { entityIds?: string[] },
): Promise<PingTaskStats[]> {
  return [];
}

export function prewarmPingOverviewDependencies(): void {}

// 节点历史指标请求池与短时缓存（30s）
const nodeMetricsHistoryCache = new Map<string, { data: MonitorMetricsHistoryResponse; expiresAt: number }>();
const inFlightNodeMetricsRequests = new Map<string, Promise<MonitorMetricsHistoryResponse>>();

export function clearNodeMetricsHistoryCache(uuid?: string): void {
  if (uuid) {
    for (const key of nodeMetricsHistoryCache.keys()) {
      if (key.startsWith(`${uuid}:`)) {
        nodeMetricsHistoryCache.delete(key);
      }
    }
  } else {
    nodeMetricsHistoryCache.clear();
  }
}

export async function fetchNodeMetricsHistoryShared(
  uuid: string,
  hours: number,
  options?: RequestOptions,
): Promise<MonitorMetricsHistoryResponse> {
  const cacheKey = `${uuid}:${hours}`;
  const now = Date.now();

  if (!options?.forceRefresh) {
    const cached = nodeMetricsHistoryCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return cached.data;
    }
  }

  const inFlight = inFlightNodeMetricsRequests.get(cacheKey);
  if (inFlight) {
    return inFlight;
  }

  const promise = (async () => {
    try {
      // 不传 points 参数，获取 Hub 原生完整时序粒度，避免突发测速被强行降采样稀释
      const path = `/api/nodes/${encodeURIComponent(uuid)}/metrics?hours=${hours}&series=metrics`;
      const data = await apiFetch<MonitorMetricsHistoryResponse>(path, options);
      nodeMetricsHistoryCache.set(cacheKey, {
        data,
        expiresAt: Date.now() + 30_000,
      });
      return data;
    } finally {
      inFlightNodeMetricsRequests.delete(cacheKey);
    }
  })();

  inFlightNodeMetricsRequests.set(cacheKey, promise);
  return promise;
}

/**
 * 获取今日流量聚合数据
 * 结合 Monitor 探针节点实时数据与 24h 历史指标，进行梯形数值积分统计与网络速率采样提取
 */
export async function getTodayTrafficMetrics(
  entityIds?: string[],
  startMs?: number,
  endMs?: number,
  options?: RequestOptions,
): Promise<TodayTrafficMetricsResponse> {
  const now = Date.now();
  const rangeStartMs = startMs ?? now - 86400000;
  const rangeEndMs = endMs ?? now;

  let uuids = entityIds && entityIds.length > 0 ? entityIds : [];
  if (uuids.length === 0) {
    try {
      const nodes = await getNodes(options);
      uuids = nodes.map((n) => n.uuid);
    } catch {
      uuids = [];
    }
  }

  if (uuids.length === 0) {
    return {
      series: [],
      rangeStartMs,
      rangeEndMs,
      intervalSeconds: 60,
    };
  }

  const hoursDiff = (rangeEndMs - rangeStartMs) / (3600 * 1000);
  const queryHours = Math.max(1, Math.min(24, Math.ceil(hoursDiff) + 1));

  const series: TrafficMetricSeries[] = [];

  await Promise.all(
    uuids.map(async (uuid) => {
      try {
        const rawNode = getRawNode(uuid);
        let historyData: MonitorMetricsHistoryResponse | null = null;
        try {
          historyData = await fetchNodeMetricsHistoryShared(uuid, queryHours, options);
        } catch {
          // 容错单个节点网络异常
        }

        const rawPoints = historyData?.metrics ?? [];
        const todayPoints = rawPoints
          .filter((p) => {
            const pMs = p.ts * 1000;
            return pMs >= rangeStartMs && pMs <= rangeEndMs;
          })
          .sort((a, b) => a.ts - b.ts);

        const rateUpPoints: TrafficMetricSeries["points"] = [];
        const rateDownPoints: TrafficMetricSeries["points"] = [];
        const trafficUpPoints: TrafficMetricSeries["points"] = [];
        const trafficDownPoints: TrafficMetricSeries["points"] = [];

        // 1. 速率采样序列（用于峰值计算和曲线图）
        for (const p of todayPoints) {
          const isoTime = new Date(p.ts * 1000).toISOString();
          rateUpPoints.push({
            time: isoTime,
            value: Math.max(0, p.net_tx),
            count: 1,
          });
          rateDownPoints.push({
            time: isoTime,
            value: Math.max(0, p.net_rx),
            count: 1,
          });
        }

        // 把实时的当前流速也计入采样，确保测速时的高峰第一时间被计入峰值
        if (rawNode?.metrics) {
          const nowIso = new Date().toISOString();
          const liveTx = Math.max(0, rawNode.metrics.net_tx);
          const liveRx = Math.max(0, rawNode.metrics.net_rx);
          if (liveTx > 0 || liveRx > 0) {
            rateUpPoints.push({
              time: nowIso,
              value: liveTx,
              count: 1,
            });
            rateDownPoints.push({
              time: nowIso,
              value: liveRx,
              count: 1,
            });
          }
        }

        // 2. 流量累计计算（优先服务端权威原生统计 day_tx/day_rx，绝不使用采样推算）
        const hasServerDayTraffic =
          rawNode != null &&
          (typeof rawNode.day_tx === "number" || typeof rawNode.day_rx === "number");

        if (hasServerDayTraffic) {
          const nowIso = new Date(rangeEndMs).toISOString();
          trafficUpPoints.push({
            time: nowIso,
            value: Math.max(0, rawNode.day_tx ?? 0),
            count: 1,
          });
          trafficDownPoints.push({
            time: nowIso,
            value: Math.max(0, rawNode.day_rx ?? 0),
            count: 1,
          });
        } else if (todayPoints.length > 0) {
          // 梯形积分计算今日流量消耗
          for (let i = 0; i < todayPoints.length; i++) {
            const curr = todayPoints[i];
            let dtSeconds = 60;
            if (i > 0) {
              const prev = todayPoints[i - 1];
              dtSeconds = Math.max(1, Math.min(curr.ts - prev.ts, 600));
            } else if (i < todayPoints.length - 1) {
              const next = todayPoints[i + 1];
              dtSeconds = Math.max(1, Math.min(next.ts - curr.ts, 600));
            }

            const upBytes = Math.round(Math.max(0, curr.net_tx) * dtSeconds);
            const downBytes = Math.round(Math.max(0, curr.net_rx) * dtSeconds);
            const isoTime = new Date(curr.ts * 1000).toISOString();

            trafficUpPoints.push({
              time: isoTime,
              value: upBytes,
              count: 1,
            });
            trafficDownPoints.push({
              time: isoTime,
              value: downBytes,
              count: 1,
            });
          }
        }

        series.push({
          metricKey: "traffic.up",
          client: uuid,
          intervalSeconds: 60,
          points: trafficUpPoints,
        });
        series.push({
          metricKey: "traffic.down",
          client: uuid,
          intervalSeconds: 60,
          points: trafficDownPoints,
        });
        series.push({
          metricKey: "net.out.rate",
          client: uuid,
          intervalSeconds: 60,
          points: rateUpPoints,
        });
        series.push({
          metricKey: "net.in.rate",
          client: uuid,
          intervalSeconds: 60,
          points: rateDownPoints,
        });
      } catch {
        // 节点异常防御
      }
    }),
  );

  return {
    series,
    rangeStartMs,
    rangeEndMs,
    intervalSeconds: 60,
  };
}

/** 保存主题设置（持久化至服务端官方配置接口 PUT /api/themes/{short}/config 与本地缓存） */
export async function saveThemeSettings(
  themeOrSettings: string | (ThemeSettings & Record<string, unknown>) | Record<string, unknown>,
  maybeSettings?: (ThemeSettings & Record<string, unknown>) | Record<string, unknown>,
): Promise<void> {
  const settings = (
    typeof themeOrSettings === "string" ? maybeSettings : themeOrSettings
  ) as Record<string, unknown> | undefined;

  if (!settings) return;

  // 1. 同步保存至本地存储，保证本地离线或断网时的高容错与即时反馈
  saveLocalThemeSettings(settings);

  if (typeof window === "undefined" || typeof fetch === "undefined") {
    return;
  }

  // 2. 官方标准持久化存储：PUT /api/themes/{short}/config
  const url = `/api/themes/${THEME_SHORT}/config`;
  let original: Record<string, unknown> = {};

  try {
    const read = await fetch(url);
    if (read.ok) {
      const contentType = read.headers.get("content-type") ?? "";
      if (contentType.includes("application/json") || !contentType.includes("text/html")) {
        const text = await read.text();
        if (text.trim().startsWith("{")) {
          original = JSON.parse(text);
        }
      }
    }
  } catch {}

  const next: Record<string, unknown> = { ...original };
  for (const [key, value] of Object.entries(settings)) {
    if (value === undefined) {
      delete next[key];
    } else {
      next[key] = value;
    }
  }

  try {
    const res = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(errText || `保存主题配置至服务端失败 (HTTP ${res.status})`);
    }

    serverThemeSettingsCache = next;
  } catch (err) {
    // 若服务端不支持 PUT（例如旧版 Hub 404），已有本地存储兜底，向控制台记录调试信息
    console.warn("保存到服务端主题配置接口未成功，已使用本地存储兜底:", err);
  }
}

/** 获取管理客户端列表（兼容 ThemeManage 页面） */
export async function getAdminClients(_options?: RequestOptions): Promise<AdminClient[]> {
  const nodes = await getNodes(_options);
  return nodes.map((n) => ({
    uuid: n.uuid,
    name: n.name,
    group: n.group,
    region: n.region,
    weight: n.weight,
  }));
}

/** 获取管理探测任务列表（对接 Monitor /api/ping-tasks 及 /api/nodes/{id}/metrics fallback） */
export async function getAdminPingTasks(_options?: RequestOptions): Promise<PingTask[]> {
  // 1. 优先尝试管理员接口 GET /api/ping-tasks
  try {
    const res = await apiFetch<{ tasks?: Array<Record<string, unknown>> } | Array<Record<string, unknown>>>(
      "/api/ping-tasks",
      _options,
    );
    const rawList = Array.isArray(res) ? res : res?.tasks;
    if (Array.isArray(rawList) && rawList.length > 0) {
      return rawList
        .map((t) => ({
          id: Number(t.id),
          name: typeof t.name === "string" && t.name ? t.name : `线路 #${t.id}`,
          interval: typeof t.interval === "number" ? t.interval : 60,
          loss: 0,
          clients: Array.isArray(t.nodes)
            ? t.nodes.map(String)
            : Array.isArray(t.clients)
              ? t.clients.map(String)
              : [],
          type: typeof t.type === "string" ? t.type : "icmp",
          target: typeof t.target === "string" ? t.target : "",
          weight: typeof t.weight === "number" ? t.weight : 0,
        }))
        .filter((t) => Number.isFinite(t.id) && t.id > 0)
        .sort((a, b) => a.id - b.id);
    }
  } catch (_err) {
    // 若非管理员会话或接口报错，继续尝试节点探测指标汇总回退
  }

  // 2. 回退机制：从节点列表中提取 metrics?series=ping 汇总 probes
  try {
    const nodes = await getNodes(_options);
    if (nodes.length > 0) {
      const probeMap = new Map<number, { id: number; name: string; clients: Set<string> }>();
      const sampleNodes = nodes.slice(0, 15);
      await Promise.all(
        sampleNodes.map(async (node) => {
          try {
            const data = await apiFetch<MonitorMetricsHistoryResponse>(
              `/api/nodes/${encodeURIComponent(node.uuid)}/metrics?hours=1&points=30&series=ping`,
              _options,
            );
            if (data?.probes) {
              for (const [idStr, name] of Object.entries(data.probes)) {
                const id = Number(idStr);
                if (!Number.isFinite(id) || id <= 0) continue;
                if (!probeMap.has(id)) {
                  probeMap.set(id, {
                    id,
                    name: name || `线路 #${id}`,
                    clients: new Set(),
                  });
                }
                probeMap.get(id)!.clients.add(node.uuid);
              }
            }
          } catch {
            // 忽略单个节点拉取失败
          }
        }),
      );

      if (probeMap.size > 0) {
        return Array.from(probeMap.values())
          .map((item) => ({
            id: item.id,
            name: item.name,
            interval: 60,
            loss: 0,
            clients: Array.from(item.clients),
            type: "icmp",
            target: "",
            weight: 0,
          }))
          .sort((a, b) => a.id - b.id);
      }
    }
  } catch {
    // 忽略错误
  }

  return [];
}

