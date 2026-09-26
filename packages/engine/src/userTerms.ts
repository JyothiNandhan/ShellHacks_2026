import type { EntityType, UserTerms } from './types';
import { escapeRegex, makeFinding, normalizeKey } from './util';
const boundary = /[\p{L}\p{N}_]/u;
export function find(text: string, terms?: UserTerms) {
  if (!terms) return [];
  const result = [];
  const fields: Array<[keyof UserTerms, EntityType]> = [['names', 'PERSON'], ['emails', 'EMAIL'], ['phones', 'PHONE'], ['addresses', 'ADDRESS'], ['custom', 'USER_TERM']];
  for (const [field, type] of fields) {
    const values = new Set(terms[field].map(v => v.trim()).filter(Boolean));
    if (field === 'names') for (const name of [...values]) for (const word of name.split(/\s+/)) if (word.length >= 3) values.add(word);
    for (const value of values) {
      const normalized = normalizeKey(type, value); if (!normalized) continue;
      // Patterns depend on user settings; compiled once per configured term per scan.
      const regex = new RegExp(type === 'PHONE' ? [...normalized].join('[\\s().-]*') : escapeRegex(value), 'giu');
      for (const m of text.matchAll(regex)) {
        let start = m.index!;
        const end = start + m[0].length;
        if (type === 'PHONE' && start > 0 && /[+(]/.test(text[start - 1])) start--;
        if ((start && boundary.test(text[start - 1])) || (end < text.length && boundary.test(text[end]))) continue;
        result.push(makeFinding(type, text, start, end, 'user_terms', 1));
      }
    }
  }
  return result;
}
