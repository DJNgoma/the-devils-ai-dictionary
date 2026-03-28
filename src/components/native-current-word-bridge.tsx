"use client";

import { startTransition, useEffect, useEffectEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  consumePendingNativeNavigation,
  getNativeCurrentWordState,
  isNativeIOSCurrentWordAvailable,
  listenToNativeCurrentWord,
  type NativeCurrentWordState,
} from "@/lib/native/current-word";

export function NativeCurrentWordBridge() {
  const pathname = usePathname();
  const router = useRouter();

  const handleState = useEffectEvent(async (state: NativeCurrentWordState | null) => {
    const path = state?.pendingNavigationPath;

    if (!path) {
      return;
    }

    if (pathname !== path) {
      startTransition(() => {
        router.push(path);
      });
    }

    await consumePendingNativeNavigation(path);
  });

  useEffect(() => {
    if (!isNativeIOSCurrentWordAvailable()) {
      return;
    }

    void getNativeCurrentWordState().then((state) => {
      void handleState(state);
    });

    let cancelled = false;

    const attach = async () => {
      const listener = await listenToNativeCurrentWord(
        "pendingNavigationChanged",
        (state) => {
          if (!cancelled) {
            void handleState(state);
          }
        },
      );

      return listener;
    };

    const listenerPromise = attach();

    return () => {
      cancelled = true;
      void listenerPromise.then((listener) => listener?.remove());
    };
  }, []);

  return null;
}
