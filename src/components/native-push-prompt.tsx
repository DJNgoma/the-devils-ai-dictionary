"use client";

import { useEffect, useState } from "react";
import {
  getNativeCurrentWordState,
  isNativeIOSCurrentWordAvailable,
  requestNativePushPermission,
  type NativeCurrentWordState,
} from "@/lib/native/current-word";

export function NativePushPrompt() {
  const [state, setState] = useState<NativeCurrentWordState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isNativeIOSCurrentWordAvailable()) {
      return;
    }

    void getNativeCurrentWordState().then((nextState) => {
      setState(nextState);
    });
  }, []);

  if (!isNativeIOSCurrentWordAvailable() || !state) {
    return null;
  }

  if (state.pushAuthorizationStatus === "authorized") {
    return null;
  }

  async function handleEnableNotifications() {
    setIsSubmitting(true);

    try {
      const nextState = await requestNativePushPermission();
      setState(nextState);
    } finally {
      setIsSubmitting(false);
    }
  }

  const denied = state.pushAuthorizationStatus === "denied";

  return (
    <div className="surface mt-6 max-w-2xl p-5 sm:p-6">
      <p className="page-kicker">iPhone notifications</p>
      <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight text-foreground">
        Let the phone deliver the next good word.
      </h2>
      <p className="mt-3 text-sm leading-7 text-foreground-soft sm:text-base">
        Push is now wired through the native iPhone shell so the watch companion can
        inherit the same current-word state when a notification opens the app.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          className="button button-primary"
          disabled={isSubmitting}
          onClick={() => {
            void handleEnableNotifications();
          }}
        >
          {isSubmitting ? "Enabling..." : "Enable notifications"}
        </button>
        {denied ? (
          <p className="text-sm leading-7 text-danger">
            Notifications are currently denied for this app in iOS settings.
          </p>
        ) : (
          <p className="text-sm leading-7 text-foreground-soft">
            The prompt is native iOS-only and stays out of the browser build.
          </p>
        )}
      </div>
    </div>
  );
}
