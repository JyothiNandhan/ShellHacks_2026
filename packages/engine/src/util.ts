import type { EntityType, Finding, Severity, Source } from './types';
export const SEVERITY_WEIGHT: Record<Severity, number> = { high: 10, medium: 5, low: 2 };
export const SEVERITIES: Record<EntityType, Severity> = {
  PERSON: 'medium', EMAIL: 'medium', PHONE: 'medium', ADDRESS: 'high', SSN: 'high', CREDIT_CARD: 'high', BANK: 'high',
  API_KEY: 'high', PASSWORD: 'high', IP_ADDRESS: 'low', DATE_OF_BIRTH: 'medium', LOCATION: 'low', ORGANIZATION: 'low', USER_TERM: 'high',
};
const numeric = new Set<EntityType>(['PHONE', 'CREDIT_CARD', 'BANK', 'SSN']);
export function normalizeKey(type: EntityType, value: string): string {
  return numeric.has(type) ? value.replace(/\D/g, '') : value.toLowerCase().trim();
}
export function makeFinding(type: EntityType, text: string, start: number, end: number, source: Source = 'rule', confidence = 0.95): Finding {
  const value = text.slice(start, end);
  return { id: `${type}:${start}:${end}`, type, value, key: normalizeKey(type, value), start, end, severity: SEVERITIES[type], source, confidence, allowlisted: false };
}
const sentenceBreak = /[.!?](?=\s|$)|\r?\n/g;
export function splitSentences(text: string): Array<{ start: number; end: number; sentence: string }> {
  const result = []; let start = 0;
  sentenceBreak.lastIndex = 0;
  for (const m of text.matchAll(sentenceBreak)) {
    const end = m.index! + m[0].length;
    if (text.slice(start, end).trim()) result.push({ start, end, sentence: text.slice(start, end) });
    start = end;
  }
  if (text.slice(start).trim()) result.push({ start, end: text.length, sentence: text.slice(start) });
  return result;
}
export function matches(text: string, regex: RegExp, type: EntityType, accept: (m: RegExpMatchArray) => boolean = () => true): Finding[] {
  regex.lastIndex = 0;
  return Array.from(text.matchAll(regex)).filter(accept).map(m => makeFinding(type, text, m.index!, m.index! + m[0].length));
}
export function inUrl(text: string, start: number): boolean {
  const tokenStart = Math.max(text.lastIndexOf(' ', start), text.lastIndexOf('\n', start), text.lastIndexOf('\t', start)) + 1;
  return /^(?:https?:\/\/|www\.)/i.test(text.slice(tokenStart, start + 8));
}
export function escapeRegex(value: string): string { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
