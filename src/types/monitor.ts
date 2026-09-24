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
export function safeMonitorNodes(raw: unknown): MonitorNode[] {
  if (!raw) return [];
  const list = Array.isArray(raw)
    ? raw
    : (raw as { nodes?: unknown[]; data?: unknown[] })?.nodes ??
      (raw as { data?: unknown[] })?.data ??
      (raw && typeof raw === "object" && "id" in (raw as Record<string, unknown>) ? [raw] : []);
  if (!Array.isArray(list)) return [];

  const toSafeNum = (v: unknown, fallback = 0): number => {
    if (typeof v === "number" && Number.isFinite(v) && v >= 0) return v;
    if (typeof v === "string") {
      const parsed = parseFloat(v);
      if (Number.isFinite(parsed) && parsed >= 0) return parsed;
    }
    return fallback;
  };

  return list.map((item): MonitorNode => {
    if (!item || typeof item !== "object") return item as MonitorNode;
    const node = { ...(item as MonitorNode) };
    const m = node.metrics as Record<string, unknown> | null | undefined;
    if (!m || typeof m !== "object") {
      return { ...node, metrics: null };
    }

    const safeLoad: [number, number, number] = Array.isArray(m.load)
      ? [toSafeNum(m.load[0]), toSafeNum(m.load[1]), toSafeNum(m.load[2])]
      : [0, 0, 0];

    const rawMetrics = m;
    const rawNodeObj = node as unknown as Record<string, unknown>;

    const safeNetRx = toSafeNum(
      rawMetrics.net_rx ?? rawMetrics.rx ?? rawNodeObj.net_rx ?? rawNodeObj.rx
    );
    const safeNetTx = toSafeNum(
      rawMetrics.net_tx ?? rawMetrics.tx ?? rawNodeObj.net_tx ?? rawNodeObj.tx
    );

    const safeTotalRx = toSafeNum(
      rawMetrics.total_rx ??
        rawMetrics.net_rx_total ??
        rawMetrics.rx_total ??
        node.total_rx ??
        rawNodeObj.net_rx_total ??
        rawNodeObj.rx_total
    );
    const safeTotalTx = toSafeNum(
      rawMetrics.total_tx ??
        rawMetrics.net_tx_total ??
        rawMetrics.tx_total ??
        node.total_tx ??
        rawNodeObj.net_tx_total ??
        rawNodeObj.tx_total
    );

    const safeDayRx = toSafeNum(
      rawMetrics.day_rx ?? rawMetrics.today_rx ?? node.day_rx ?? rawNodeObj.today_rx,
      -1
    );
    const safeDayTx = toSafeNum(
      rawMetrics.day_tx ?? rawMetrics.today_tx ?? node.day_tx ?? rawNodeObj.today_tx,
      -1
    );

    const sanitizedMetrics: MonitorMetrics = {
      uptime: toSafeNum(m.uptime),
      cpu: toSafeNum(m.cpu),
      load: safeLoad,
      mem_total: toSafeNum(m.mem_total, toSafeNum(node.mem_total)),
      mem_used: toSafeNum(m.mem_used),
      swap_total: toSafeNum(m.swap_total, toSafeNum(node.swap_total)),
      swap_used: toSafeNum(m.swap_used),
      disk_total: toSafeNum(m.disk_total, toSafeNum(node.disk_total)),
      disk_used: toSafeNum(m.disk_used),
      net_rx: safeNetRx,
      net_tx: safeNetTx,
      total_rx: safeTotalRx,
      total_tx: safeTotalTx,
      tcp: toSafeNum(m.tcp),
      udp: toSafeNum(m.udp),
      procs: toSafeNum(m.procs),
      month_rx: typeof m.month_rx === "number" ? m.month_rx : node.month_rx,
      month_tx: typeof m.month_tx === "number" ? m.month_tx : node.month_tx,
    };

    return {
      ...node,
      total_rx: safeTotalRx > 0 ? safeTotalRx : node.total_rx,
      total_tx: safeTotalTx > 0 ? safeTotalTx : node.total_tx,
      day_rx: safeDayRx >= 0 ? safeDayRx : node.day_rx,
      day_tx: safeDayTx >= 0 ? safeDayTx : node.day_tx,
      metrics: sanitizedMetrics,
    };
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
  const isOnline =
    node.online === true ||
    (node.online as unknown) === 1 ||
    (node.online as unknown) === "true" ||
    (node.online == null && m !== null);

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
