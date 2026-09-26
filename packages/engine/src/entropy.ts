import { matches, inUrl } from './util';
const tokens = /(?<![\w/-])[A-Za-z0-9_+\/-]{24,}(?![\w/-])/g;
export function shannonEntropy(value: string): number {
  const counts = new Map<string, number>(); for (const c of value) counts.set(c, (counts.get(c) ?? 0) + 1);
  let h = 0; for (const count of counts.values()) { const p = count / value.length; h -= p * Math.log2(p); } return h;
}
export const find = (text: string) => matches(text, tokens, 'API_KEY', m => /[A-Za-z]/.test(m[0]) && /\d/.test(m[0]) && !/^http/i.test(m[0]) && !inUrl(text, m.index!) && !/^(?:[a-f\d]{32}|[a-f\d]{40}|[a-f\d]{64})$/i.test(m[0]) && shannonEntropy(m[0]) >= 4).map(f => ({ ...f, severity: 'medium' as const, confidence: 0.6 }));
