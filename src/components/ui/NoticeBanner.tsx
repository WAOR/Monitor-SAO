import { useState, useCallback } from "react";
import { Megaphone, X } from "lucide-react";

interface NoticeBannerProps {
  notice?: string;
}

const DISMISSED_NOTICE_KEY = "sao_dismissed_notice_hash";

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return String(hash);
}

export function NoticeBanner({ notice }: NoticeBannerProps) {
  const content = (notice ?? "").trim();
  const contentHash = content ? simpleHash(content) : "";

  const [dismissedHash, setDismissedHash] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(DISMISSED_NOTICE_KEY);
    } catch {
      return null;
    }
  });

  const handleDismiss = useCallback(() => {
    if (!contentHash) return;
    setDismissedHash(contentHash);
    try {
      sessionStorage.setItem(DISMISSED_NOTICE_KEY, contentHash);
    } catch {}
  }, [contentHash]);

  const isDismissed = Boolean(contentHash && dismissedHash === contentHash);

  if (!content || isDismissed) {
    return null;
  }

  return (
    <aside
      className="sao-notice-banner mb-3.5 flex items-start gap-3 rounded-xl border border-(--border-subtle) bg-(--card-bg) px-4 py-3 shadow-xs backdrop-blur-md transition-all animate-in fade-in slide-in-from-top-2 duration-300"
      role="region"
      aria-label="站点公告"
    >
      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-(--primary)/10 text-(--primary)">
        <Megaphone size={14} className="animate-pulse" />
      </div>
      <div className="flex-1 text-[13px] leading-relaxed text-(--text-primary) whitespace-pre-wrap wrap-break-word">
        {content}
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        title="关闭公告"
        aria-label="关闭公告"
        className="mt-0.5 -mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-(--text-tertiary) hover:bg-(--glass-stroke) hover:text-(--text-secondary) transition-colors cursor-pointer"
      >
        <X size={14} />
      </button>
    </aside>
  );
}
