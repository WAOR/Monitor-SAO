import type { NodeInfo } from "@/types/komari";

const MIB = 1024 * 1024;
const GIB = 1024 * MIB;
const TIB = 1024 * GIB;

function dateAfter(days: number) {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

const BASE_NODES: NodeInfo[] = [
  {
    uuid: "tokyo-edge-01",
    name: "Tokyo Edge",
    group: "生产",
    region: "JP",
    hidden: false,
    cpu_name: "AMD EPYC 7763",
    cpu_cores: 8,
    arch: "x86_64",
    virtualization: "KVM",
    os: "debian",
    kernel_version: "6.1.0-21-amd64",
    gpu_name: "",
    mem_total: 16 * GIB,
    swap_total: 4 * GIB,
    disk_total: 320 * GIB,
    weight: 10,
    price: 36,
    billing_cycle: "month",
    auto_renewal: true,
    currency: "USD",
    expired_at: dateAfter(28),
    tags: "核心机房<Violet>; BGP多线<Blue>; 高可用<Emerald>",
    public_remark: "东京主节点",
    traffic_limit: 10 * TIB,
    traffic_limit_type: "sum",
    ipv4: "203.0.113.10",
    ipv6: "2001:db8::10",
    created_at: dateAfter(-360),
    updated_at: new Date().toISOString(),
  },
  {
    uuid: "hongkong-bgp-02",
    name: "Hong Kong BGP",
    group: "生产",
    region: "HK",
    hidden: false,
    cpu_name: "Intel Xeon Platinum 8375C",
    cpu_cores: 4,
    arch: "x86_64",
    virtualization: "KVM",
    os: "ubuntu",
    kernel_version: "5.15.0-105-generic",
    gpu_name: "",
    mem_total: 8 * GIB,
    swap_total: 2 * GIB,
    disk_total: 160 * GIB,
    weight: 20,
    price: 180,
    billing_cycle: "quarter",
    auto_renewal: true,
    currency: "HKD",
    expired_at: dateAfter(64),
    tags: "CN2-GIA<Rose>; 三网直连<Cyan>; 优质带宽<Amber>",
    public_remark: "亚太网关",
    traffic_limit: 4 * TIB,
    traffic_limit_type: "sum",
    ipv4: "203.0.113.20",
    ipv6: "2001:db8::20",
    created_at: dateAfter(-240),
    updated_at: new Date().toISOString(),
  },
  {
    uuid: "silicon-valley-compute-03",
    name: "Silicon Valley Compute",
    group: "计算",
    region: "US",
    hidden: false,
    cpu_name: "AMD Ryzen 9 7950X",
    cpu_cores: 16,
    arch: "x86_64",
    virtualization: "BareMetal",
    os: "arch",
    kernel_version: "6.9.3-arch1-1",
    gpu_name: "NVIDIA RTX 4090",
    mem_total: 64 * GIB,
    swap_total: 16 * GIB,
    disk_total: 1920 * GIB,
    weight: 30,
    price: 120,
    billing_cycle: "month",
    auto_renewal: false,
    currency: "USD",
    expired_at: dateAfter(5),
    tags: "GPU渲染<Fuchsia>; 深度学习<Purple>; 高主频<Orange>",
    public_remark: "AI 模型训练机器",
    traffic_limit: 20 * TIB,
    traffic_limit_type: "sum",
    ipv4: "203.0.113.30",
    ipv6: "2001:db8::30",
    created_at: dateAfter(-180),
    updated_at: new Date().toISOString(),
  },
  {
    uuid: "frankfurt-storage-04",
    name: "Frankfurt Storage",
    group: "存储",
    region: "DE",
    hidden: false,
    cpu_name: "Intel Xeon E-2288G",
    cpu_cores: 8,
    arch: "x86_64",
    virtualization: "KVM",
    os: "debian",
    kernel_version: "6.1.0-21-amd64",
    gpu_name: "",
    mem_total: 32 * GIB,
    swap_total: 8 * GIB,
    disk_total: 7680 * GIB,
    weight: 40,
    price: 45,
    billing_cycle: "month",
    auto_renewal: true,
    currency: "EUR",
    expired_at: dateAfter(12),
    tags: "RAID10<Yellow>; 异地容灾<Lime>; 大容量<Green>",
    public_remark: "归档与备份集群",
    traffic_limit: 8 * TIB,
    traffic_limit_type: "sum",
    ipv4: "203.0.113.40",
    ipv6: "2001:db8::40",
    created_at: dateAfter(-300),
    updated_at: new Date().toISOString(),
  },
  {
    uuid: "singapore-ingress-05",
    name: "Singapore Ingress",
    group: "网关",
    region: "SG",
    hidden: false,
    cpu_name: "AMD EPYC 7002",
    cpu_cores: 4,
    arch: "x86_64",
    virtualization: "KVM",
    os: "alpine",
    kernel_version: "6.6.32-0-lts",
    gpu_name: "",
    mem_total: 4 * GIB,
    swap_total: 1 * GIB,
    disk_total: 80 * GIB,
    weight: 50,
    price: 9.9,
    billing_cycle: "month",
    auto_renewal: true,
    currency: "USD",
    expired_at: dateAfter(41),
    tags: "轻量容器<Teal>; 任意播<Indigo>; 入口防护<Red>",
    public_remark: "东南亚反代入口",
    traffic_limit: 3 * TIB,
    traffic_limit_type: "sum",
    ipv4: "203.0.113.51",
    ipv6: "2001:db8::51",
    created_at: dateAfter(-150),
    updated_at: new Date().toISOString(),
  },
  {
    uuid: "sydney-backup-01",
    name: "Sydney Backup",
    group: "备份",
    region: "AU",
    hidden: false,
    cpu_name: "Ampere Altra",
    cpu_cores: 4,
    arch: "aarch64",
    virtualization: "KVM",
    os: "ubuntu",
    kernel_version: "6.8.0",
    gpu_name: "",
    mem_total: 8 * GIB,
    swap_total: 2 * GIB,
    disk_total: 640 * GIB,
    weight: 60,
    price: 14,
    billing_cycle: "month",
    auto_renewal: false,
    currency: "USD",
    expired_at: dateAfter(19),
    tags: "冷备<Bronze>; 归档<Brown>; 离线<Slate>",
    public_remark: "离线备份节点",
    traffic_limit: 2 * TIB,
    traffic_limit_type: "sum",
    ipv4: "203.0.113.61",
    ipv6: "2001:db8::61",
    created_at: dateAfter(-120),
    updated_at: new Date().toISOString(),
  },
];

function getMockNodes(): NodeInfo[] {
  if (typeof window === "undefined") return BASE_NODES;
  const params = new URLSearchParams(window.location.search);
  let sessionNodes = 0;
  try {
    sessionNodes =
      Number(window.sessionStorage?.getItem("monitor_dev_nodes")) ||
      Number(window.sessionStorage?.getItem("komari_dev_nodes")) ||
      0;
  } catch {}
  const targetCount = Number(params.get("nodes")) || sessionNodes;
  if (!targetCount || targetCount <= BASE_NODES.length) {
    return BASE_NODES;
  }

  // 如果用户指定了像 ?mock=1&nodes=60 或 100，自动扩充复制
  const result: NodeInfo[] = [...BASE_NODES];
  let i = BASE_NODES.length;
  while (result.length < targetCount) {
    const template = BASE_NODES[i % BASE_NODES.length]!;
    const copyIndex = Math.floor(i / BASE_NODES.length) + 1;
    result.push({
      ...template,
      uuid: `${template.uuid}-sub-${copyIndex}`,
      name: `${template.name} #${copyIndex}`,
      weight: template.weight + i * 5,
      ipv4: `203.0.113.${(10 + i) % 250}`,
      ipv6: `2001:db8::${(10 + i).toString(16)}`,
    });
    i++;
  }
  return result;
}

const nodes: NodeInfo[] = getMockNodes();

function wave(seed: number, period: number, amplitude: number, offset: number) {
  return offset + Math.sin((Date.now() / period) * (1 + seed * 0.17)) * amplitude;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getNodeStatusProfile(index: number, node: NodeInfo) {
  // 保持约 6-7% 离线
  const isOffline = index % 15 === 5;
  const isHighLoad = !isOffline && index % 9 === 2;

  if (isOffline) {
    return [0, 0, 0, 38, 232, 0, 0, 1.1 * TIB, 880 * GIB, false] as const;
  }

  const cpu = isHighLoad
    ? Math.round(clamp(wave(index, 14_000, 8, 88), 75, 98))
    : Math.round(clamp(wave(index, 24_000, 25, 42), 5, 75));

  const load = +(cpu * 0.08 * (node.cpu_cores || 4) / 4).toFixed(2);
  const swapPct = isHighLoad ? 35 : Math.round(clamp(wave(index, 30_000, 10, 12), 0, 40));
  const diskPct = Math.round(clamp(30 + (index % 7) * 9, 10, 92));

  // Ping 延迟根据地区产生拟真基准延迟
  const region = (node.region || "").toUpperCase();
  let basePing = 36;
  if (region === "HK" || region === "TW" || region === "SG" || region === "JP") {
    basePing = 24 + (index % 4) * 14;
  } else if (region === "US" || region === "CA") {
    basePing = 135 + (index % 3) * 8;
  } else if (region === "DE" || region === "GB" || region === "FR" || region === "CH") {
    basePing = 175 + (index % 3) * 7;
  } else if (region === "AU" || region === "KR") {
    basePing = 215 + (index % 3) * 16;
  } else {
    basePing = 50 + (index % 5) * 30;
  }

  // 吞吐阶梯：在方格矩阵呈现不同梯级（>10MB/s 梯级3、>2MB/s 梯级2、>200KB/s 梯级1、空闲）
  const speedTier = index % 4;
  let upRate = 50_000;
  let downRate = 120_000;
  if (speedTier === 3) {
    upRate = Math.round(clamp(wave(index, 9_000, 4_000_000, 12_000_000), 8_000_000, 35_000_000));
    downRate = Math.round(clamp(wave(index + 2, 11_000, 6_000_000, 18_000_000), 10_000_000, 50_000_000));
  } else if (speedTier === 2) {
    upRate = Math.round(clamp(wave(index, 12_000, 1_000_000, 3_500_000), 2_100_000, 6_000_000));
    downRate = Math.round(clamp(wave(index + 1, 14_000, 1_500_000, 4_800_000), 2_200_000, 8_000_000));
  } else if (speedTier === 1) {
    upRate = Math.round(clamp(wave(index, 15_000, 200_000, 450_000), 220_000, 800_000));
    downRate = Math.round(clamp(wave(index + 3, 17_000, 300_000, 750_000), 250_000, 1_200_000));
  } else {
    upRate = Math.round(clamp(wave(index, 20_000, 40_000, 60_000), 5_000, 120_000));
    downRate = Math.round(clamp(wave(index + 1, 22_000, 60_000, 90_000), 8_000, 160_000));
  }

  const totalUp = (800 + index * 120) * GIB;
  const totalDown = (1200 + index * 180) * GIB;

  return [cpu, load, swapPct, diskPct, basePing, upRate, downRate, totalUp, totalDown, true] as const;
}

function latestStatus() {
  const now = Date.now();
  return Object.fromEntries(
    nodes.map((node, index) => {
      const [cpu, load, swapPct, diskPct, , up, down, totalUp, totalDown, online] =
        getNodeStatusProfile(index, node);
      if (!online) return [node.uuid, { online: false }];
      const memoryPct = index % 9 === 2 ? 88 : 36 + (index % 6) * 7;
      return [
        node.uuid,
        {
          online: true,
          cpu,
          ram: (node.mem_total * memoryPct) / 100,
          swap: (node.swap_total * swapPct) / 100,
          load,
          load5: +(load * 0.88).toFixed(2),
          load15: +(load * 0.76).toFixed(2),
          disk: (node.disk_total * diskPct) / 100,
          net_in: totalDown,
          net_out: totalUp,
          net_in_transfer: totalDown,
          net_out_transfer: totalUp,
          net_in_speed: down,
          net_out_speed: up,
          uptime: 86400 * (15 + index * 8) + (index % 5) * 3600,
          tcp: 32 + (index % 8) * 14,
          udp: 12 + (index % 5) * 6,
          process: 80 + (index % 10) * 12,
          thread: 300 + (index % 10) * 45,
          temp: 42 + (index % 6) * 3,
          updated_at: new Date(now - (index % 4) * 1000).toISOString(),
        },
      ];
    }),
  );
}

function loadRecords(uuid: string) {
  const node = nodes.find((item) => item.uuid === uuid) ?? nodes[0];
  const index = Math.max(0, nodes.indexOf(node));
  const profile = getNodeStatusProfile(index, node);
  const now = Date.now();
  return Array.from({ length: 72 }, (_, sample) => {
    const phase = sample / 7 + index;
    const cpu = Math.max(2, Math.min(98, profile[0] + Math.sin(phase) * 10));
    const ram = Math.max(
      node.mem_total * 0.2,
      Math.min(node.mem_total * 0.95, node.mem_total * (0.42 + Math.cos(phase) * 0.12)),
    );
    const disk = Math.max(
      node.disk_total * 0.1,
      Math.min(node.disk_total * 0.95, (node.disk_total * profile[3]) / 100),
    );
    const load = Math.max(0.1, +(profile[1] + Math.sin(phase) * 0.4).toFixed(2));
    const swap = (node.swap_total * profile[2]) / 100;
    return {
      time: now - (71 - sample) * 300_000,
      cpu,
      ram,
      swap,
      load,
      disk,
      net_in: profile[6] * (0.8 + Math.sin(phase) * 0.2),
      net_out: profile[5] * (0.8 + Math.cos(phase) * 0.2),
      tcp: 30 + (sample % 12),
      udp: 10 + (sample % 6),
      process: 120,
      thread: 450,
    };
  });
}

function parseTimeRange(startStr?: string, endStr?: string, defaultHours = 1) {
  const end = endStr ? new Date(endStr).getTime() : Date.now();
  const start = startStr ? new Date(startStr).getTime() : end - defaultHours * 3600_000;
  return { start, end };
}

function loadMetricPayload(params: {
  uuid?: string;
  metric_keys?: string[];
  start?: string;
  end?: string;
}) {
  const { start, end } = parseTimeRange(params.start, params.end, 1);
  const metricKeys = params.metric_keys ?? [
    "cpu.percent",
    "memory.used",
    "disk.used",
    "net.in.rate",
    "net.out.rate",
    "load.1m",
    "swap.used",
    "tcp.connections",
    "udp.connections",
    "process.count",
    "thread.count",
  ];
  const pointCount = 30;
  const intervalMs = Math.max(60_000, Math.floor((end - start) / pointCount));
  const uuid = params.uuid ?? nodes[0].uuid;
  const index = nodes.findIndex((node) => node.uuid === uuid);
  if (index < 0) return [];
  const profile = getNodeStatusProfile(index, nodes[index]);
  if (!profile[9]) return [];
  return metricKeys.map((metricKey) => ({
    metric_key: metricKey,
    entity_id: uuid,
    series_name: "",
    interval_seconds: intervalMs / 1000,
    points: Array.from({ length: pointCount }, (_, pointIndex) => {
      const time = new Date(start + (pointIndex + 1) * intervalMs).toISOString();
      const phase = pointIndex / 6 + index;
      let value = 0;
      switch (metricKey) {
        case "cpu.percent":
          value = Math.max(2, Math.min(98, profile[0] + Math.sin(phase) * 8));
          break;
        case "memory.used":
          value = nodes[index].mem_total * (0.42 + Math.cos(phase) * 0.08);
          break;
        case "disk.used":
          value = (nodes[index].disk_total * profile[3]) / 100;
          break;
        case "net.in.rate":
          value = profile[6] * (0.8 + Math.sin(phase) * 0.2);
          break;
        case "net.out.rate":
          value = profile[5] * (0.8 + Math.cos(phase) * 0.2);
          break;
        case "load.1m":
          value = Math.max(0.1, +(profile[1] + Math.sin(phase) * 0.3).toFixed(2));
          break;
        case "swap.used":
          value = (nodes[index].swap_total * profile[2]) / 100;
          break;
        case "tcp.connections":
          value = 30 + (pointIndex % 10);
          break;
        case "udp.connections":
          value = 10 + (pointIndex % 5);
          break;
        case "process.count":
          value = 120;
          break;
        case "thread.count":
          value = 450;
          break;
      }
      return { time, value, count: 1 };
    }),
  }));
}

function trafficMetricPayload(params: {
  metric_keys?: string[];
  entity_ids?: string[];
  start?: string;
  end?: string;
}) {
  const { start, end } = parseTimeRange(params.start, params.end, 24);
  const metricKeys = params.metric_keys ?? [
    "traffic.up",
    "traffic.down",
    "net.in.rate",
    "net.out.rate",
  ];
  const pointCount = 36;
  const intervalMs = Math.max(60_000, Math.floor((end - start) / pointCount));
  const entityIds = params.entity_ids?.length ? params.entity_ids : nodes.map((node) => node.uuid);

  return entityIds.flatMap((uuid) => {
    const index = nodes.findIndex((node) => node.uuid === uuid);
    if (index < 0) return [];
    const profile = getNodeStatusProfile(index, nodes[index]);
    if (!profile[9]) return [];
    return metricKeys.map((metricKey) => ({
      metric_key: metricKey,
      entity_id: uuid,
      series_name: "",
      interval_seconds: intervalMs / 1000,
      points: Array.from({ length: pointCount }, (_, pointIndex) => {
        const time = new Date(start + (pointIndex + 1) * intervalMs).toISOString();
        const phase = pointIndex / 5 + index;
        const value =
          metricKey === "traffic.up"
            ? (12 + (index % 6) * 3) * MIB * (0.72 + Math.sin(phase) * 0.24)
            : metricKey === "traffic.down"
              ? (28 + (index % 6) * 5) * MIB * (0.74 + Math.cos(phase) * 0.22)
              : metricKey === "net.out.rate"
                ? profile[5] * (0.62 + Math.sin(phase) * 0.34)
                : profile[6] * (0.66 + Math.cos(phase) * 0.3);
        return { time, value: Math.max(0, value), count: 1 };
      }),
    }));
  });
}

const pingTasks = [
  { id: 1, name: "中国电信", target: "电信探针" },
  { id: 2, name: "中国联通", target: "联通探针" },
  { id: 3, name: "中国移动", target: "移动探针" },
].map((task, index) => ({
  ...task,
  interval: 60,
  loss: 0,
  clients: nodes.map((node) => node.uuid),
  type: "icmp",
  weight: index + 1,
}));

function pingMetricPayload(params: {
  metric_keys?: string[];
  entity_ids?: string[];
  tags?: { task_id?: string };
  start?: string;
  end?: string;
}) {
  const { start, end } = parseTimeRange(params.start, params.end, 1);
  const metricKeys = params.metric_keys ?? ["ping.latency", "ping.loss"];
  const pointCount = 30;
  const intervalMs = Math.max(60_000, Math.floor((end - start) / pointCount));
  const entityIds = params.entity_ids?.length ? params.entity_ids : nodes.map((node) => node.uuid);
  const taskIdFilter = params.tags?.task_id ? Number(params.tags.task_id) : undefined;
  const tasks = taskIdFilter
    ? pingTasks.filter((task) => task.id === taskIdFilter)
    : pingTasks;

  const series = entityIds.flatMap((uuid) => {
    const index = nodes.findIndex((node) => node.uuid === uuid);
    if (index < 0) return [];
    const profile = getNodeStatusProfile(index, nodes[index]);
    return tasks.flatMap((task) =>
      metricKeys.map((metricKey) => ({
        metric_key: metricKey,
        entity_id: uuid,
        series_name: task.name,
        interval_seconds: intervalMs / 1000,
        points: Array.from({ length: pointCount }, (_, pointIndex) => {
          const time = new Date(start + (pointIndex + 1) * intervalMs).toISOString();
          const lost = !profile[9] || (index % 11 === 0 && pointIndex % 17 === 0);
          if (metricKey === "ping.loss") {
            return { time, value: lost ? 1 : 0, count: 1 };
          }
          const baseline = profile[4] + (task.id - 1) * 18;
          return {
            time,
            value: lost
              ? 0
              : Math.max(
                  1,
                  baseline + Math.round(Math.sin(pointIndex / 4 + index + task.id) * 7),
                ),
            count: 1,
          };
        }),
      })),
    );
  });
  return series;
}

function pingRecords(uuid?: string, taskId = 1) {
  const clients = uuid ? [uuid] : nodes.map((node) => node.uuid);
  const now = Date.now();
  return clients.flatMap((client) => {
    const index = Math.max(0, nodes.findIndex((node) => node.uuid === client));
    const profile = getNodeStatusProfile(index, nodes[index] ?? nodes[0]);
    const baseline = profile[4] + (taskId - 1) * 18;
    return Array.from({ length: 60 }, (_, sample) => ({
      task_id: taskId,
      time: now - (59 - sample) * 60_000,
      value:
        !profile[9] || (index % 11 === 0 && sample % 17 === 0)
          ? -1
          : Math.max(1, baseline + Math.round(Math.sin(sample / 5 + index) * 9)),
      client,
      status: 1,
    }));
  });
}

function json(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

export function installDevMockApi() {
  const nativeFetch = window.fetch.bind(window);
  // ?mock=1 默认模拟已登录管理员,放开 /api/admin/*,ThemeManage 才可在 dev 正常保存。显式 ?admin=0 模拟未授权。
  const adminMode = new URLSearchParams(window.location.search).get("admin") !== "0";
  // 保存后的主题设置驻留内存与本地存储，让「保存 → /api/public refetch」以及刷新页面闭环。
  const defaultTheme = "SAO";
  const MOCK_STORAGE_KEY = "monitor_mock_theme_settings";
  const LEGACY_STORAGE_KEY = "komari_mock_theme_settings";
  const defaultMockThemeSettings: Record<string, unknown> = {
    desktopNodeViewMode: "compact",
    mobileNodeViewMode: "compact",
    clusterOverviewMode: "classic",
    showHomeOverview: true,
    showGroupTabs: true,
    showRegionBar: true,
    showCardGroup: true,
    enableHomeSort: true,
    showCostSummary: true,
    showCostSummaryFloatingButton: true,
    showPriceForGuests: false,
    showOverviewRatings: true,
    showTrafficRating: true,
    showBandwidthRating: true,
    showAssetRating: true,
    showPingChart: true,
    // 单任务刻意和三网首项不同，便于回归验证列表没有误读全局三网数据。
    homepagePingBindings: { "2": nodes.map((node) => node.uuid) },
    enableHomepageMultiPing:
      new URLSearchParams(window.location.search).get("multiPing") === "1",
    homepageMultiPingTaskIds: [1, 2, 3],
  };

  const savedThemeSettings: Record<string, Record<string, unknown>> = {};

  const readPersistedSettings = (): Record<string, unknown> | null => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const raw =
          window.localStorage.getItem(MOCK_STORAGE_KEY) ||
          window.localStorage.getItem(LEGACY_STORAGE_KEY);
        if (raw) return JSON.parse(raw) as Record<string, unknown>;
      }
    } catch {}
    return null;
  };

  const writePersistedSettings = (settings: Record<string, unknown>) => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(settings));
      }
    } catch {}
  };

  const initialStored = readPersistedSettings();
  if (initialStored) {
    savedThemeSettings["SAO"] = initialStored;
    savedThemeSettings["sao"] = initialStored;
    savedThemeSettings["monitor-theme-sao"] = initialStored;
    savedThemeSettings["komari-theme-sao"] = initialStored;
  }

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    const url = new URL(request.url, window.location.origin);

    if (url.hostname === "api.frankfurter.dev") {
      return json([
        { base: "USD", quote: "CNY", rate: 7.18 },
        { base: "USD", quote: "EUR", rate: 0.86 },
        { base: "USD", quote: "JPY", rate: 146.4 },
      ]);
    }

    if (url.origin !== window.location.origin || !url.pathname.startsWith("/api/")) {
      return nativeFetch(input, init);
    }

    if (url.pathname === "/api/me") {
      return json(
        adminMode
          ? {
              authed: true,
              logged_in: true,
              username: "mock-admin",
              uuid: "mock-admin-uuid",
              github: false,
              site_name: "Monitor SAO",
              public_page: true,
              history_days: 90,
            }
          : {
              authed: false,
              logged_in: false,
              username: "",
              uuid: "",
              github: false,
              site_name: "Monitor SAO",
              public_page: true,
              history_days: 90,
            },
      );
    }

    if (url.pathname === "/api/admin/client/list") {
      if (!adminMode) return json({ message: "unauthorized" }, { status: 401 });
      return json(
        nodes.map(({ uuid, name, group, region, weight }) => ({
          uuid,
          name,
          group,
          region,
          weight,
        })),
      );
    }

    if (url.pathname === "/api/admin/ping") {
      if (!adminMode) return json({ message: "unauthorized" }, { status: 401 });
      return json(pingTasks);
    }

    if (url.pathname === "/api/admin/theme/settings") {
      if (!adminMode) return json({ message: "unauthorized" }, { status: 401 });
      const theme = url.searchParams.get("theme") ?? defaultTheme;
      const body = (await request.json()) as Record<string, unknown>;
      savedThemeSettings[theme] = body;
      savedThemeSettings["SAO"] = body;
      savedThemeSettings["sao"] = body;
      savedThemeSettings["monitor-theme-sao"] = body;
      savedThemeSettings["komari-theme-sao"] = body;
      writePersistedSettings(body);
      return json({ status: "success" });
    }

    // 拦截 Monitor 官方主题配置接口: GET /api/themes/{short}/config 与 PUT /api/themes/{short}/config
    if (/^\/api\/themes\/[^/]+\/config$/.test(url.pathname) || url.pathname === "/sao-config.json") {
      if (request.method === "PUT" || request.method === "POST") {
        if (!adminMode) return json({ message: "unauthorized" }, { status: 401 });
        const body = (await request.json()) as Record<string, unknown>;
        savedThemeSettings[defaultTheme] = body;
        savedThemeSettings["SAO"] = body;
        savedThemeSettings["sao"] = body;
        savedThemeSettings["monitor-theme-sao"] = body;
        savedThemeSettings["komari-theme-sao"] = body;
        writePersistedSettings(body);
        return json(body);
      }
      // GET 请求
      const activeSaved =
        savedThemeSettings["sao"] ??
        savedThemeSettings["SAO"] ??
        savedThemeSettings[defaultTheme] ??
        readPersistedSettings();
      return json(
        activeSaved
          ? { ...defaultMockThemeSettings, ...activeSaved }
          : defaultMockThemeSettings,
      );
    }

    if (url.pathname === "/api/public") {
      const theme = url.searchParams.get("theme") ?? defaultTheme;
      const activeSaved =
        savedThemeSettings[theme] ??
        savedThemeSettings["SAO"] ??
        savedThemeSettings["monitor-theme-sao"] ??
        savedThemeSettings["komari-theme-sao"] ??
        readPersistedSettings();
      return json({
        sitename: "Monitor SAO",
        description: "全球节点运行状态",
        theme: "SAO",
        allow_cors: false,
        disable_password_login: false,
        oauth_enable: false,
        private_site: false,
        record_enabled: true,
        record_preserve_time: 30,
        ping_record_preserve_time: 30,
        metric_retention_days: 90,
        custom_head: "",
        custom_body: "",
        theme_settings: activeSaved
          ? { ...defaultMockThemeSettings, ...activeSaved }
          : defaultMockThemeSettings,
      });
    }

    if (url.pathname === "/api/nodes") {
      const nowSec = Math.floor(Date.now() / 1000);
      return json(
        nodes.map((node, index) => {
          const [cpu, load, swapPct, diskPct, , up, down, totalUp, totalDown, online] =
            getNodeStatusProfile(index, node);
          const memoryPct = index % 9 === 2 ? 88 : 36 + (index % 6) * 7;
          return {
            ...node,
            id: node.uuid,
            name: node.name,
            group: node.group,
            sort: node.weight,
            public: true,
            online,
            country: node.region,
            last_seen: nowSec,
            metrics: {
              uptime: 86400 * (15 + index * 8) + (index % 5) * 3600,
              cpu,
              load: [load, +(load * 0.88).toFixed(2), +(load * 0.76).toFixed(2)],
              mem_total: node.mem_total,
              mem_used: Math.round((node.mem_total * memoryPct) / 100),
              swap_total: node.swap_total,
              swap_used: Math.round((node.swap_total * swapPct) / 100),
              disk_total: node.disk_total,
              disk_used: Math.round((node.disk_total * diskPct) / 100),
              net_rx: down,
              net_tx: up,
              total_rx: totalDown,
              total_tx: totalUp,
              tcp: 32 + (index % 8) * 14,
              udp: 12 + (index % 5) * 6,
              procs: 80 + (index % 10) * 12,
            },
          };
        }),
      );
    }

    if (url.pathname === "/api/rpc2") {
      const payload = (await request.json()) as {
        id?: number | string;
        method?: string;
        params?: {
          uuid?: string;
          type?: string;
          task_id?: number;
          hours?: number;
          metric_keys?: string[];
          entity_ids?: string[];
          tags?: { task_id?: string };
          start?: string;
          end?: string;
        };
      };
      const reply = (result: unknown) => json({ jsonrpc: "2.0", id: payload.id, result });
      const methodNotFound = () =>
        json({
          jsonrpc: "2.0",
          id: payload.id,
          error: { code: -32601, message: `Method not found: ${payload.method}` },
        });

      switch (payload.method) {
        case "public:queryMetrics": {
          // 各类 metric key 都要有响应:任何一类返回 Method not found 都会置位全局
          // 降级标志,把其余 metrics 路径一并拖下水(dev 与真实后端行为背离)。
          const metricKeys = payload.params?.metric_keys ?? [];
          if (metricKeys.some((key) => key.startsWith("ping."))) {
            return reply(pingMetricPayload(payload.params ?? {}));
          }
          if (metricKeys.some((key) => key === "traffic.up" || key === "traffic.down")) {
            return reply(trafficMetricPayload(payload.params ?? {}));
          }
          return reply(loadMetricPayload(payload.params ?? {}));
        }
        case "public:getPingMetricStats":
          // 统计接口不实现:api.ts 对它单独 catch 后会用 records 本地计算,足够 dev 用。
          return methodNotFound();
        case "public:getPublicPingTasks":
          return reply(pingTasks);
        case "common:getNodes":
          return reply(Object.fromEntries(nodes.map((node) => [node.uuid, node])));
        case "common:getNodesLatestStatus":
          return reply(latestStatus());
        case "common:getRecords": {
          const isPing = payload.params?.type === "ping";
          const records = isPing
            ? pingRecords(payload.params?.uuid, payload.params?.task_id)
            : loadRecords(payload.params?.uuid ?? nodes[0].uuid);
          return reply({ count: records.length, records, tasks: isPing ? pingTasks : [] });
        }
        default:
          // 未实现的方法返回标准错误,与真实后端一致——空对象伪装成功会让 dev 测不出接口缺失。
          return methodNotFound();
      }
    }

    return json({ message: `No mock for ${url.pathname}` }, { status: 404 });
  };
}
