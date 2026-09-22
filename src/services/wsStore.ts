import type { NodeInfo, NodeMetrics, TrafficTrendSample } from "@/types/komari";
import {
  convertMonitorNodeToInfo,
  convertMonitorNodeToMetrics,
  safeMonitorNodes,
  type MonitorNode,
} from "@/types/monitor";

type Listener = () => void;
type RealtimePayload = Record<string, unknown>;

interface State {
  metaByUuid: Record<string, NodeInfo>;
  metricsByUuid: Record<string, NodeMetrics>;
  rawNodesByUuid: Record<string, MonitorNode>;
  trafficTrends: Record<string, NodeTrafficTrend>;
  order: string[];
  failureStreak: number;
}

export interface StoreStatusSnapshot {
  failureStreak: number;
  hydrated: boolean;
  nodeInfoError: boolean;
}

export interface HomeNodeSummary {
  uuid: string;
  group: string;
  region: string;
  hidden: boolean;
  weight: number;
  online: boolean | null;
  trafficUp: number;
  trafficDown: number;
  netUp: number;
  netDown: number;
  cpuPct: number;
  ramUsed: number;
  ramTotal: number;
  diskUsed: number;
  diskTotal: number;
  connectionsTcp: number;
  connectionsUdp: number;
}

export interface NodeOnlineSummary {
  uuid: string;
  online: boolean | null;
}

interface TrafficTrendSeries {
  buffer: TrafficTrendSample[];
  start: number;
  size: number;
  signature: string;
  snapshot: TrafficTrendSample[];
}

interface NodeTrafficTrend {
  up: TrafficTrendSeries;
  down: TrafficTrendSeries;
  snapshot: {
    up: TrafficTrendSample[];
    down: TrafficTrendSample[];
  };
}

const TRAFFIC_TREND_SAMPLE_COUNT = 18;
const EMPTY_TRAFFIC_TREND_SAMPLE: TrafficTrendSample = {
  value: 0,
  level: 0.25,
  opacity: 0.52,
};
const EMPTY_TRAFFIC_TREND_SNAPSHOT = Array.from(
  { length: TRAFFIC_TREND_SAMPLE_COUNT },
  () => EMPTY_TRAFFIC_TREND_SAMPLE,
);
const EMPTY_TRAFFIC_TREND_SERIES: TrafficTrendSeries = {
  buffer: [],
  start: 0,
  size: 0,
  signature: "",
  snapshot: EMPTY_TRAFFIC_TREND_SNAPSHOT,
};
const EMPTY_TRAFFIC_TREND: NodeTrafficTrend = {
  up: EMPTY_TRAFFIC_TREND_SERIES,
  down: EMPTY_TRAFFIC_TREND_SERIES,
  snapshot: {
    up: EMPTY_TRAFFIC_TREND_SNAPSHOT,
    down: EMPTY_TRAFFIC_TREND_SNAPSHOT,
  },
};

export function resolveTrafficTotal(previous: number, raw: number): number {
  if (!Number.isFinite(raw) || raw < 0) return previous;
  if (raw === 0 && previous > 0) return previous;
  return raw;
}

export function resolveFlatConnectionsTcp(payload: RealtimePayload): number {
  if (typeof payload.connections_tcp === "number") return payload.connections_tcp;
  if (typeof payload.connections === "number") {
    const udp = typeof payload.connections_udp === "number" ? payload.connections_udp : 0;
    return Math.max(0, payload.connections - udp);
  }
  return 0;
}

function emptyState(): State {
  return {
    metaByUuid: {},
    metricsByUuid: {},
    rawNodesByUuid: {},
    trafficTrends: {},
    order: [],
    failureStreak: 0,
  };
}

function materializeTrafficTrendSnapshot(
  buffer: TrafficTrendSample[],
  start: number,
  size: number,
): TrafficTrendSample[] {
  if (size <= 0) return EMPTY_TRAFFIC_TREND_SNAPSHOT;
  const snapshot = new Array<TrafficTrendSample>(TRAFFIC_TREND_SAMPLE_COUNT);
  const padding = TRAFFIC_TREND_SAMPLE_COUNT - size;

  for (let i = 0; i < padding; i++) {
    snapshot[i] = EMPTY_TRAFFIC_TREND_SAMPLE;
  }
  for (let i = 0; i < size; i++) {
    snapshot[padding + i] = buffer[(start + i) % TRAFFIC_TREND_SAMPLE_COUNT]!;
  }
  return snapshot;
}

function updateTrafficTrendSeries(
  prevSeries: TrafficTrendSeries,
  value: number,
  online: boolean | null,
): { series: TrafficTrendSeries; changed: boolean } {
  if (online === false) {
    if (!prevSeries.signature && prevSeries.size === 0) {
      return { series: prevSeries, changed: false };
    }
  }

  const safeValue = Math.max(0, Number.isFinite(value) ? value : 0);
  let visibleMax = safeValue;
  for (let i = 0; i < prevSeries.size; i++) {
    const sample = prevSeries.buffer[(prevSeries.start + i) % TRAFFIC_TREND_SAMPLE_COUNT];
    if (sample && sample.value > visibleMax) {
      visibleMax = sample.value;
    }
  }

  const level = safeValue > 0 ? Math.max(0.2, Math.min(1, safeValue / visibleMax)) : 0.25;
  const nextSample: TrafficTrendSample = {
    value: safeValue,
    level,
    opacity: safeValue > 0 ? 0.4 + level * 0.48 : 0.52,
  };

  const buffer = new Array<TrafficTrendSample>(TRAFFIC_TREND_SAMPLE_COUNT);
  const nextSize =
    prevSeries.size < TRAFFIC_TREND_SAMPLE_COUNT
      ? prevSeries.size + 1
      : TRAFFIC_TREND_SAMPLE_COUNT;
  const nextStart =
    prevSeries.size < TRAFFIC_TREND_SAMPLE_COUNT
      ? prevSeries.start
      : (prevSeries.start + 1) % TRAFFIC_TREND_SAMPLE_COUNT;
  const insertIndex =
    prevSeries.size < TRAFFIC_TREND_SAMPLE_COUNT
      ? (prevSeries.start + prevSeries.size) % TRAFFIC_TREND_SAMPLE_COUNT
      : prevSeries.start;

  for (let i = 0; i < prevSeries.size; i++) {
    const idx = (prevSeries.start + i) % TRAFFIC_TREND_SAMPLE_COUNT;
    buffer[idx] = prevSeries.buffer[idx]!;
  }
  buffer[insertIndex] = nextSample;

  const signature = `${safeValue}:${nextSample.level.toFixed(2)}`;
  return {
    series: {
      buffer,
      start: nextStart,
      size: nextSize,
      signature,
      snapshot: materializeTrafficTrendSnapshot(buffer, nextStart, nextSize),
    },
    changed: prevSeries.signature !== signature,
  };
}

let state: State = emptyState();
const visibleNodeListeners = new Set<Listener>();
const allNodesListeners = new Set<Listener>();
const homeNodeSummaryListeners = new Set<Listener>();
const nodeOnlineSummaryListeners = new Set<Listener>();
const storeStatusListeners = new Set<Listener>();
const nodeMetaListeners = new Map<string, Set<Listener>>();
const nodeMetricsListeners = new Map<string, Set<Listener>>();
const trafficTrendListeners = new Map<string, Set<Listener>>();

let storeVersion = 0;
let visibleNodeUuidsSnapshot: string[] = [];
let visibleNodeUuidsSnapshotVersion = -1;
let allNodeMetaSnapshot: NodeInfo[] = [];
let allNodeMetaSnapshotVersion = -1;
let homeNodeSummariesSnapshot: HomeNodeSummary[] = [];
let homeNodeSummariesSnapshotVersion = -1;
let nodeOnlineSummariesSnapshot: NodeOnlineSummary[] = [];
let nodeOnlineSummariesSnapshotVersion = -1;

let storeStatusSnapshot: StoreStatusSnapshot = {
  failureStreak: 0,
  hydrated: false,
  nodeInfoError: false,
};

function emitListeners(listeners: Iterable<Listener>) {
  for (const listener of listeners) listener();
}

function emitMappedListeners(listenersByKey: Map<string, Set<Listener>>, keys: Iterable<string>) {
  for (const key of keys) {
    const listeners = listenersByKey.get(key);
    if (listeners) emitListeners(listeners);
  }
}

function hasAny(items: Iterable<string> | undefined): boolean {
  if (!items) return false;
  return !items[Symbol.iterator]().next().done;
}

interface CommitTouches {
  meta?: Iterable<string>;
  metrics?: Iterable<string>;
  trafficTrends?: Iterable<string>;
  nodeList?: boolean;
  allNodes?: boolean;
  storeStatus?: boolean;
}

function commit(next: State, touches: CommitTouches = {}) {
  const previous = state;
  const onlineTouched =
    Boolean(touches.nodeList) ||
    (touches.metrics
      ? Array.from(touches.metrics).some(
          (uuid) =>
            (previous.metricsByUuid[uuid]?.online ?? null) !==
            (next.metricsByUuid[uuid]?.online ?? null),
        )
      : false);

  state = next;
  storeVersion += 1;

  const homeTouched =
    Boolean(touches.nodeList || touches.allNodes) ||
    hasAny(touches.meta) ||
    hasAny(touches.metrics);

  if (touches.nodeList) emitListeners(visibleNodeListeners);
  if (touches.allNodes) emitListeners(allNodesListeners);
  if (homeTouched) emitListeners(homeNodeSummaryListeners);
  if (onlineTouched) emitListeners(nodeOnlineSummaryListeners);
  if (touches.storeStatus) emitListeners(storeStatusListeners);
  if (touches.meta) emitMappedListeners(nodeMetaListeners, touches.meta);
  if (touches.metrics) emitMappedListeners(nodeMetricsListeners, touches.metrics);
  if (touches.trafficTrends) emitMappedListeners(trafficTrendListeners, touches.trafficTrends);
}

// -------------------------------------------------------------
// Monitor 数据接收与状态流处理
// -------------------------------------------------------------

function applyMonitorNodes(rawList: unknown) {
  const safeList = safeMonitorNodes(rawList);

  const nextMeta: Record<string, NodeInfo> = {};
  const nextMetrics: Record<string, NodeMetrics> = {};
  const nextRawNodes: Record<string, MonitorNode> = {};
  const nextTrends: Record<string, NodeTrafficTrend> = { ...state.trafficTrends };
  const order: string[] = [];

  const touchedMeta: string[] = [];
  const touchedMetrics: string[] = [];
  const touchedTrends: string[] = [];

  for (const node of safeList) {
    const uuid = String(node.id);
    order.push(uuid);
    nextRawNodes[uuid] = node;

    const info = convertMonitorNodeToInfo(node);
    const metrics = convertMonitorNodeToMetrics(node);

    nextMeta[uuid] = info;
    nextMetrics[uuid] = metrics;

    const prevMeta = state.metaByUuid[uuid];
    if (!prevMeta || JSON.stringify(prevMeta) !== JSON.stringify(info)) {
      touchedMeta.push(uuid);
    }

    const prevMetrics = state.metricsByUuid[uuid];
    if (!prevMetrics || JSON.stringify(prevMetrics) !== JSON.stringify(metrics)) {
      touchedMetrics.push(uuid);
    }

    // 更新流速趋势
    const existingTrend = nextTrends[uuid] || EMPTY_TRAFFIC_TREND;
    const upRes = updateTrafficTrendSeries(existingTrend.up, metrics.netUp, metrics.online);
    const downRes = updateTrafficTrendSeries(existingTrend.down, metrics.netDown, metrics.online);

    if (upRes.changed || downRes.changed) {
      nextTrends[uuid] = {
        up: upRes.series,
        down: downRes.series,
        snapshot: {
          up: upRes.series.snapshot,
          down: downRes.series.snapshot,
        },
      };
      touchedTrends.push(uuid);
    }
  }

  const orderChanged =
    order.length !== state.order.length ||
    order.some((uuid, idx) => uuid !== state.order[idx]);

  const nextState: State = {
    metaByUuid: nextMeta,
    metricsByUuid: nextMetrics,
    rawNodesByUuid: nextRawNodes,
    trafficTrends: nextTrends,
    order,
    failureStreak: 0,
  };

  const statusChanged = !storeStatusSnapshot.hydrated || state.failureStreak > 0;
  if (statusChanged) {
    storeStatusSnapshot = {
      failureStreak: 0,
      hydrated: true,
      nodeInfoError: false,
    };
  }

  commit(nextState, {
    meta: touchedMeta,
    metrics: touchedMetrics,
    trafficTrends: touchedTrends,
    nodeList: orderChanged,
    allNodes: orderChanged || touchedMeta.length > 0,
    storeStatus: statusChanged,
  });
}

// -------------------------------------------------------------
// WebSocket 与自动轮询网络管理
// -------------------------------------------------------------

let wsSocket: WebSocket | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let isStarted = false;
let refCount = 0;

function fetchOnce() {
  const early =
    typeof window !== "undefined"
      ? (window as unknown as { __EARLY_DATA__?: { nodes?: Promise<{ nodes?: unknown[] } | null> | null } })
          .__EARLY_DATA__?.nodes
      : null;

  const fetchPromise = early
    ? early
        .then((d) => {
          if (d && Array.isArray(d.nodes)) return d;
          throw new Error("No early nodes");
        })
        .catch(() =>
          fetch("/api/nodes").then((r) => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
          }),
        )
    : fetch("/api/nodes").then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      });

  fetchPromise
    .then((d) => {
      if (d && Array.isArray(d.nodes)) {
        applyMonitorNodes(d.nodes as Parameters<typeof applyMonitorNodes>[0]);
      }
    })
    .catch(() => {
      state.failureStreak += 1;
      storeStatusSnapshot = {
        failureStreak: state.failureStreak,
        hydrated: storeStatusSnapshot.hydrated,
        nodeInfoError: !storeStatusSnapshot.hydrated,
      };
      emitListeners(storeStatusListeners);
    });
}

function startWsConnection() {
  if (typeof window === "undefined") return;

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/api/ws`;

  try {
    wsSocket = new WebSocket(wsUrl);
  } catch {
    if (!pollTimer) pollTimer = setInterval(fetchOnce, 5000);
    return;
  }

  wsSocket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data && Array.isArray(data.nodes)) {
        applyMonitorNodes(data.nodes);
        if (pollTimer) {
          clearInterval(pollTimer);
          pollTimer = null;
        }
      }
    } catch {}
  };

  wsSocket.onerror = () => {
    wsSocket?.close();
  };

  wsSocket.onclose = () => {
    if (!isStarted) return;
    if (!pollTimer) pollTimer = setInterval(fetchOnce, 5000);
    reconnectTimer = setTimeout(startWsConnection, 5000);
  };
}

function startStore() {
  if (isStarted) return;
  isStarted = true;

  fetchOnce();
  startWsConnection();
}

function stopStore() {
  isStarted = false;
  if (wsSocket) {
    wsSocket.close();
    wsSocket = null;
  }
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

export function retainStore() {
  refCount += 1;
  if (refCount === 1) {
    startStore();
  }
  return () => {
    refCount = Math.max(0, refCount - 1);
    if (refCount === 0) {
      stopStore();
    }
  };
}

// -------------------------------------------------------------
// 订阅与外部 Snapshot API
// -------------------------------------------------------------

export function subscribeVisibleNodeUuids(listener: Listener): () => void {
  const release = retainStore();
  visibleNodeListeners.add(listener);
  return () => {
    visibleNodeListeners.delete(listener);
    release();
  };
}

export function subscribeAllNodes(listener: Listener): () => void {
  const release = retainStore();
  allNodesListeners.add(listener);
  return () => {
    allNodesListeners.delete(listener);
    release();
  };
}

export function subscribeHomeNodeSummaries(listener: Listener): () => void {
  const release = retainStore();
  homeNodeSummaryListeners.add(listener);
  return () => {
    homeNodeSummaryListeners.delete(listener);
    release();
  };
}

export function subscribeNodeOnlineSummaries(listener: Listener): () => void {
  const release = retainStore();
  nodeOnlineSummaryListeners.add(listener);
  return () => {
    nodeOnlineSummaryListeners.delete(listener);
    release();
  };
}

export function subscribeStoreStatus(listener: Listener): () => void {
  const release = retainStore();
  storeStatusListeners.add(listener);
  return () => {
    storeStatusListeners.delete(listener);
    release();
  };
}

export function subscribeToNodeMeta(uuid: string, listener: Listener): () => void {
  const release = retainStore();
  let set = nodeMetaListeners.get(uuid);
  if (!set) {
    set = new Set();
    nodeMetaListeners.set(uuid, set);
  }
  set.add(listener);
  return () => {
    set?.delete(listener);
    if (set && set.size === 0) nodeMetaListeners.delete(uuid);
    release();
  };
}

export function subscribeToNodeMetrics(uuid: string, listener: Listener): () => void {
  const release = retainStore();
  let set = nodeMetricsListeners.get(uuid);
  if (!set) {
    set = new Set();
    nodeMetricsListeners.set(uuid, set);
  }
  set.add(listener);
  return () => {
    set?.delete(listener);
    if (set && set.size === 0) nodeMetricsListeners.delete(uuid);
    release();
  };
}

export function subscribeToNodeTrafficTrend(uuid: string, listener: Listener): () => void {
  const release = retainStore();
  let set = trafficTrendListeners.get(uuid);
  if (!set) {
    set = new Set();
    trafficTrendListeners.set(uuid, set);
  }
  set.add(listener);
  return () => {
    set?.delete(listener);
    if (set && set.size === 0) trafficTrendListeners.delete(uuid);
    release();
  };
}

export function getStoreStatusSnapshot(): StoreStatusSnapshot {
  return storeStatusSnapshot;
}

export function getNodeMetaSnapshot(uuid: string): NodeInfo | undefined {
  return state.metaByUuid[uuid];
}

export function getNodeMetricsSnapshot(uuid: string): NodeMetrics | undefined {
  return state.metricsByUuid[uuid];
}

export function getNodeTrafficTrendSnapshot(uuid: string): {
  up: TrafficTrendSample[];
  down: TrafficTrendSample[];
} {
  const trend = state.trafficTrends[uuid] ?? EMPTY_TRAFFIC_TREND;
  return trend.snapshot;
}

export function getVisibleNodeUuidsSnapshot(_includeHidden = false): string[] {
  if (visibleNodeUuidsSnapshotVersion === storeVersion) {
    return visibleNodeUuidsSnapshot;
  }
  visibleNodeUuidsSnapshot = state.order.slice();
  visibleNodeUuidsSnapshotVersion = storeVersion;
  return visibleNodeUuidsSnapshot;
}

export function getAllNodeMetaSnapshot(): NodeInfo[] {
  if (allNodeMetaSnapshotVersion === storeVersion) {
    return allNodeMetaSnapshot;
  }
  allNodeMetaSnapshot = state.order
    .map((uuid) => state.metaByUuid[uuid])
    .filter((n): n is NodeInfo => n != null);
  allNodeMetaSnapshotVersion = storeVersion;
  return allNodeMetaSnapshot;
}

export function getHomeNodeSummariesSnapshot(): HomeNodeSummary[] {
  if (homeNodeSummariesSnapshotVersion === storeVersion) {
    return homeNodeSummariesSnapshot;
  }
  homeNodeSummariesSnapshot = state.order.map((uuid) => {
    const meta = state.metaByUuid[uuid];
    const metrics = state.metricsByUuid[uuid];
    return {
      uuid,
      group: meta?.group || "",
      region: meta?.region || "",
      hidden: meta?.hidden || false,
      weight: meta?.weight || 0,
      online: metrics?.online ?? null,
      trafficUp: metrics?.trafficUp || 0,
      trafficDown: metrics?.trafficDown || 0,
      netUp: metrics?.netUp || 0,
      netDown: metrics?.netDown || 0,
      cpuPct: metrics?.cpuPct || 0,
      ramUsed: metrics?.ramUsed || 0,
      ramTotal: metrics?.ramTotal || 0,
      diskUsed: metrics?.diskUsed || 0,
      diskTotal: metrics?.diskTotal || 0,
      connectionsTcp: metrics?.connectionsTcp || 0,
      connectionsUdp: metrics?.connectionsUdp || 0,
    };
  });
  homeNodeSummariesSnapshotVersion = storeVersion;
  return homeNodeSummariesSnapshot;
}

export function getNodeOnlineSummariesSnapshot(): NodeOnlineSummary[] {
  if (nodeOnlineSummariesSnapshotVersion === storeVersion) {
    return nodeOnlineSummariesSnapshot;
  }
  nodeOnlineSummariesSnapshot = state.order.map((uuid) => ({
    uuid,
    online: state.metricsByUuid[uuid]?.online ?? null,
  }));
  nodeOnlineSummariesSnapshotVersion = storeVersion;
  return nodeOnlineSummariesSnapshot;
}

export function getRawNode(uuid: string): MonitorNode | undefined {
  return state.rawNodesByUuid[uuid];
}

export function getAllRawNodes(): Record<string, MonitorNode> {
  return state.rawNodesByUuid;
}

