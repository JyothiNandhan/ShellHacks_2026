// TEMPORARY STUB — Person 1 will replace this whole package
export * from "./types";
import type {
  DetectOptions,
  DetectionResult,
  EntityType,
  TopicType,
  Finding,
  NerRunner,
  PiiEvent,
  Settings,
  Severity,
} from "./types";
export function detectFast(
  text: string,
  opts?: DetectOptions,
): DetectionResult {
  if (opts?.enabledTypes && !opts.enabledTypes.includes("EMAIL"))
    return { findings: [], topics: [] };
  return {
    findings: Array.from(
      text.matchAll(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g),
      (m) => ({
        id: `EMAIL:${m.index}:${m.index! + m[0].length}`,
        type: "EMAIL" as const,
        value: m[0],
        key: m[0].toLowerCase().trim(),
        start: m.index!,
        end: m.index! + m[0].length,
        severity: "medium" as const,
        source: "rule" as const,
        confidence: 1,
        allowlisted:
          opts?.allowlist?.some(
            (v) => v.trim().toLowerCase() === m[0].toLowerCase(),
          ) ?? false,
      }),
    ),
    topics: [],
  };
}
export async function detectFull(
  text: string,
  opts: DetectOptions | undefined,
  ner: NerRunner,
): Promise<DetectionResult> {
  await ner(text);
  return detectFast(text, opts);
}
export class PlaceholderMapper {
  private values: Record<string, string>;
  constructor(initial?: Record<string, string>) {
    this.values = { ...initial };
  }
  placeholderFor(f: Finding): string {
    return this.values[f.key] ?? (this.values[f.key] = `${f.type}_1`);
  }
  toJSON(): Record<string, string> {
    return { ...this.values };
  }
}
export function redactText(
  text: string,
  findings: Finding[],
  mapper: PlaceholderMapper,
): string {
  let output = text;
  for (const f of [...findings]
    .filter((f) => !f.allowlisted)
    .sort((a, b) => b.start - a.start))
    output =
      output.slice(0, f.start) + mapper.placeholderFor(f) + output.slice(f.end);
  return output;
}
export function maskValue(_type: EntityType, value: string): string {
  return value ? "••••••••" : "";
}
export function computeScore(
  _events: PiiEvent[],
  _now?: number,
): { score: number; daily: Array<{ date: string; score: number }> } {
  return { score: 100, daily: [] };
}
export const SEVERITY_WEIGHT: Record<Severity, number> = {
  high: 10,
  medium: 5,
  low: 2,
};
const labels: Record<EntityType | TopicType, string> = {
  PERSON: "Names",
  EMAIL: "Email addresses",
  PHONE: "Phone numbers",
  ADDRESS: "Home addresses",
  SSN: "Social Security numbers",
  CREDIT_CARD: "Card numbers",
  BANK: "Bank details",
  API_KEY: "API keys",
  PASSWORD: "Passwords",
  IP_ADDRESS: "IP addresses",
  DATE_OF_BIRTH: "Dates of birth",
  LOCATION: "Locations",
  ORGANIZATION: "Organizations",
  USER_TERM: "Your private terms",
  HEALTH: "Health",
  FINANCE: "Finances",
  LEGAL: "Legal matters",
};
export const EXPLANATIONS = Object.fromEntries(
  Object.entries(labels).map(([type, label]) => [
    type,
    { label, why: "SAMPLE — explanation pending the shared engine." },
  ]),
) as Record<EntityType | TopicType, { label: string; why: string }>;
export const DEFAULT_SETTINGS: Settings = {
  userTerms: { names: [], emails: [], phones: [], addresses: [], custom: [] },
  allowlist: [],
  enabledTypes: Object.keys(labels).filter(
    (k) => !["ORGANIZATION", "HEALTH", "FINANCE", "LEGAL"].includes(k),
  ) as EntityType[],
  sites: ["chatgpt", "claude", "gemini"],
};
