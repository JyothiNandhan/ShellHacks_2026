// Test double for the frozen engine contract. Never included in the extension build.
export type Site = 'chatgpt' | 'claude' | 'gemini';
export type EntityType = 'PERSON' | 'EMAIL' | 'PHONE' | 'ADDRESS' | 'SSN' | 'CREDIT_CARD' | 'BANK' | 'API_KEY' | 'PASSWORD' | 'IP_ADDRESS' | 'DATE_OF_BIRTH' | 'LOCATION' | 'ORGANIZATION' | 'USER_TERM';
export type EventSource = 'paste' | 'file' | 'typed';
export type EventAction = 'renamed' | 'as_is' | 'allowlisted';
export interface Finding { id: string; type: EntityType; value: string; key: string; start: number; end: number; severity: 'high' | 'medium' | 'low'; source: 'rule' | 'dictionary' | 'ner' | 'user_terms'; confidence: number; allowlisted: boolean }
export interface TopicFlag { topic: 'HEALTH' | 'FINANCE' | 'LEGAL'; start: number; end: number; sentence: string; keywords: string[] }
export interface DetectionResult { findings: Finding[]; topics: TopicFlag[] }
export interface Settings { userTerms: { names: string[]; emails: string[]; phones: string[]; addresses: string[]; custom: string[] }; allowlist: string[]; enabledTypes: EntityType[]; sites: Site[] }
export interface PiiEvent { type: EntityType; site: Site; source: EventSource; action: EventAction; ts: number }
export const DEFAULT_SETTINGS: Settings = { userTerms: { names: [], emails: [], phones: [], addresses: [], custom: [] }, allowlist: [], enabledTypes: ['EMAIL'], sites: ['chatgpt', 'claude', 'gemini'] };
export function detectFast(text: string, opts = DEFAULT_SETTINGS): DetectionResult {
  return { findings: [...text.matchAll(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi)].map(m => ({ id: `EMAIL:${m.index}:${m.index! + m[0].length}`, type: 'EMAIL', value: m[0], key: m[0].toLowerCase(), start: m.index!, end: m.index! + m[0].length, severity: 'medium', source: 'rule', confidence: 1, allowlisted: opts.allowlist.includes(m[0].toLowerCase()) })), topics: [] };
}
export class PlaceholderMapper {
  private map: Record<string, string>;
  constructor(initial: Record<string, string> = {}) { this.map = { ...initial }; }
  placeholderFor(f: Finding): string {
    const key = `${f.type}|${f.key}`;
    return this.map[key] ??= `person_${Object.keys(this.map).length + 1}@${f.value.split('@')[1]}`;
  }
  toJSON() { return { ...this.map }; }
}
export function redactText(text: string, findings: Finding[], mapper: PlaceholderMapper) {
  for (const f of [...findings].sort((a, b) => b.start - a.start)) if (!f.allowlisted) text = text.slice(0, f.start) + mapper.placeholderFor(f) + text.slice(f.end);
  return text;
}
export const EXPLANATIONS = new Proxy({} as Record<EntityType | TopicFlag['topic'], { label: string; why: string }>, { get: (_, key) => ({ label: String(key), why: 'May identify you.' }) });
export const maskValue = (_type: EntityType, _value: string) => '••••';

export { computeScore } from '../../../../packages/engine/src/score';
