"use client";
import { useCallback, useEffect, useState } from "react";

/** Totals the PromptShield extension shares with this page. Never prompt text or values. */
export type LiveStats = {
  version: 2;
  prompts: number;
  conversations: number;
  findings: number;
  shared: number;
  protected: number;
  categories: string[];
  score: number;
};

export type LiveState =
  | { status: "waiting" }
  | { status: "missing" }
  | { status: "error" }
  | { status: "connected"; stats: LiveStats };

const counts = ["prompts", "conversations", "findings", "shared", "protected", "score"] as const;

function valid(s: unknown): s is LiveStats {
  if (!s || typeof s !== "object") return false;
  const v = s as Record<string, unknown>;
  return (
    v.version === 2 &&
    counts.every((k) => Number.isFinite(v[k]) && (v[k] as number) >= 0) &&
    (v.score as number) <= 100 &&
    Array.isArray(v.categories) &&
    v.categories.every((c) => typeof c === "string" && /^[A-Z_]{1,40}$/.test(c))
  );
}

const post = (type: "GET_STATS" | "RESET_STATS") =>
  window.postMessage({ source: "mindyourprompt-website", type }, location.origin);

/**
 * Talks to the extension's dashboard bridge content script through window messages.
 * The page works without the extension; it then reports "missing" after a short wait.
 */
export function useLiveStats() {
  const [state, setState] = useState<LiveState>({ status: "waiting" });
  useEffect(() => {
    const receive = (e: MessageEvent) => {
      if (e.source !== window || e.origin !== location.origin || e.data?.source !== "mindyourprompt-extension") return;
      if (e.data.type === "ERROR") setState({ status: "error" });
      else if (e.data.type === "STATS" && valid(e.data.stats)) setState({ status: "connected", stats: e.data.stats });
    };
    window.addEventListener("message", receive);
    post("GET_STATS");
    const missing = setTimeout(() => setState((s) => (s.status === "waiting" ? { status: "missing" } : s)), 2500);
    const retry = setInterval(() => post("GET_STATS"), 5000);
    return () => {
      window.removeEventListener("message", receive);
      clearTimeout(missing);
      clearInterval(retry);
    };
  }, []);
  const reset = useCallback(() => post("RESET_STATS"), []);
  return { live: state, resetLive: reset };
}
