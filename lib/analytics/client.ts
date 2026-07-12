import type { TrackEventInput } from "@/lib/validators/track";

const SESSION_KEY = "pp_session_id";

/** Stable per-browser-session id (grouping events into a browsing session). */
export function getSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = window.sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2) + Date.now().toString(36);
      window.sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}

/**
 * Send an analytics event. Uses `sendBeacon` when possible (survives page
 * unload); falls back to `fetch` with `keepalive`.
 */
export function track(event: Omit<TrackEventInput, "sessionId">): void {
  if (typeof window === "undefined") return;
  const payload: TrackEventInput = { ...event, sessionId: getSessionId() };
  const body = JSON.stringify(payload);

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      const ok = navigator.sendBeacon("/api/track", blob);
      if (ok) return;
    }
  } catch {
    /* fall through to fetch */
  }

  void fetch("/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}
