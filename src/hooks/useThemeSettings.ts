import { useEffect, useMemo, useSyncExternalStore } from "react";
import { usePublicConfig } from "@/hooks/usePublicConfig";
import {
  getLocalThemeSettings,
  subscribeLocalThemeSettings,
} from "@/services/themeSettingsStore";
import {
  normalizeThemeSettings,
  readStoredPalette,
  persistPalette,
  readStoredDarkBrandColor,
  persistDarkBrandColor,
  isMatrixColorTheme,
  type ResolvedThemeSettings,
} from "@/utils/themeSettings";
import {
  readStoredSiteBrandIcon,
  persistSiteBrandIcon,
  isSiteBrandIconId,
} from "@/components/brand-icons";

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
  const rawThemePalette = config?.theme_settings?.matrixColorTheme;

  useEffect(() => {
    if (rawThemePalette && isMatrixColorTheme(rawThemePalette)) {
      persistPalette(rawThemePalette);
      if (typeof document !== "undefined") {
        document.documentElement.dataset.palette = rawThemePalette;
      }
    }
  }, [rawThemePalette]);

  const rawDarkBrandColor = config?.theme_settings?.enableDarkBrandColor;
  useEffect(() => {
    if (typeof rawDarkBrandColor === "boolean") {
      persistDarkBrandColor(rawDarkBrandColor);
    }
  }, [rawDarkBrandColor]);

  const rawBrandIcon = config?.theme_settings?.siteBrandIcon;
  useEffect(() => {
    if (isSiteBrandIconId(rawBrandIcon)) {
      persistSiteBrandIcon(rawBrandIcon);
    }
  }, [rawBrandIcon]);

  return useMemo(() => {
    const serverSettings = config?.theme_settings;

    // 权威源优先：服务端官方持久化配置具有绝对最高权威，覆盖本地旧快照；
    // 本地存储仅作为极端离线或服务端未配置时的垫底兜底。
    const merged = hasConfig && serverSettings ? serverSettings : localSettings;
    const base = normalizeThemeSettings(merged);
    if (!("matrixColorTheme" in merged && merged.matrixColorTheme) && typeof window !== "undefined") {
      const cachedPalette = readStoredPalette();
      if (cachedPalette) {
        base.matrixColorTheme = cachedPalette;
      }
    }
    if (!("enableDarkBrandColor" in merged && typeof merged.enableDarkBrandColor === "boolean") && typeof window !== "undefined") {
      const cachedDarkBrandColor = readStoredDarkBrandColor();
      if (cachedDarkBrandColor !== null) {
        base.enableDarkBrandColor = cachedDarkBrandColor;
      }
    }
    if (!("siteBrandIcon" in merged && merged.siteBrandIcon) && typeof window !== "undefined") {
      const cachedBrandIcon = readStoredSiteBrandIcon();
      if (cachedBrandIcon) {
        base.siteBrandIcon = cachedBrandIcon;
      }
    }
    let overrideClusterMode: "classic" | "nodes" | undefined;
    let overrideClusterFlip: boolean | undefined;
    let overrideColorTheme: "default" | "eva" | "divergence" | "aurora" | undefined;
    let overrideMicroVisual: "dynamic" | "static" | undefined;
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const clusterParam = searchParams.get("cluster");
      const matrixParam = searchParams.get("matrix");
      if (clusterParam === "nodes" || matrixParam === "1") {
        overrideClusterMode = "nodes";
      } else if (clusterParam === "classic") {
        overrideClusterMode = "classic";
      }

      const flipParam = searchParams.get("flip");
      if (flipParam === "0" || flipParam === "false") {
        overrideClusterFlip = false;
      } else if (flipParam === "1" || flipParam === "true") {
        overrideClusterFlip = true;
      }
      const paletteParam = searchParams.get("palette");
      if (paletteParam === "eva") {
        overrideColorTheme = "eva";
      } else if (paletteParam === "default") {
        overrideColorTheme = "default";
      } else if (paletteParam === "divergence") {
        overrideColorTheme = "divergence";
      } else if (paletteParam === "aurora") {
        overrideColorTheme = "aurora";
      }
      const microVisualParam = searchParams.get("microVisual");
      if (microVisualParam === "dynamic" || microVisualParam === "static") {
        overrideMicroVisual = microVisualParam;
      }
    }
    return {
      ...base,
      ...(overrideClusterMode ? { clusterOverviewMode: overrideClusterMode } : {}),
      ...(overrideClusterFlip !== undefined ? { enableClusterFlip: overrideClusterFlip } : {}),
      ...(overrideColorTheme ? { matrixColorTheme: overrideColorTheme } : {}),
      ...(overrideMicroVisual ? { overviewMicroVisualMode: overrideMicroVisual } : {}),
      isReady,
      isLoading: isLoading && !hasConfig,
      isError,
    };
  }, [config?.theme_settings, localSettings, hasConfig, isError, isLoading, isReady]);
}
