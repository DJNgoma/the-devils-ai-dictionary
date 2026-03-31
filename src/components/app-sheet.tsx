"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { useMobileShell } from "@/components/mobile-shell-controller";
import { cn } from "@/lib/utils";

type AppSheetProps = {
  id: string;
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
};

export function AppSheet({
  id,
  open,
  onClose,
  title,
  description,
  children,
  className,
}: AppSheetProps) {
  const { setSheetOpen } = useMobileShell();
  const titleId = useId();
  const descriptionId = useId();
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const closeSheet = () => {
    onCloseRef.current();
  };

  useEffect(() => setSheetOpen(id, open), [id, open, setSheetOpen]);
  useEffect(() => () => setSheetOpen(id, false), [id, setSheetOpen]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeSheet();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="app-sheet"
      data-app-sheet-open="true"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          closeSheet();
        }
      }}
    >
      <div
        className={cn("app-sheet__surface", className)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-xl font-display font-semibold tracking-tight">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="mt-2 text-sm leading-6 text-foreground-soft">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => closeSheet()}
            className="button button-ghost shrink-0"
            aria-label={`Close ${title}`}
          >
            Close
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
