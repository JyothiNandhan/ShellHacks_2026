import type { PiiEvent } from "./types.js";

/** Initial integration stub. Do not present as a computed privacy score. */
export function computeScore(_events: PiiEvent[], _now?: number): { score: number; daily: Array<{ date: string; score: number }> } {
  return { score: 100, daily: [] };
}
