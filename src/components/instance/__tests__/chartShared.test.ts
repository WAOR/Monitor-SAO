import { describe, expect, it } from "vitest";
import {
  buildLoadTimeRangeOptions,
  buildPingTimeRangeOptions,
} from "@/components/instance/chartShared";

describe("detail chart time ranges for Monitor 1.3.2", () => {
  it("keeps Ping limited to 1h, 6h, 1d and 7d for high precision monitoring", () => {
    expect(buildPingTimeRangeOptions(90 * 24)).toEqual([
      { label: "1 小时", value: 1 },
      { label: "6 小时", value: 6 },
      { label: "1 天", value: 24 },
      { label: "7 天", value: 168 },
    ]);
  });

  it("generates 7-day range when history is 7 days or legacy hub fallback", () => {
    expect(buildLoadTimeRangeOptions(7 * 24)).toEqual([
      { label: "实时", value: 0 },
      { label: "1 小时", value: 1 },
      { label: "6 小时", value: 6 },
      { label: "1 天", value: 24 },
      { label: "7 天", value: 168 },
    ]);
  });

  it("generates 30-day range for Monitor 1.3.2 default 30-day retention", () => {
    expect(buildLoadTimeRangeOptions(30 * 24)).toEqual([
      { label: "实时", value: 0 },
      { label: "1 小时", value: 1 },
      { label: "6 小时", value: 6 },
      { label: "1 天", value: 24 },
      { label: "7 天", value: 168 },
      { label: "30 天", value: 720 },
    ]);
  });

  it("dynamically extends load history to 90 days when hub retains 90 days", () => {
    expect(buildLoadTimeRangeOptions(90 * 24)).toEqual([
      { label: "实时", value: 0 },
      { label: "1 小时", value: 1 },
      { label: "6 小时", value: 6 },
      { label: "1 天", value: 24 },
      { label: "7 天", value: 168 },
      { label: "30 天", value: 720 },
      { label: "90 天", value: 2160 },
    ]);
  });

  it("dynamically extends load history to 365 days when hub retains 365 days", () => {
    expect(buildLoadTimeRangeOptions(365 * 24)).toEqual([
      { label: "实时", value: 0 },
      { label: "1 小时", value: 1 },
      { label: "6 小时", value: 6 },
      { label: "1 天", value: 24 },
      { label: "7 天", value: 168 },
      { label: "30 天", value: 720 },
      { label: "90 天", value: 2160 },
      { label: "365 天", value: 8760 },
    ]);
  });
});
