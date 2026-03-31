"use client";

import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

type OpenInIPhoneAppButtonProps = {
  className?: string;
  label?: string;
  slug: string;
};

export function isAppleMobileDevice(
  userAgent: string,
  platform = "",
  maxTouchPoints = 0,
) {
  if (/(iPhone|iPad|iPod)/i.test(userAgent)) {
    return true;
  }

  return /Mac/i.test(platform) && maxTouchPoints > 1;
}

export function OpenInIPhoneAppButton({
  className,
  label = "Open in iPhone app",
  slug,
}: OpenInIPhoneAppButtonProps) {
  const shouldRender = useSyncExternalStore(
    () => () => {},
    () =>
      isAppleMobileDevice(
        navigator.userAgent,
        navigator.platform,
        navigator.maxTouchPoints,
      ),
    () => false,
  );

  if (!shouldRender) {
    return null;
  }

  return (
    <a
      href={`devilsaidictionary://dictionary/${slug}`}
      className={cn("button button-secondary", className)}
    >
      {label}
    </a>
  );
}
