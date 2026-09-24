import { describe, expect, it } from "vitest";
import { NodeInfoSchema, PingRecordSchema } from "@/types/komari";
import { safeMonitorNodes, convertMonitorNodeToInfo } from "@/types/monitor";

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
});

