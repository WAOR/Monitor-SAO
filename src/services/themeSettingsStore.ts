import type { ThemeSettings } from "@/types/komari";

const STORAGE_KEY = "monitor-sao:theme-settings";

type Listener = () => void;

const listeners = new Set<Listener>();
let cache: Record<string, unknown> | null = null;

function readStorage(): Record<string, unknown> {
  if (cache) return cache;
  if (typeof window === "undefined" || !window.localStorage) {
    cache = {};
    return cache;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      cache = {};
      return cache;
    }
    const parsed: unknown = JSON.parse(raw);
    cache =
      parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
  } catch {
    cache = {};
  }
  return cache;
}

/** 读取本地主题设置覆盖项 */
export function getLocalThemeSettings(): Record<string, unknown> {
  return readStorage();
}

/** 保存主题设置覆盖项到本地 */
export function saveLocalThemeSettings(
  settings: (ThemeSettings & Record<string, unknown>) | Record<string, unknown>,
): void {
  cache = { ...readStorage(), ...settings };
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.warn("[Monitor-SAO] 主题设置写入本地失败", error);
    }
  }
  emit();
}

/** 重置本地主题设置 */
export function resetLocalThemeSettings(): void {
  cache = {};
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }
  emit();
}

export function subscribeLocalThemeSettings(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emit() {
  for (const listener of listeners) listener();
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY) return;
    cache = null;
    emit();
  });
}
