import type { NodeInfo, NodeMetrics } from "@/types/komari";

export interface MonitorMetrics {
  uptime: number;
  cpu: number;
  load: [number, number, number];
  mem_total: number;
  mem_used: number;
  swap_total: number;
  swap_used: number;
  disk_total: number;
  disk_used: number;
  net_rx: number;
  net_tx: number;
  total_rx: number;
  total_tx: number;
  month_rx?: number;
  month_tx?: number;
  tcp: number;
  udp: number;
  procs: number;
}

export interface MonitorNode {
  id: number;
  name: string;
  sort: number;
  public: boolean;
  online: boolean;
  country: string;
  last_seen: number;
  metrics: MonitorMetrics | null;
  os: string;
  kernel?: string;
  arch?: string;
  virt?: string;
  cpu_name?: string;
  cpu_cores?: number;
  mem_total?: number;
  swap_total?: number;
  disk_total?: number;
  agent_version?: string;
  price?: number;
  currency?: string;
  billing_cycle?: string;
  expires_at?: string | null;
  traffic_limit?: number;
  traffic_mode?: string;
  traffic_reset_day?: number;
  total_rx?: number;
  total_tx?: number;
  month_rx?: number;
  month_tx?: number;
  month_start?: string;
  day_rx?: number;
  day_tx?: number;
  hostname?: string;
  ip?: string;
  remark?: string;
}

export interface MonitorMe {
  authed: boolean;
  github: boolean;
  site_name: string;
  public_page: boolean;
}

export interface MonitorHistoryPoint {
  ts: number;
  cpu: number;
  mem_used: number;
  disk_used: number;
  net_rx: number;
  net_tx: number;
}

export interface MonitorPingPoint {
  task_id: number;
  ts: number;
  latency: number | null;
  band?: [number, number];
  loss?: number;
}

export interface MonitorMetricsHistoryResponse {
  metrics: MonitorHistoryPoint[];
  ping: MonitorPingPoint[];
  probes: Record<string, string>;
  loss?: Record<string, number>;
}

/** 检查并防御性修复畸形或缺失的 metrics 数据，防止单节点异常引发全屏报错 */
export function safeMonitorNodes(nodes: unknown): MonitorNode[] {
  if (!Array.isArray(nodes)) return [];
  const isNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;
  const metricFields = [
    "uptime",
    "cpu",
    "mem_total",
    "mem_used",
    "swap_total",
    "swap_used",
    "disk_total",
    "disk_used",
    "net_rx",
    "net_tx",
    "total_rx",
    "total_tx",
    "tcp",
    "udp",
    "procs",
  ] as const;

  return nodes.map((raw): MonitorNode => {
    const node = raw as MonitorNode;
    const m = node.metrics;
    if (!m) {
      return { ...node, metrics: null };
    }
    const isValid =
      metricFields.every((field) => isNumber(m[field])) &&
      Array.isArray(m.load) &&
      m.load.length === 3 &&
      m.load.every((v) => typeof v === "number" && Number.isFinite(v));

    return isValid ? node : { ...node, metrics: null };
  });
}

/**
 * 将 MonitorNode 转为主题内部通用的 NodeInfo 结构
 */
export function convertMonitorNodeToInfo(node: MonitorNode): NodeInfo {
  const uuid = String(node.id);
  const memTotal = node.metrics?.mem_total ?? node.mem_total ?? 0;
  const swapTotal = node.metrics?.swap_total ?? node.swap_total ?? 0;
  const diskTotal = node.metrics?.disk_total ?? node.disk_total ?? 0;

  return {
    uuid,
    name: node.name || `Node ${node.id}`,
    group: "", // Monitor 无原生 group 字段，留空或由主题配置接管
    region: (node.country || "").toUpperCase(),
    hidden: false,
    cpu_name: node.cpu_name || "",
    cpu_cores: node.cpu_cores || 0,
    arch: node.arch || "",
    virtualization: node.virt || "",
    os: node.os || "",
    kernel_version: node.kernel || "",
    gpu_name: "",
    mem_total: memTotal,
    swap_total: swapTotal,
    disk_total: diskTotal,
    weight: node.sort ?? 0,
    price: node.price ?? 0,
    billing_cycle: node.billing_cycle || "",
    auto_renewal: false,
    currency: node.currency || "CNY",
    expired_at: node.expires_at || "",
    tags: "",
    public_remark: node.remark || "",
    traffic_limit: node.traffic_limit ?? 0,
    traffic_limit_type: node.traffic_mode || "",
    ipv4: node.ip || "",
    ipv6: "",
    created_at: "",
    updated_at: node.last_seen ? new Date(node.last_seen * 1000).toISOString() : "",
  };
}

/**
 * 将 MonitorNode 转为主题内部通用的实时指标 NodeMetrics 结构
 */
export function convertMonitorNodeToMetrics(node: MonitorNode): NodeMetrics {
  const m = node.metrics;
  const isOnline = Boolean(node.online);

  if (!m || !isOnline) {
    return {
      online: isOnline ? true : false,
      cpuPct: 0,
      ramUsed: 0,
      ramTotal: node.mem_total ?? 0,
      ramPct: 0,
      swapUsed: 0,
      swapTotal: node.swap_total ?? 0,
      diskUsed: 0,
      diskTotal: node.disk_total ?? 0,
      diskPct: 0,
      netUp: 0,
      netDown: 0,
      trafficUp: node.total_tx ?? 0,
      trafficDown: node.total_rx ?? 0,
      uptime: 0,
      load1: 0,
      load5: 0,
      load15: 0,
      process: 0,
      connectionsTcp: 0,
      connectionsUdp: 0,
      updatedAt: (node.last_seen || 0) * 1000,
    };
  }

  const ramPct = m.mem_total > 0 ? (m.mem_used / m.mem_total) * 100 : 0;
  const diskPct = m.disk_total > 0 ? (m.disk_used / m.disk_total) * 100 : 0;
  const trafficUp = m.total_tx ?? node.total_tx ?? 0;
  const trafficDown = m.total_rx ?? node.total_rx ?? 0;

  return {
    online: true,
    cpuPct: Number(m.cpu.toFixed(1)),
    ramUsed: m.mem_used,
    ramTotal: m.mem_total,
    ramPct: Number(ramPct.toFixed(1)),
    swapUsed: m.swap_used,
    swapTotal: m.swap_total,
    diskUsed: m.disk_used,
    diskTotal: m.disk_total,
    diskPct: Number(diskPct.toFixed(1)),
    netUp: m.net_tx,
    netDown: m.net_rx,
    trafficUp,
    trafficDown,
    uptime: m.uptime,
    load1: m.load?.[0] ?? 0,
    load5: m.load?.[1] ?? 0,
    load15: m.load?.[2] ?? 0,
    process: m.procs ?? 0,
    connectionsTcp: m.tcp ?? 0,
    connectionsUdp: m.udp ?? 0,
    updatedAt: (node.last_seen || 0) * 1000,
  };
}
