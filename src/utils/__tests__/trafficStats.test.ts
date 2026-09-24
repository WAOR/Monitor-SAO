import { describe, expect, it } from "vitest";
import type { LoadRecord } from "@/types/komari";
import {
  buildTodayTrafficMetricSamples,
  buildTodayTrafficRecordSamples,
  RATE_DOWN_METRIC,
  RATE_UP_METRIC,
  summarizeTodayTrafficMetrics,
  summarizeTodayTrafficRecords,
  TRAFFIC_DOWN_METRIC,
  TRAFFIC_UP_METRIC,
  type TrafficMetricSeries,
  getStoredNodePeak,
  updateStoredNodePeak,
} from "@/utils/trafficStats";

function metricSeries(
  metricKey: string,
  values: Array<[string, number | null, number?]>,
): TrafficMetricSeries {
  return {
    metricKey,
    client: "node-a",
    intervalSeconds: 300,
    points: values.map(([time, value, count = 1]) => ({ time, value, count })),
  };
}

function record(time: string, overrides: Partial<LoadRecord> = {}): LoadRecord {
  return {
    cpu: 0,
    gpu: 0,
    ram: 0,
    ram_total: 0,
    swap: 0,
    swap_total: 0,
    load: 0,
    temp: 0,
    disk: 0,
    disk_total: 0,
    net_in: 0,
    net_out: 0,
    net_total_up: 0,
    net_total_down: 0,
    process: 0,
    connections: 0,
    connections_udp: 0,
    client: "node-a",
    time,
    ...overrides,
  };
}

describe("today traffic stats", () => {
  it("sums traffic buckets and keeps the timestamp of each direction peak", () => {
    const stats = summarizeTodayTrafficMetrics(
      [
        metricSeries(TRAFFIC_UP_METRIC, [
          ["2026-07-16T00:00:00Z", 100],
          ["2026-07-16T00:05:00Z", 50],
        ]),
        metricSeries(TRAFFIC_DOWN_METRIC, [["2026-07-16T00:00:00Z", 300]]),
        metricSeries(RATE_UP_METRIC, [
          ["2026-07-16T00:00:00Z", 10],
          ["2026-07-16T00:05:00Z", 25],
        ]),
        metricSeries(RATE_DOWN_METRIC, [
          ["2026-07-16T00:00:00Z", 40],
          ["2026-07-16T00:05:00Z", 30],
        ]),
      ],
      ["node-a", "node-b"],
    );

    expect(stats[0]).toMatchObject({
      trafficUp: 150,
      trafficDown: 300,
      peakUp: 25,
      peakUpAt: Date.parse("2026-07-16T00:05:00Z"),
      peakDown: 40,
      peakDownAt: Date.parse("2026-07-16T00:00:00Z"),
      sampleCount: 2,
      hasSamples: true,
    });
    expect(stats[1]).toMatchObject({ uuid: "node-b", hasSamples: false, sampleCount: 0 });
  });

  it("derives counter deltas across resets for the compatibility path", () => {
    const start = Date.parse("2026-07-16T00:00:00Z");
    const stats = summarizeTodayTrafficRecords(
      "node-a",
      [
        record("2026-07-15T23:55:00Z", { net_total_up: 100, net_total_down: 200 }),
        record("2026-07-16T00:05:00Z", {
          net_total_up: 150,
          net_total_down: 260,
          net_out: 12,
          net_in: 24,
        }),
        record("2026-07-16T00:10:00Z", {
          net_total_up: 20,
          net_total_down: 30,
          net_out: 30,
          net_in: 18,
        }),
      ],
      start,
      Date.parse("2026-07-16T01:00:00Z"),
    );

    expect(stats).toMatchObject({
      trafficUp: 70,
      trafficDown: 90,
      peakUp: 30,
      peakDown: 24,
      sampleCount: 2,
      hasSamples: true,
    });
  });

  it("does not assign a pseudo peak timestamp when every rate sample is zero", () => {
    const metricStat = summarizeTodayTrafficMetrics(
      [
        metricSeries(RATE_UP_METRIC, [["2026-07-16T00:05:00Z", 0]]),
        metricSeries(RATE_DOWN_METRIC, [["2026-07-16T00:05:00Z", 0]]),
      ],
      ["node-a"],
    )[0];
    const recordStat = summarizeTodayTrafficRecords(
      "node-a",
      [record("2026-07-16T00:05:00Z")],
      Date.parse("2026-07-16T00:00:00Z"),
      Date.parse("2026-07-16T01:00:00Z"),
    );

    expect(metricStat).toMatchObject({
      peakUp: 0,
      peakUpAt: null,
      peakDown: 0,
      peakDownAt: null,
    });
    expect(recordStat).toMatchObject({
      peakUp: 0,
      peakUpAt: null,
      peakDown: 0,
      peakDownAt: null,
    });
  });

  it("builds newest-first upload and download samples for the detail table", () => {
    const metricSamples = buildTodayTrafficMetricSamples(
      [
        metricSeries(RATE_UP_METRIC, [
          ["2026-07-16T00:00:00Z", 10],
          ["2026-07-16T00:05:00Z", 20],
        ]),
        metricSeries(RATE_DOWN_METRIC, [
          ["2026-07-16T00:00:00Z", 30],
          ["2026-07-16T00:05:00Z", 40],
        ]),
      ],
      "node-a",
    );

    expect(metricSamples).toEqual([
      { timeMs: Date.parse("2026-07-16T00:05:00Z"), up: 20, down: 40 },
      { timeMs: Date.parse("2026-07-16T00:00:00Z"), up: 10, down: 30 },
    ]);

    const recordSamples = buildTodayTrafficRecordSamples(
      [
        record("2026-07-15T23:55:00Z", { net_out: 1, net_in: 2 }),
        record("2026-07-16T00:05:00Z", { net_out: 3, net_in: 4 }),
      ],
      Date.parse("2026-07-16T00:00:00Z"),
      Date.parse("2026-07-16T01:00:00Z"),
    );
    expect(recordSamples).toEqual([
      { timeMs: Date.parse("2026-07-16T00:05:00Z"), up: 3, down: 4 },
    ]);
  });

  it("stores and locks in daily highest peaks in localStorage", () => {
    const store = new Map<string, string>();
    const storageMock = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, val: string) => store.set(key, val),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
      length: 0,
      key: () => null,
    };
    const original = globalThis.localStorage;
    Object.defineProperty(globalThis, "localStorage", {
      value: storageMock,
      configurable: true,
      writable: true,
    });

    try {
      const testUuid = "test-node-uuid";
      const t1 = 1790000000000;
      const t2 = 1790000005000;
      const t3 = 1790000010000;

      // 初始状态应为空
      const init = getStoredNodePeak(testUuid, t1);
      expect(init.peakUp).toBe(0);
      expect(init.peakDown).toBe(0);

      // 测速高峰发生
      updateStoredNodePeak(testUuid, 100 * 1024 * 1024, 300 * 1024 * 1024, t1);
      const peak1 = getStoredNodePeak(testUuid, t1);
      expect(peak1.peakUp).toBe(100 * 1024 * 1024);
      expect(peak1.peakUpAt).toBe(t1);
      expect(peak1.peakDown).toBe(300 * 1024 * 1024);
      expect(peak1.peakDownAt).toBe(t1);

      // 测速结束，速率归零或变低，峰值绝不回落
      updateStoredNodePeak(testUuid, 1024, 2048, t2);
      const peak2 = getStoredNodePeak(testUuid, t2);
      expect(peak2.peakUp).toBe(100 * 1024 * 1024);
      expect(peak2.peakDown).toBe(300 * 1024 * 1024);

      // 出现更高峰值，更新并更新时间戳
      updateStoredNodePeak(testUuid, 150 * 1024 * 1024, 200 * 1024 * 1024, t3);
      const peak3 = getStoredNodePeak(testUuid, t3);
      expect(peak3.peakUp).toBe(150 * 1024 * 1024);
      expect(peak3.peakUpAt).toBe(t3);
      expect(peak3.peakDown).toBe(300 * 1024 * 1024); // 下行未被打破，保持 300M
      expect(peak3.peakDownAt).toBe(t1);
    } finally {
      Object.defineProperty(globalThis, "localStorage", {
        value: original,
        configurable: true,
        writable: true,
      });
    }
  });
});

