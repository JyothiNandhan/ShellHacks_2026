import { makeFinding } from '../util';
// A bare space separator ("passcode 552190") counts only when the value contains a digit.
const pattern = /\b(?:password|passwd|pwd|passcode|pin)(?:\s*(?:is\b|:|=)\s*|\s+(?=["']?[^\s"',;]*\d))["']?([^\s"',;]{3,})/gi;
export function find(text: string) {
  pattern.lastIndex = 0;
  return Array.from(text.matchAll(pattern), m => { const start = m.index! + m[0].lastIndexOf(m[1]); return makeFinding('PASSWORD', text, start, start + m[1].length); });
}
