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
  type MonitorNode,
} from "@/types/monitor";
import { getLocalThemeSettings, saveLocalThemeSettings } from "@/services/themeSettingsStore";
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

/** 解析当前登录用户的显示名称，优先级：Storage 自定义昵称 -> 保底 "Admin" */
export function resolveAuthUsername(authed = true): string {
  if (!authed) return "";
  const fromStorage = extractUsernameFromStorage();
  if (fromStorage) return fromStorage;
  return "Admin";
}

/** 保存自定义昵称 */
export function saveAdminUsername(nickname: string): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  const sanitized = nickname.replace(/[\x00-\x1F\x7F]/g, "").trim().slice(0, 40);
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

/** 获取当前登录态 /api/me */
export async function getMe(options?: RequestOptions): Promise<Me> {
  const data = await apiFetch<MonitorMe>("/api/me", options);
  const username = data.authed ? resolveAuthUsername(true) : "";

  return {
    logged_in: data.authed,
    username,
    uuid: "",
  };
}

/** 获取站点全局配置 */
export async function getPublic(options?: RequestOptions): Promise<PublicConfig> {
  const me = await apiFetch<MonitorMe>("/api/me", options);
  const localSettings = getLocalThemeSettings();

  return ({
    sitename: me.site_name || "Monitor",
    description: "",
    theme: "sao",
    version: "1.0.8",
    private_site: !me.public_page,
    theme_settings: localSettings as ThemeSettings,
    record_preserve_time: 168,
    ping_record_preserve_time: 24,
    allow_theme_switch: true,
  } as unknown) as PublicConfig;
}

/** 获取节点列表 */
export async function getNodes(options?: RequestOptions): Promise<NodeInfo[]> {
  const data = await apiFetch<{ nodes: MonitorNode[] }>("/api/nodes", options);
  const safeList = safeMonitorNodes(data?.nodes ?? []);
  return safeList.map(convertMonitorNodeToInfo);
}

/** 获取所有节点最新状态字典 */
export async function getNodesLatestStatus(options?: RequestOptions): Promise<Record<string, unknown>> {
  const data = await apiFetch<{ nodes: MonitorNode[] }>("/api/nodes", options);
  const safeList = safeMonitorNodes(data?.nodes ?? []);
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
        const path = `/api/nodes/${encodeURIComponent(uuid)}/metrics?hours=${queryHours}&points=60&series=ping`;
        const data = await apiFetch<MonitorMetricsHistoryResponse>(path, options);
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

/** 兼容接口：获取今日流量聚合数据 */
export async function getTodayTrafficMetrics(
  _entityIds?: string[],
  startMs?: number,
  endMs?: number,
  _options?: RequestOptions,
): Promise<TodayTrafficMetricsResponse> {
  const now = Date.now();
  return {
    series: [],
    rangeStartMs: startMs ?? now - 86400000,
    rangeEndMs: endMs ?? now,
    intervalSeconds: 60,
  };
}

/** 保存主题设置（持久化至本地存储） */
export async function saveThemeSettings(
  themeOrSettings: string | ThemeSettings,
  maybeSettings?: ThemeSettings,
): Promise<void> {
  const settings =
    typeof themeOrSettings === "string" ? maybeSettings : themeOrSettings;
  if (settings) {
    saveLocalThemeSettings(settings as Record<string, unknown>);
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

