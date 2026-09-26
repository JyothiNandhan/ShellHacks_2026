import type { EntityType, Finding } from './types';
const prefixes: Record<EntityType, string> = { PERSON: 'PERSON', EMAIL: 'person', PHONE: 'PHONE', ADDRESS: 'ADDRESS', SSN: 'SSN', CREDIT_CARD: 'CARD', BANK: 'BANK', API_KEY: 'API_KEY', PASSWORD: 'PASSWORD', IP_ADDRESS: 'IP', DATE_OF_BIRTH: 'DOB', LOCATION: 'PLACE', ORGANIZATION: 'ORG', USER_TERM: 'TERM' };
export class PlaceholderMapper {
  private map = new Map<string, string>();
  private counters = new Map<string, number>();
  constructor(initial: Record<string, string> = {}) {
    for (const [key, value] of Object.entries(initial)) {
      this.map.set(key, value); const type = key.split('|')[0];
      const n = /_(\d+)(?:@|$)/.exec(value);
      if (n) this.counters.set(type, Math.max(this.counters.get(type) ?? 0, Number(n[1])));
    }
  }
  placeholderFor(f: Finding): string {
    const key = `${f.type}|${f.key}`, existing = this.map.get(key); if (existing) return existing;
    const n = (this.counters.get(f.type) ?? 0) + 1; this.counters.set(f.type, n);
    const placeholder = `${prefixes[f.type]}_${n}${f.type === 'EMAIL' ? '@' + f.value.slice(f.value.lastIndexOf('@') + 1) : ''}`;
    this.map.set(key, placeholder); return placeholder;
  }
  toJSON(): Record<string, string> { return Object.fromEntries(this.map); }
}
export function redactText(text: string, findings: Finding[], mapper: PlaceholderMapper): string {
  // Allocate in reading order, then splice backwards to preserve source offsets.
  const edits = findings.filter(f => !f.allowlisted).sort((a, b) => a.start - b.start).map(f => ({ ...f, replacement: mapper.placeholderFor(f) }));
  let last = text.length;
  for (const f of edits.reverse()) {
    if (f.start < 0 || f.end > last || f.end <= f.start || text.slice(f.start, f.end) !== f.value) throw new Error('Invalid or overlapping finding offsets');
    text = text.slice(0, f.start) + f.replacement + text.slice(f.end); last = f.start;
  }
  return text;
}
