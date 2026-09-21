import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  extractUsernameFromStorage,
  getLoadRecords,
  getMe,
  getNodes,
  getPingRecords,
  getPublic,
  resolveAuthUsername,
  saveAdminUsername,
} from "@/services/api";

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
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          authed: true,
          github: false,
          site_name: "SAO Monitor",
          public_page: true,
        }),
      });

      saveAdminUsername("Kirito");
      const me = await getMe();
      expect(me.logged_in).toBe(true);
      expect(me.username).toBe("Kirito");

      const pub = await getPublic();
      expect(pub.sitename).toBe("SAO Monitor");
      expect(pub.private_site).toBe(false);
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
});
