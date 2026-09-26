import { computeScore, type PiiEvent } from "@promptshield/engine";
// Only totals and category names leave the extension; never text or values.
export function liveStats(events: PiiEvent[], prompts: number, conversations: number) {
  const shared = events.filter((e) => e.action === "as_is");
  return {
    version: 2,
    prompts,
    conversations,
    findings: events.length,
    shared: shared.length,
    protected: events.filter((e) => e.action === "renamed").length,
    categories: [...new Set(shared.map((e) => e.type))].sort(),
    // A fresh install starts at 100; only details sent as is lower it.
    score: computeScore(events).score,
  };
}
