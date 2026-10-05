import { describe, it, expect, afterEach } from "vitest";

describe("installDevMockApi with nodes count query parameter", () => {
  const originalFetch = globalThis.fetch;
  const originalWindow = (globalThis as unknown as { window?: unknown }).window;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalWindow !== undefined) {
      (globalThis as unknown as { window?: unknown }).window = originalWindow;
    } else {
      delete (globalThis as unknown as { window?: unknown }).window;
    }
  });

  it("expands nodes to 100 when ?mock=1&nodes=100 is provided", async () => {
    const fakeLocation = new URL("http://localhost:5173/?mock=1&nodes=100");
    const fakeWindow = {
      location: fakeLocation,
      fetch: originalFetch,
    };
    (globalThis as unknown as { window: unknown }).window = fakeWindow;

    const { installDevMockApi } = await import("../mockApi");
    installDevMockApi();

    // 1. 测试 /api/nodes
    const resNodes = await (fakeWindow.fetch as typeof fetch)("http://localhost:5173/api/nodes");
    const nodes = await resNodes.json();
    expect(Array.isArray(nodes)).toBe(true);
    expect(nodes.length).toBe(100);
    expect(nodes[0].uuid).toBe("tokyo-edge-01");
    expect(nodes[99].uuid).toContain("-sub-");

    // 2. 测试 /api/rpc2 common:getNodesLatestStatus
    const resStatus = await (fakeWindow.fetch as typeof fetch)("http://localhost:5173/api/rpc2", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "common:getNodesLatestStatus",
      }),
    });
    const statusData = await resStatus.json();
    expect(statusData.result).toBeDefined();
    const statusKeys = Object.keys(statusData.result);
    expect(statusKeys.length).toBe(100);

    // 验证状态对象结构正确且无 NaN 或 undefined
    const sampleStatus = statusData.result[nodes[0].uuid];
    expect(sampleStatus).toBeDefined();
    expect(typeof sampleStatus.online).toBe("boolean");

    // 3. 测试 /api/me 正确返回 MonitorMe 规范（authed: true, public_page: true）
    const resMe = await (fakeWindow.fetch as typeof fetch)("http://localhost:5173/api/me");
    const meData = await resMe.json();
    expect(meData.authed).toBe(true);
    expect(meData.public_page).toBe(true);
    expect(meData.logged_in).toBe(true);

    // 4. 测试 PUT /api/themes/sao/config 保存与 GET 读取闭环
    await (fakeWindow.fetch as typeof fetch)("http://localhost:5173/api/themes/sao/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clusterOverviewMode: "nodes" }),
    });
    const resConfig = await (fakeWindow.fetch as typeof fetch)("http://localhost:5173/api/themes/sao/config");
    const configData = await resConfig.json();
    expect(configData.clusterOverviewMode).toBe("nodes");
  });
});

