import { useMemo, useSyncExternalStore } from "react";
import { usePublicConfig } from "@/hooks/usePublicConfig";
import {
  getLocalThemeSettings,
  subscribeLocalThemeSettings,
} from "@/services/themeSettingsStore";
import { normalizeThemeSettings, type ResolvedThemeSettings } from "@/utils/themeSettings";

type ThemeSettingsState = ResolvedThemeSettings & {
  isReady: boolean;
  isLoading: boolean;
  isError: boolean;
};

export function useThemeSettings(): ThemeSettingsState {
  const { data: config, isError, isLoading } = usePublicConfig();
  const localSettings = useSyncExternalStore(
    subscribeLocalThemeSettings,
    getLocalThemeSettings,
    () => ({}),
  );

  const hasConfig = config != null;
  const isReady = hasConfig || isError;

  return useMemo(() => {
    const serverSettings = config?.theme_settings;

    // 权威源优先：服务端官方持久化配置具有绝对最高权威，覆盖本地旧快照；
    // 本地存储仅作为极端离线或服务端未配置时的垫底兜底。
    const merged = hasConfig && serverSettings ? serverSettings : localSettings;
    return {
      ...normalizeThemeSettings(merged),
      isReady,
      isLoading: isLoading && !hasConfig,
      isError,
    };
  }, [config?.theme_settings, localSettings, hasConfig, isError, isLoading, isReady]);
}
