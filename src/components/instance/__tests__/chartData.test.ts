import { describe, expect, it } from "vitest";
import {
  cutPeakValues,
  downsampleAligned,
  fillMissingMetricPoints,
  insertMetricGapSentinels,
  smoothByCount,
  type TimedMetricPoint,
} from "@/components/instance/chartData";

describe("fillMissingMetricPoints", () => {
  it("keeps the newest sample's own timestamp instead of snapping it to the grid", () => {
    // 末点 (t=35) 不在 10ms 网格上；不能被拉回到 t=30。
    const points: TimedMetricPoint[] = [
      { time: 0, v: 1 },
      { time: 10, v: 2 },
      { time: 20, v: 3 },
      { time: 35, v: 9 },
    ];
    const filled = fillMissingMetricPoints(points, { intervalSeconds: 10, matchToleranceSeconds: 5 });
    const last = filled[filled.length - 1];
    expect(last.time).toBe(35);
    expect(last.v).toBe(9);
  });

  it("leaves on-grid series untouched at the trailing edge", () => {
    const points: TimedMetricPoint[] = [
      { time: 0, v: 1 },
      { time: 10, v: 2 },
      { time: 20, v: 3 },
    ];
    const filled = fillMissingMetricPoints(points, { intervalSeconds: 10, matchToleranceSeconds: 5 });
    expect(filled.map((p) => p.time)).toEqual([0, 10, 20]);
    expect(filled[filled.length - 1].v).toBe(3);
  });

  it("keeps a trailing sample outside the final grid tolerance", () => {
    const points: TimedMetricPoint[] = [
      { time: 0, v: 1 },
      { time: 10, v: 2 },
      { time: 20, v: 3 },
      { time: 36, v: 4 },
    ];

    const filled = fillMissingMetricPoints(points, {
      intervalSeconds: 10,
      matchToleranceSeconds: 5,
    });

    expect(filled.map((point) => point.time)).toEqual([0, 10, 20, 30, 36]);
    expect(filled[filled.length - 1].v).toBe(4);
  });

  it("prefers an exact trailing sample over an earlier point snapped to the same grid time", () => {
    const filled = fillMissingMetricPoints(
      [
        { time: 0, v: 1 },
        { time: 10, v: 2 },
        { time: 16, v: 3 },
        { time: 20, v: 4 },
      ],
      { intervalSeconds: 10, matchToleranceSeconds: 5 },
    );

    expect(filled[filled.length - 1]).toMatchObject({ time: 20, v: 4 });
  });
});

describe("cutPeakValues", () => {
  it("preserves genuine loss gaps instead of backfilling them (regression)", () => {
    const points = [
      { time: 1, t1: 50 },
      { time: 2, t1: 52 },
      { time: 3, t1: null }, // 丢包——必须保持为空缺
      { time: 4, t1: 51 },
      { time: 5, t1: 50 },
    ];

    const out = cutPeakValues(points, ["t1"]);

    expect(out[2].t1).toBeNull();
    // 周围的采样仍是真实数字 (EWMA 平滑后)，没有被置空。
    expect(typeof out[0].t1).toBe("number");
    expect(typeof out[4].t1).toBe("number");
  });

  it("does not invent values across a multi-point outage", () => {
    const points = [
      { time: 1, t1: 40 },
      { time: 2, t1: null },
      { time: 3, t1: null },
      { time: 4, t1: null },
      { time: 5, t1: 42 },
    ];

    const out = cutPeakValues(points, ["t1"]);

    expect(out[1].t1).toBeNull();
    expect(out[2].t1).toBeNull();
    expect(out[3].t1).toBeNull();
  });
});

describe("insertMetricGapSentinels — three-state ping semantics", () => {
  const opts = (intervals: Record<string, number>) => ({
    intervals: new Map(Object.entries(intervals)),
    matchToleranceRatio: 0.25,
  });
  const at = (points: TimedMetricPoint[], time: number) =>
    points.find((point) => point.time === time);

  it("keeps an off-phase anchor as undefined (spannable), not null", () => {
    // A 和 B 都每 60s 采样但错开 30s，所以各自建的 anchor 对方都没采过。这些 off-phase 格子
    // 必须保持 undefined，uPlot 才会跨过而非切断每条线——正是当初的空白图表 bug。
    const points: TimedMetricPoint[] = [
      { time: 0, A: 10 },
      { time: 30, B: 20 },
      { time: 60, A: 11 },
      { time: 90, B: 21 },
      { time: 120, A: 12 },
      { time: 150, B: 22 },
    ];

    const out = insertMetricGapSentinels(points, opts({ A: 60, B: 60 }));

    const p0 = at(out, 0)!;
    expect(p0.A).toBe(10);
    expect(p0.B).toBeUndefined();
    const p30 = at(out, 30)!;
    expect(p30.B).toBe(20);
    expect(p30.A).toBeUndefined();
  });

  it("preserves real loss (null) as a break", () => {
    const points: TimedMetricPoint[] = [
      { time: 0, A: 10 },
      { time: 60, A: null }, // value < 0（丢包）已被分桶器编码成 null；0 是亚毫秒成功，不入此列
      { time: 120, A: 12 },
    ];

    const out = insertMetricGapSentinels(points, opts({ A: 60 }));

    expect(at(out, 60)!.A).toBeNull();
  });

  it("breaks at a single missed sample", () => {
    const points: TimedMetricPoint[] = [
      { time: 0, A: 10 },
      { time: 120, A: 12 }, // 60 处漏了一个采样 → 空缺正好是 2 倍 interval
      { time: 180, A: 13 },
    ];

    const out = insertMetricGapSentinels(points, opts({ A: 60 }));

    expect(at(out, 60)!.A).toBeNull();
  });

  it("breaks across two consecutive missed samples", () => {
    const points: TimedMetricPoint[] = [
      { time: 0, A: 10 },
      { time: 180, A: 13 }, // 60、120 两处漏采 → 空缺 = 3 倍 interval
      { time: 240, A: 14 },
    ];

    const out = insertMetricGapSentinels(points, opts({ A: 60 }));

    expect(at(out, 60)!.A).toBeNull();
    expect(at(out, 180)!.A).toBe(13);
  });

  it("breaks across a long outage", () => {
    const points: TimedMetricPoint[] = [
      { time: 0, A: 10 },
      { time: 420, A: 14 }, // 中间漏采 6 次 → 空缺 = 7 倍 interval
      { time: 480, A: 15 },
    ];

    const out = insertMetricGapSentinels(points, opts({ A: 60 }));

    expect(out.some((point) => point.A === null)).toBe(true);
  });

  it.each([60, 300, 900, 3600])("keeps regular %i-second aggregate buckets connected", (interval) => {
    const points = [
      { time: 0, A: 10 },
      { time: interval, A: 11 },
      { time: interval * 2, A: 12 },
    ];

    expect(insertMetricGapSentinels(points, opts({ A: interval }))).toEqual(points);
  });

  it.each([60, 300, 900, 3600])("breaks at a missing %i-second aggregate bucket", (interval) => {
    const out = insertMetricGapSentinels([
      { time: 0, A: 10 },
      { time: interval * 2, A: 12 },
    ], opts({ A: interval }));

    expect(at(out, interval)!.A).toBeNull();
    expect(out[0].A).toBe(10);
    expect(out[out.length - 1].A).toBe(12);
  });

  it.each([1200, 1800])("breaks a %i-second gap in five-minute aggregate data", (gap) => {
    const out = insertMetricGapSentinels([
      { time: 0, A: 10 },
      { time: gap, A: 12 },
    ], opts({ A: 300 }));

    expect(at(out, 300)!.A).toBeNull();
  });

  it("allows timestamp jitter within one sampling interval's tolerance", () => {
    const points = [
      { time: 0, A: 10 },
      { time: 75, A: 11 },
      { time: 120, A: 12 },
    ];

    expect(insertMetricGapSentinels(points, opts({ A: 60 }))).toEqual(points);
  });

  it("breaks immediately beyond the timestamp tolerance", () => {
    const out = insertMetricGapSentinels([
      { time: 0, A: 10 },
      { time: 76, A: 12 },
    ], opts({ A: 60 }));

    expect(at(out, 60)!.A).toBeNull();
  });

  it("breaks only the task missing one sample without overwriting a nearby task", () => {
    const out = insertMetricGapSentinels([
      { time: 0, A: 10 },
      { time: 30, B: 20 },
      { time: 65, B: 21 },
      { time: 120, A: 12 },
      { time: 125, B: 22 },
    ], opts({ A: 60, B: 60 }));

    expect(at(out, 65)).toMatchObject({ A: null, B: 21 });
    expect(out.every((point) => point.B !== null)).toBe(true);
    expect(at(out, 120)!.A).toBe(12);
  });

  it("bounds sentinel growth and preserves the gap through reduction and smoothing", () => {
    const out = insertMetricGapSentinels([
      { time: 0, A: 10 },
      { time: 86400 * 90, A: 12 },
    ], opts({ A: 60 }));
    const reduced = downsampleAligned(out.map((point) => point.time), [out.map((point) => point.A)], 2, true);

    expect(out).toHaveLength(3);
    expect(smoothByCount(reduced.perTask, 13)[0]).toContain(null);
  });

  it("marks the entire missing interval across another task's off-phase anchors", () => {
    const points: TimedMetricPoint[] = [
      { time: 0, A: 10 },
      ...Array.from({ length: 20 }, (_, index) => ({ time: 30 + index * 60, B: 20 + index })),
      { time: 1200, A: 12 },
    ];

    const out = insertMetricGapSentinels(points, opts({ A: 60, B: 60 }));

    expect(out).toHaveLength(points.length);
    for (let index = 0; index < 20; index += 1) {
      expect(at(out, 30 + index * 60)).toMatchObject({ A: null, B: 20 + index });
    }
    expect(at(out, 0)!.A).toBe(10);
    expect(at(out, 1200)!.A).toBe(12);
    expect(out.every((point) => point.B !== null)).toBe(true);
  });

  it("shares breaks across new sentinel anchors with different task intervals", () => {
    const out = insertMetricGapSentinels([
      { time: 0, A: 10, B: 20 },
      { time: 300, A: 12, B: 22 },
    ], opts({ A: 60, B: 120 }));

    expect(at(out, 60)).toMatchObject({ A: null, B: null });
    expect(at(out, 120)).toMatchObject({ A: null, B: null });
    expect(at(out, 300)).toMatchObject({ A: 12, B: 22 });
  });

  it("keeps a longer outage broken across another task's newly inserted sentinels", () => {
    const out = insertMetricGapSentinels([
      { time: 0, A: 10, B: 20 },
      { time: 240, B: 21 },
      { time: 600, A: 12, B: 22 },
    ], opts({ A: 60, B: 120 }));

    expect(at(out, 120)).toMatchObject({ A: null, B: null });
    expect(at(out, 240)).toMatchObject({ A: null, B: 21 });
    expect(at(out, 360)).toMatchObject({ A: null, B: null });
    expect(at(out, 600)).toMatchObject({ A: 12, B: 22 });
  });

  it("breaks only the gapped task on a long outage, sparing co-located anchors", () => {
    // A 在 60..480 间缺采样，而 B 持续采样。A 的断点必须落到 B 的
    // anchor 上 (合并而非跳过)，且不能破坏 B 的真实值。
    const points: TimedMetricPoint[] = [
      { time: 0, A: 10, B: 100 },
      { time: 60, A: 11, B: 101 },
      { time: 120, B: 102 },
      { time: 180, B: 103 },
      { time: 240, B: 104 },
      { time: 300, B: 105 },
      { time: 360, B: 106 },
      { time: 420, B: 107 },
      { time: 480, A: 15, B: 108 },
    ];

    const out = insertMetricGapSentinels(points, opts({ A: 60, B: 60 }));

    const p120 = at(out, 120)!;
    expect(p120.A).toBeNull(); // A 断开，合并到 B 已有的 anchor 上
    expect(p120.B).toBe(102); // B 不受影响
  });

  it("merges sentinels when multiple tasks gap at the same time", () => {
    // A 和 B 都在 60..480 间中断（空缺 7×interval）且其间没有 anchor，所以各自在相同的期望
    // 时间播下哨兵——第二个必须合并而非覆盖。
    const points: TimedMetricPoint[] = [
      { time: 0, A: 10, B: 100 },
      { time: 60, A: 11, B: 101 },
      { time: 480, A: 15, B: 105 },
    ];

    const out = insertMetricGapSentinels(points, opts({ A: 60, B: 60 }));

    const p120 = at(out, 120)!;
    expect(p120).toBeDefined();
    expect(p120!.A).toBeNull();
    expect(p120!.B).toBeNull();
  });
});

describe("downsampleAligned", () => {
  it("keeps a real null break even when the same bucket also contains numeric samples", () => {
    const out = downsampleAligned(
      [0, 10, 20, 30],
      [[10, null, 14, 16]],
      2,
    );

    expect(out.times).toHaveLength(2);
    expect(out.perTask[0][0]).toBeNull();
    expect(out.perTask[0][1]).toBe(15);
  });

  it("keeps off-phase-only buckets undefined", () => {
    const out = downsampleAligned(
      [0, 10, 20, 30],
      [[undefined, undefined, 14, 16]],
      2,
    );

    expect(out.perTask[0][0]).toBeUndefined();
    expect(out.perTask[0][1]).toBe(15);
  });

  it("averages by default but pushes through a real spike when preservePeaks=true", () => {
    // 桶0 = {50, 500} 含尖峰；桶1 = {50, 52} 平坦。
    const mean = downsampleAligned([0, 10, 20, 30], [[50, 500, 50, 52]], 2);
    expect(mean.perTask[0][0]).toBe(275); // 默认均值把尖峰摊平

    const peak = downsampleAligned([0, 10, 20, 30], [[50, 500, 50, 52]], 2, true);
    expect(peak.perTask[0][0]).toBe(500); // 保峰：尖峰穿透
    expect(peak.perTask[0][1]).toBe(51); // 平坦桶仍取均值，基线干净
  });

  it("still prioritizes null breaks over peaks in preservePeaks mode", () => {
    const out = downsampleAligned([0, 10, 20, 30], [[50, null, 14, 16]], 2, true);
    expect(out.perTask[0][0]).toBeNull(); // 桶内有丢包 → 断点优先，不被尖峰逻辑覆盖
    expect(out.perTask[0][1]).toBe(15);
  });
});
