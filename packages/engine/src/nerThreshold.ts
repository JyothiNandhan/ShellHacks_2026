import type { NerEntity } from './types';
import { STOPWORDS } from './stopwords';
const properName = /^\p{Lu}[\p{L}\p{M}'’-]{2,}$/u;
/** Minimum NER score. Capitalized 3+ letter names that aren't stopwords need only 0.6; bert-base-NER
 *  splits unfamiliar (e.g. Indian) names into low-confidence word pieces. */
export function nerThreshold(type: NerEntity['type'], value: string): number {
  if (type !== 'PERSON') return 0.9;
  const words = value.trim().split(/\s+/);
  return words.every(w => properName.test(w) && !STOPWORDS.has(w.toLowerCase())) ? 0.6 : 0.85;
}
