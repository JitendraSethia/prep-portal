"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/analytics/client";

/**
 * Emits a PAGE_VIEW event (with time-on-page in ms) whenever the route
 * changes or the tab is hidden/closed. Mounted once in the root layout.
 */
export function AnalyticsTracker() {
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  const enteredAtRef = useRef<number>(Date.now());

  // Flush the previous page's dwell time when the pathname changes.
  useEffect(() => {
    const previous = pathRef.current;
    const now = Date.now();
    if (previous && previous !== pathname) {
      track({
        type: "PAGE_VIEW",
        path: previous,
        durationMs: now - enteredAtRef.current,
      });
      enteredAtRef.current = now;
    }
    pathRef.current = pathname;
  }, [pathname]);

  // Flush on tab hide / unload so we don't lose the final page's time.
  useEffect(() => {
    const flush = () => {
      const now = Date.now();
      track({
        type: "PAGE_VIEW",
        path: pathRef.current,
        durationMs: now - enteredAtRef.current,
      });
      enteredAtRef.current = now;
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
    };
  }, []);

  return null;
}
