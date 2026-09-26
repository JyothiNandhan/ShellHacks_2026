import type { Finding, Source } from './types';
import { SEVERITY_WEIGHT } from './util';
import { STOPWORDS } from './stopwords';
const priority: Record<Source, number> = { user_terms: 4, rule: 3, ner: 2, dictionary: 1 };
export function merge(findings: Finding[]): Finding[] {
  const ranked = findings.filter(f => f.end > f.start && (f.source !== 'ner' || (f.value.trim().length >= 2 && !STOPWORDS.has(f.key)))).sort((a, b) =>
    priority[b.source] - priority[a.source] || SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity] || (b.end - b.start) - (a.end - a.start) || a.start - b.start || a.type.localeCompare(b.type));
  const result: Finding[] = [];
  for (const f of ranked) {
    let lo = 0, hi = result.length;
    while (lo < hi) { const mid = (lo + hi) >>> 1; if (result[mid].start < f.start) lo = mid + 1; else hi = mid; }
    if ((lo > 0 && result[lo - 1].end > f.start) || (lo < result.length && result[lo].start < f.end)) continue;
    result.splice(lo, 0, f);
  }
  return result;
}
