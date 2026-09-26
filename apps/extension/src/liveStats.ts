import { computeScore, type PiiEvent } from "@promptshield/engine";
export function liveStats(events: PiiEvent[], prompts: number) {
  return {
    version: 1,
    prompts,
    findings: events.length,
    shared: events.filter((e) => e.action === "as_is").length,
    protected: events.filter((e) => e.action === "renamed").length,
    score: prompts ? computeScore(events).score : 0,
  };
}
