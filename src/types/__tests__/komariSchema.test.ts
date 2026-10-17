import { describe, expect, it } from "vitest";
import { NodeInfoSchema, PingRecordSchema } from "@/types/komari";
import {
  safeMonitorNodes,
  convertMonitorNodeToInfo,
  convertMonitorNodeToMetrics,
  type MonitorNode,
} from "@/types/monitor";

describe("Komari schemas", () => {
  it("exposes transformed node fields through the schema output", () => {
    const node = NodeInfoSchema.parse({ uuid: "node-a", group: null, region: null });
    expect(node.group).toBe("");
    expect(node.region).toBe("");
  });

  it("keeps aggregate Ping fields explicit", () => {
    const record = PingRecordSchema.parse({
      task_id: 7,
      time: "2026-07-15T04:00:00Z",
      value: 35,
      count: 3,
      loss: null,
    });
    expect(record).toMatchObject({ count: 3, loss: null });
  });

  it("safely extracts group from MonitorNode and converts to NodeInfo", () => {
    const rawList = [
      { id: 1, name: "Node A", group: "生产集群", sort: 1 },
      { id: 2, name: "Node B", group_name: "边缘节点", sort: 2 },
      { id: 3, name: "Node C", sort: 3 },
    ];
    const safeNodes = safeMonitorNodes(rawList);
    expect(safeNodes[0].group).toBe("生产集群");
    expect(safeNodes[1].group).toBe("边缘节点");
    expect(safeNodes[2].group).toBe("");

    const infoA = convertMonitorNodeToInfo(safeNodes[0]);
    const infoB = convertMonitorNodeToInfo(safeNodes[1]);
    const infoC = convertMonitorNodeToInfo(safeNodes[2]);

    expect(infoA.group).toBe("生产集群");
    expect(infoB.group).toBe("边缘节点");
    expect(infoC.group).toBe("");
  });

  it("prioritizes month_tx and month_rx for trafficUp/trafficDown and preserves lifetime totals", () => {
    const nodeWithMonth: MonitorNode = {
      id: 1,
      name: "Node 1",
      sort: 1,
      public: true,
      online: true,
      country: "US",
      last_seen: 1700000000,
      os: "linux",
      total_tx: 5000000000, // 5GB 终生累计
      total_rx: 2000000000, // 2GB 终生累计
      month_tx: 50000000,   // 50MB 本周期流量
      month_rx: 20000000,   // 20MB 本周期流量
      metrics: {
        uptime: 1000,
        cpu: 10,
        load: [0.1, 0.2, 0.3],
        mem_total: 1024,
        mem_used: 512,
        swap_total: 0,
        swap_used: 0,
        disk_total: 2048,
        disk_used: 1024,
        net_rx: 100,
        net_tx: 200,
        total_rx: 5000000000,
        total_tx: 2000000000,
        month_rx: 20000000,
        month_tx: 50000000,
        tcp: 10,
        udp: 5,
        procs: 50,
      },
    };

    const metrics = convertMonitorNodeToMetrics(nodeWithMonth);
    // 应该取周期月流量用于展示和配额计算
    expect(metrics.trafficUp).toBe(50000000);
    expect(metrics.trafficDown).toBe(20000000);
    // 同时保留历史累计总量
    expect(metrics.totalUp).toBe(2000000000);
    expect(metrics.totalDown).toBe(5000000000);
  });

  it("falls back to total_tx and total_rx when month fields are missing", () => {
    const nodeWithoutMonth: MonitorNode = {
      id: 2,
      name: "Node Legacy",
      sort: 1,
      public: true,
      online: true,
      country: "HK",
      last_seen: 1700000000,
      os: "linux",
      total_tx: 8888,
      total_rx: 6666,
      metrics: null,
    };

    const metrics = convertMonitorNodeToMetrics(nodeWithoutMonth);
    expect(metrics.trafficUp).toBe(8888);
    expect(metrics.trafficDown).toBe(6666);
    expect(metrics.totalUp).toBe(8888);
    expect(metrics.totalDown).toBe(6666);
  });

  describe("resolveNodeIpStack & convertMonitorNodeToInfo IPv4/IPv6 handling", () => {
    it("correctly identifies pure IPv6 when node.ip is an IPv6 address", () => {
      const pureV6Node = safeMonitorNodes([
        { id: 10, name: "V6 Only", ip: "2408:8207:7880::1", sort: 1 },
      ])[0];
      const info = convertMonitorNodeToInfo(pureV6Node);
      expect(info.ipv6).toBe("2408:8207:7880::1");
      expect(info.ipv4).toBe("");
    });

    it("correctly identifies dual stack when explicit ipv4 and ipv6 are present", () => {
      const dualStackNode = safeMonitorNodes([
        {
          id: 11,
          name: "Dual Stack",
          ip: "1.2.3.4",
          ipv4: "1.2.3.4",
          ipv6: "2001:db8::1",
          sort: 1,
        },
      ])[0];
      const info = convertMonitorNodeToInfo(dualStackNode);
      expect(info.ipv4).toBe("1.2.3.4");
      expect(info.ipv6).toBe("2001:db8::1");
    });

    it("extracts dual stack addresses from addresses array in full view", () => {
      const addressesNode = safeMonitorNodes([
        {
          id: 12,
          name: "Full View Node",
          addresses: [
            { address: "198.51.100.5", source: "interface" },
            { address: "2001:db8:ffff::2", source: "interface" },
          ],
          sort: 1,
        },
      ])[0];
      const info = convertMonitorNodeToInfo(addressesNode);
      expect(info.ipv4).toBe("198.51.100.5");
      expect(info.ipv6).toBe("2001:db8:ffff::2");
    });

    it("correctly identifies dual stack with ip and ip_other exits", () => {
      const exitNode = safeMonitorNodes([
        {
          id: 13,
          name: "Exit Node",
          ip: "203.0.113.1",
          ip_other: "2408:8000::2",
          sort: 1,
        },
      ])[0];
      const info = convertMonitorNodeToInfo(exitNode);
      expect(info.ipv4).toBe("203.0.113.1");
      expect(info.ipv6).toBe("2408:8000::2");
    });

    it("correctly identifies pure IPv4 node", () => {
      const pureV4Node = safeMonitorNodes([
        { id: 14, name: "V4 Only", ip: "192.0.2.1", sort: 1 },
      ])[0];
      const info = convertMonitorNodeToInfo(pureV4Node);
      expect(info.ipv4).toBe("192.0.2.1");
      expect(info.ipv6).toBe("");
    });
  });
});

