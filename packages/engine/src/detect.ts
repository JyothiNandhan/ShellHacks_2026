import type { DetectionResult, DetectOptions, NerRunner } from "./types.js";

/** Initial integration stub: email detection only. Saved terms/topics are pending. */
export function detectFast(text: string, opts?: DetectOptions): DetectionResult {
  if (opts?.enabledTypes && !opts.enabledTypes.includes("EMAIL")) {
    return { findings: [], topics: [] };
  }
  const allowlist = new Set(opts?.allowlist?.map(value => value.trim().toLowerCase()));
  const pattern = /[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?)+/gi;
  const findings = Array.from(text.matchAll(pattern), match => {
    const value = match[0];
    const start = match.index;
    const end = start + value.length;
    const key = value.trim().toLowerCase();
    return {
      id: `EMAIL:${start}:${end}`,
      type: "EMAIL" as const,
      value, key, start, end,
      severity: "medium" as const,
      source: "rule" as const,
      confidence: 1,
      allowlisted: allowlist.has(key),
    };
  });
  return { findings, topics: [] };
}

/** Initial integration stub. NER invocation and overlap merging are pending. */
export async function detectFull(text: string, opts: DetectOptions | undefined, _ner: NerRunner): Promise<DetectionResult> {
  return detectFast(text, opts);
}
