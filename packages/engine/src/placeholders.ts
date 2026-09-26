import type { EntityType, Finding } from "./types.js";

const PREFIX: Record<EntityType, string> = {
  PERSON: "PERSON", EMAIL: "person", PHONE: "PHONE", ADDRESS: "ADDRESS",
  SSN: "SSN", CREDIT_CARD: "CARD", BANK: "BANK", API_KEY: "API_KEY",
  PASSWORD: "PASSWORD", IP_ADDRESS: "IP", DATE_OF_BIRTH: "DOB",
  LOCATION: "PLACE", ORGANIZATION: "ORG", USER_TERM: "TERM",
};

export class PlaceholderMapper {
  private readonly values = new Map<string, string>();
  private readonly counters = new Map<EntityType, number>();

  constructor(initial?: Record<string, string>) {
    for (const [key, value] of Object.entries(initial ?? {})) {
      const type = key.split("|")[0] as EntityType;
      if (!Object.hasOwn(PREFIX, type)) throw new Error("Unknown placeholder type");
      const pattern = new RegExp(`^${PREFIX[type]}_([1-9][0-9]*)${type === "EMAIL" ? "@.+" : ""}$`);
      const match = pattern.exec(value);
      const count = Number(match?.[1]);
      if (!Number.isSafeInteger(count) || count < 1) throw new Error("Invalid stored placeholder");
      this.values.set(key, value);
      this.counters.set(type, Math.max(this.counters.get(type) ?? 0, count));
    }
  }

  placeholderFor(f: Finding): string {
    const identity = `${f.type}|${f.key}`;
    const existing = this.values.get(identity);
    if (existing !== undefined) return existing;
    const count = (this.counters.get(f.type) ?? 0) + 1;
    let value = `${PREFIX[f.type]}_${count}`;
    if (f.type === "EMAIL") value += `@${f.value.slice(f.value.lastIndexOf("@") + 1)}`;
    this.counters.set(f.type, count);
    this.values.set(identity, value);
    return value;
  }

  toJSON(): Record<string, string> { return Object.fromEntries(this.values); }
}

export function redactText(text: string, findings: Finding[], mapper: PlaceholderMapper): string {
  const ordered = findings.filter(f => !f.allowlisted).sort((a, b) => a.start - b.start);
  let cursor = 0;
  // Check the full set before mutating the conversation's placeholder map.
  for (const f of ordered) {
    if (!Number.isInteger(f.start) || !Number.isInteger(f.end) || f.start < cursor || f.end <= f.start || f.end > text.length || text.slice(f.start, f.end) !== f.value) {
      throw new Error("Findings must have valid, non-overlapping spans matching the text");
    }
    cursor = f.end;
  }
  cursor = 0;
  const parts: string[] = [];
  for (const f of ordered) {
    parts.push(text.slice(cursor, f.start), mapper.placeholderFor(f));
    cursor = f.end;
  }
  parts.push(text.slice(cursor));
  return parts.join("");
}

/** A minimal display mask; email domains remain visible, as in placeholders. */
export function maskValue(type: EntityType, value: string): string {
  if (value.length === 0) return "";
  if (type === "EMAIL" && value.includes("@")) return `••••${value.slice(value.lastIndexOf("@"))}`;
  return "••••";
}
