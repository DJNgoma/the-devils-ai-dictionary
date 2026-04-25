"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type EntryShareButtonProps = {
  className?: string;
  definition: string;
  href: string;
  slug: string;
  title: string;
};

type ShareDataWithFiles = ShareData & {
  files?: File[];
};

export function entryShareImagePath(slug: string) {
  return `/dictionary/${encodeURIComponent(slug)}/opengraph-image`;
}

export function buildEntryShareCaption({
  definition,
  title,
  url,
}: {
  definition: string;
  title: string;
  url: string;
}) {
  const lines = [title.trim(), definition.trim(), url.trim()].filter(Boolean);
  return lines.join("\n\n");
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

async function fetchShareImage(slug: string) {
  const response = await fetch(entryShareImagePath(slug));

  if (!response.ok) {
    return null;
  }

  const blob = await response.blob();
  return new File([blob], `devils-ai-dictionary-${slug}.png`, {
    type: blob.type || "image/png",
  });
}

function canShare(data: ShareDataWithFiles) {
  if (typeof navigator.canShare !== "function") {
    return !data.files?.length;
  }

  return navigator.canShare(data);
}

async function copyCaption(caption: string) {
  if (typeof navigator.clipboard?.writeText !== "function") {
    return false;
  }

  await navigator.clipboard.writeText(caption);
  return true;
}

export function EntryShareButton({
  className,
  definition,
  href,
  slug,
  title,
}: EntryShareButtonProps) {
  const [status, setStatus] = useState<"idle" | "preparing" | "copied">("idle");

  async function markCopied(caption: string) {
    const didCopy = await copyCaption(caption);

    if (!didCopy) {
      setStatus("idle");
      return;
    }

    setStatus("copied");
    window.setTimeout(() => setStatus("idle"), 1800);
  }

  async function shareEntry() {
    const url = new URL(href, window.location.origin).toString();
    const caption = buildEntryShareCaption({ definition, title, url });
    const linkShareData: ShareDataWithFiles = {
      title,
      text: definition.trim(),
      url,
    };

    setStatus("preparing");

    try {
      if (typeof navigator.share === "function") {
        const file = await fetchShareImage(slug).catch(() => null);

        if (file) {
          const imageShareData: ShareDataWithFiles = {
            files: [file],
            text: caption,
            title,
            url,
          };

          if (canShare(imageShareData)) {
            await navigator.share(imageShareData);
            setStatus("idle");
            return;
          }
        }

        await navigator.share(linkShareData);
        setStatus("idle");
        return;
      }

      await markCopied(caption);
    } catch (error) {
      if (isAbortError(error)) {
        setStatus("idle");
        return;
      }

      if (typeof navigator.share === "function" && canShare(linkShareData)) {
        try {
          await navigator.share(linkShareData);
          setStatus("idle");
          return;
        } catch (fallbackError) {
          if (isAbortError(fallbackError)) {
            setStatus("idle");
            return;
          }
        }
      }

      await markCopied(caption);
    }
  }

  return (
    <button
      type="button"
      onClick={shareEntry}
      className={cn("button button-secondary hover:border-accent hover:text-accent", className)}
      disabled={status === "preparing"}
    >
      {status === "preparing" ? "Preparing share..." : status === "copied" ? "Link copied" : "Share word"}
    </button>
  );
}
