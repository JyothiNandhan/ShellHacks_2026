import type { DetectOptions, DetectionResult, NerRunner } from './types';
import { find as email } from './rules/email';
import { find as phone } from './rules/phone';
import { find as ssn } from './rules/ssn';
import { find as card } from './rules/creditCard';
import { find as bank } from './rules/bank';
import { find as apiKey } from './rules/apiKey';
import { find as password } from './rules/password';
import { find as ip } from './rules/ip';
import { find as dob } from './rules/dob';
import { find as address } from './rules/address';
import { find as names } from './rules/namePhrases';
import { find as entropy } from './entropy';
import { find as userTerms } from './userTerms';
import { find as dictionary } from './nameDictionary';
import { findTopics } from './topics';
import { merge } from './merge';
import { applyOptions } from './allowlist';
import { makeFinding } from './util';
const rules = [email, phone, ssn, card, bank, apiKey, password, ip, dob, address, names, entropy];
function candidates(text: string, opts: DetectOptions) {
  return [...userTerms(text, opts.userTerms), ...rules.flatMap(rule => rule(text)), ...(opts.enableNameDictionary === false ? [] : dictionary(text))];
}
export function detectFast(text: string, opts: DetectOptions = {}): DetectionResult {
  return { findings: merge(applyOptions(candidates(text, opts), opts)), topics: findTopics(text) };
}
export async function detectFull(text: string, opts: DetectOptions = {}, ner: NerRunner): Promise<DetectionResult> {
  if (!text) return { findings: [], topics: [] };
  const neural = (await ner(text)).filter(e => Number.isInteger(e.start) && Number.isInteger(e.end) && e.start >= 0 && e.end <= text.length && e.end > e.start && Number.isFinite(e.score) && e.score >= (e.type === 'PERSON' ? 0.85 : 0.9)).map(e => makeFinding(e.type, text, e.start, e.end, 'ner', e.score));
  return { findings: merge(applyOptions([...candidates(text, opts), ...neural], opts)), topics: findTopics(text) };
}
export type * from './types';
export { PlaceholderMapper, redactText } from './placeholder';
export { maskValue } from './mask';
export { computeScore } from './score';
export { EXPLANATIONS } from './explanations';
export { SEVERITY_WEIGHT } from './util';
export { DEFAULT_SETTINGS } from './settings';
