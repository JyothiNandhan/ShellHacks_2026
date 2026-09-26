import type { DetectOptions, Finding } from './types';
import { DEFAULT_SETTINGS } from './settings';
import { normalizeKey } from './util';
export function applyOptions(findings: Finding[], opts: DetectOptions = {}): Finding[] {
  const enabled = new Set(opts.enabledTypes ?? DEFAULT_SETTINGS.enabledTypes);
  const plain = new Set((opts.allowlist ?? []).map(s => s.toLowerCase().trim()));
  const numbers = new Set((opts.allowlist ?? []).filter(s => /^[+\d\s().-]+$/.test(s)).map(s => s.replace(/\D/g, '')));
  return findings.filter(f => enabled.has(f.type)).map(f => ({ ...f, allowlisted: plain.has(f.key) || (['PHONE', 'SSN', 'BANK', 'CREDIT_CARD'].includes(f.type) && numbers.has(normalizeKey(f.type, f.value))) }));
}
