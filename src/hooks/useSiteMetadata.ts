import { useEffect } from "react";
import { usePublicConfig } from "@/hooks/usePublicConfig";

export const SITENAME_STORAGE_KEY = "sao:sitename";
export const DESCRIPTION_STORAGE_KEY = "sao:description";
export const FALLBACK_TITLE = "SAO Monitor Theme";
export const FALLBACK_DESCRIPTION = "SAO Monitor Theme · 极简立体仪表盘主题";

export function updateMeta(selector: string, attr: "content", value: string) {
  if (typeof document === "undefined") return;
  const element = document.querySelector<HTMLMetaElement>(selector);
  if (element) {
    element[attr] = value;
  }
}

export function readStoredSiteMetadata() {
  if (typeof localStorage === "undefined") {
    return { siteName: null, description: null };
  }
  try {
    const siteName = localStorage.getItem(SITENAME_STORAGE_KEY);
    const description = localStorage.getItem(DESCRIPTION_STORAGE_KEY);
    return {
      siteName: siteName?.trim() || null,
      description: description?.trim() || null,
    };
  } catch {
    return { siteName: null, description: null };
  }
}

export function persistSiteMetadata(siteName: string, description: string) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(SITENAME_STORAGE_KEY, siteName);
    localStorage.setItem(DESCRIPTION_STORAGE_KEY, description);
  } catch {}
}

export function applySiteMetadata(siteName: string, description: string) {
  if (typeof document === "undefined") return;
  document.title = siteName;
  updateMeta('meta[name="apple-mobile-web-app-title"]', "content", siteName);
  updateMeta('meta[property="og:title"]', "content", siteName);
  updateMeta('meta[name="twitter:title"]', "content", siteName);
  updateMeta('meta[name="description"]', "content", description);
  updateMeta('meta[property="og:description"]', "content", description);
  updateMeta('meta[name="twitter:description"]', "content", description);
}

export function resolveSiteMetadata(
  configSiteName?: string | null,
  configDescription?: string | null,
  cachedSiteName?: string | null,
  cachedDescription?: string | null,
) {
  const siteName =
    configSiteName?.trim() || cachedSiteName?.trim() || FALLBACK_TITLE;
  const description =
    configDescription?.trim() ||
    cachedDescription?.trim() ||
    FALLBACK_DESCRIPTION;
  return { siteName, description };
}

export function useSiteMetadata() {
  const { data: config } = usePublicConfig();

  useEffect(() => {
    const cached = readStoredSiteMetadata();
    const { siteName, description } = resolveSiteMetadata(
      config?.sitename,
      config?.description,
      cached.siteName,
      cached.description,
    );

    applySiteMetadata(siteName, description);

    if (config?.sitename != null && config.sitename.trim() !== "") {
      persistSiteMetadata(siteName, description);
    }
  }, [config?.sitename, config?.description]);
}
