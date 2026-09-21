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
    const merged = {
      ...(config?.theme_settings || {}),
      ...localSettings,
    };
    return {
      ...normalizeThemeSettings(merged),
      isReady,
      isLoading: isLoading && !hasConfig,
      isError,
    };
  }, [config?.theme_settings, localSettings, hasConfig, isError, isLoading, isReady]);
}
