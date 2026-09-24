import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearServerThemeSettingsCache,
  extractUsernameFromStorage,
  fetchServerThemeConfig,
  getLoadRecords,
  getMe,
  getNodes,
  getPingRecords,
  getPublic,
  resolveAuthUsername,
  saveAdminUsername,
  saveThemeSettings,
  THEME_SHORT,
} from "@/services/api";
import { getLocalThemeSettings, saveLocalThemeSettings } from "@/services/themeSettingsStore";

const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (k: string) => storageMap.get(k) ?? null,
  setItem: (k: string, v: string) => storageMap.set(k, String(v)),
  removeItem: (k: string) => storageMap.delete(k),
  clear: () => storageMap.clear(),
};
Object.defineProperty(global, "window", {
  value: { localStorage: localStorageMock },
  writable: true,
});
Object.defineProperty(global, "localStorage", {
  value: localStorageMock,
  writable: true,
});

describe("Monitor API Service", () => {
  beforeEach(() => {
    localStorageMock.clear();
    clearServerThemeSettingsCache();
    vi.restoreAllMocks();
  });

  describe("Admin Nickname Storage", () => {
    it("returns empty when no custom nickname set", () => {
      expect(extractUsernameFromStorage()).toBe("");
      expect(resolveAuthUsername(true)).toBe("Admin");
      expect(resolveAuthUsername(false)).toBe("");
    });

    it("saves and resolves custom admin nickname", () => {
      saveAdminUsername("jerry");
      expect(extractUsernameFromStorage()).toBe("jerry");
      expect(resolveAuthUsername(true)).toBe("jerry");
    });

    it("clears nickname when empty string provided", () => {
      saveAdminUsername("jerry");
      saveAdminUsername("");
      expect(extractUsernameFromStorage()).toBe("");
      expect(resolveAuthUsername(true)).toBe("Admin");
    });
  });

  describe("getMe and getPublic", () => {
    it("fetches /api/me and correctly maps auth and site name", async () => {
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes(`/api/themes/${THEME_SHORT}/config`)) {
          return {
            ok: true,
            status: 200,
            headers: new Headers({ "content-type": "application/json" }),
            json: async () => ({ defaultAppearance: "dark", adminNickname: "Kirito" }),
          };
        }
        return {
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => ({
            authed: true,
            github: false,
            site_name: "SAO Monitor",
            public_page: true,
          }),
        };
      });

      saveAdminUsername("Kirito");
      const me = await getMe();
      expect(me.logged_in).toBe(true);
      expect(me.username).toBe("Kirito");

      const pub = await getPublic();
      expect(pub.sitename).toBe("SAO Monitor");
      expect(pub.private_site).toBe(false);
      expect(pub.theme_settings.defaultAppearance).toBe("dark");

      const serverConfig = await fetchServerThemeConfig();
      expect(serverConfig.adminNickname).toBe("Kirito");
    });

    it("persists theme settings via PUT /api/themes/sao/config", async () => {
      let putBody: string | null = null;
      global.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
        if (url.includes(`/api/themes/${THEME_SHORT}/config`)) {
          if (init?.method === "PUT") {
            putBody = String(init.body);
            return {
              ok: true,
              status: 200,
              text: async () => "OK",
            };
          }
          return {
            ok: true,
            status: 200,
            headers: new Headers({ "content-type": "application/json" }),
            text: async () => JSON.stringify({ notice: "Old Notice" }),
          };
        }
        return { ok: false, status: 404 };
      });

      await saveThemeSettings({ notice: "New Notice", surfaceOpacity: 0.9 });
      expect(putBody).not.toBeNull();
      const parsed = JSON.parse(putBody!);
      expect(parsed.notice).toBe("New Notice");
      expect(parsed.surfaceOpacity).toBe(0.9);
    });

    it("clears stale local notice when notice is cleared or omitted on server", async () => {
      saveLocalThemeSettings({ notice: "Old Stale Notice", defaultAppearance: "dark" });
      expect(getLocalThemeSettings().notice).toBe("Old Stale Notice");

      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url === "/api/me") {
          return {
            ok: true,
            status: 200,
            headers: new Headers({ "content-type": "application/json" }),
            json: async () => ({ site_name: "SAO Monitor", public_page: true }),
          };
        }
        if (url.includes(`/api/themes/${THEME_SHORT}/config`)) {
          return {
            ok: true,
            status: 200,
            headers: new Headers({ "content-type": "application/json" }),
            // Notice is omitted or empty on server
            json: async () => ({ defaultAppearance: "dark" }),
          };
        }
        return { ok: false, status: 404 };
      });

      const pub = await getPublic();
      // Server is authoritative: notice must be empty string
      expect(pub.theme_settings.notice).toBe("");
      // Local storage must also be pruned to prevent zombie notice
      expect(getLocalThemeSettings().notice).toBeUndefined();
    });
  });

  describe("getNodes", () => {
    it("fetches and transforms nodes", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          nodes: [
            {
              id: 1,
              name: "Node 1",
              country: "US",
              online: true,
              metrics: {
                uptime: 12345,
                cpu: 15.5,
                load: [0.1, 0.2, 0.3],
                mem_total: 1000,
                mem_used: 500,
                swap_total: 0,
                swap_used: 0,
                disk_total: 2000,
                disk_used: 1000,
                net_rx: 100,
                net_tx: 200,
                total_rx: 300,
                total_tx: 400,
                tcp: 10,
                udp: 5,
                procs: 120,
              },
            },
          ],
        }),
      });

      const nodes = await getNodes();
      expect(nodes.length).toBe(1);
      expect(nodes[0].uuid).toBe("1");
      expect(nodes[0].name).toBe("Node 1");
      expect(nodes[0].region).toBe("US");
    });
  });

  describe("getLoadRecords & getPingRecords", () => {
    it("fetches load metrics history", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          metrics: [
            {
              ts: 1700000000,
              cpu: 25.5,
              mem_used: 512,
              disk_used: 1024,
              net_rx: 50,
              net_tx: 60,
            },
          ],
        }),
      });

      const res = await getLoadRecords("1", 24);
      expect(res.count).toBe(1);
      expect(res.records[0].cpu).toBe(25.5);
      expect(res.records[0].time).toBe(1700000000 * 1000);
    });

    it("fetches ping metrics history and probes", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          ping: [
            {
              task_id: 101,
              ts: 1700000000,
              latency: 45,
              loss: 0,
            },
          ],
          probes: {
            "101": "Tokyo Probe",
          },
          loss: {
            "101": 0.5,
          },
        }),
      });

      const res = await getPingRecords("1", 24);
      expect(res.count).toBe(1);
      expect(res.records[0].value).toBe(45);
      expect(res.tasks.length).toBe(1);
      expect(res.tasks[0].id).toBe(101);
      expect(res.tasks[0].name).toBe("Tokyo Probe");
    });
  });

  describe("getAdminPingTasks", () => {
    it("fetches ping tasks from Monitor /api/ping-tasks", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          tasks: [
            { id: 1, name: "电信 5G", target: "1.1.1.1:443", interval: 60, nodes: [1, 2] },
            { id: 2, name: "联通 4G", target: "8.8.8.8:443", interval: 30, nodes: [2] },
          ],
        }),
      });

      const { getAdminPingTasks } = await import("@/services/api");
      const tasks = await getAdminPingTasks();
      expect(tasks.length).toBe(2);
      expect(tasks[0].id).toBe(1);
      expect(tasks[0].name).toBe("电信 5G");
      expect(tasks[0].clients).toEqual(["1", "2"]);
      expect(tasks[1].id).toBe(2);
      expect(tasks[1].name).toBe("联通 4G");
    });

    it("falls back to extracting probes when /api/ping-tasks fails", async () => {
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes("/api/ping-tasks")) {
          return { ok: false, status: 403, statusText: "Forbidden", text: async () => "" };
        }
        if (url.includes("/api/nodes/1/metrics")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              ping: [],
              probes: { "1": "上海移动", "2": "广州电信" },
            }),
          };
        }
        if (url.includes("/api/nodes")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              nodes: [{ id: 1, name: "Node 1", online: true, metrics: null }],
            }),
          };
        }
        return { ok: false, status: 404 };
      });

      const { getAdminPingTasks } = await import("@/services/api");
      const tasks = await getAdminPingTasks();
      expect(tasks.length).toBe(2);
      expect(tasks[0].id).toBe(1);
      expect(tasks[0].name).toBe("上海移动");
      expect(tasks[1].id).toBe(2);
      expect(tasks[1].name).toBe("广州电信");
    });
  });

  describe("getTodayTrafficMetrics", () => {
    it("calculates traffic using trapezoidal integration from metrics history", async () => {
      const nowMs = 1700003600 * 1000;
      const startMs = 1700000000 * 1000;
      const endMs = nowMs;

      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes("/api/nodes/1/metrics")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              metrics: [
                { ts: 1700000000, cpu: 10, mem_used: 100, disk_used: 100, net_rx: 1000, net_tx: 2000 },
                { ts: 1700000060, cpu: 12, mem_used: 100, disk_used: 100, net_rx: 3000, net_tx: 4000 },
              ],
            }),
          };
        }
        return { ok: false, status: 404 };
      });

      const { getTodayTrafficMetrics } = await import("@/services/api");
      const res = await getTodayTrafficMetrics(["1"], startMs, endMs);

      expect(res.series.length).toBe(4);
      const upSeries = res.series.find((s) => s.metricKey === "traffic.up");
      const downSeries = res.series.find((s) => s.metricKey === "traffic.down");
      const rateUpSeries = res.series.find((s) => s.metricKey === "net.out.rate");

      expect(upSeries).toBeDefined();
      expect(downSeries).toBeDefined();
      expect(rateUpSeries).toBeDefined();

      // points 数目验证
      expect(upSeries!.points.length).toBe(2);
      // 第一个点 60s 估算 2000 * 60 = 120000
      // 第二个点 dt=60s 4000 * 60 = 240000
      const totalUp = upSeries!.points.reduce((sum, p) => sum + (p.value ?? 0), 0);
      expect(totalUp).toBeGreaterThan(0);

      // 速率峰值点验证
      expect(rateUpSeries!.points.map((p) => p.value)).toEqual([2000, 4000]);
    });
  });
});

