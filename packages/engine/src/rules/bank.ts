import { matches } from '../util';
const pattern = /(?<!\w)\d{8,17}(?!\w)/g;
export function aba(value: string): boolean {
  if (!/^\d{9}$/.test(value) || /^0+$/.test(value)) return false;
  const d = [...value].map(Number);
  return (3 * (d[0] + d[3] + d[6]) + 7 * (d[1] + d[4] + d[7]) + d[2] + d[5] + d[8]) % 10 === 0;
}
export const find = (text: string) => matches(text, pattern, 'BANK', m => {
  const before = text.slice(Math.max(0, m.index! - 30), m.index!);
  const nearby = text.slice(Math.max(0, m.index! - 30), m.index! + m[0].length + 30);
  return /\b(?:account number|acct|a\/c|account #)/i.test(before) || (aba(m[0]) && /\b(?:routing|aba|rtn)\b/i.test(nearby));
});
