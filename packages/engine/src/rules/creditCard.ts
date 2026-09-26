import { matches, inUrl } from '../util';
const pattern = /(?<![\w-])(?:\d[ -]?){12,18}\d(?!\w|[ -]\d)/g;
export function luhn(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19 || /^(\d)\1+$/.test(digits)) return false;
  let sum = 0;
  for (let i = digits.length - 1, n = 0; i >= 0; i--, n++) { let d = Number(digits[i]); if (n % 2) { d *= 2; if (d > 9) d -= 9; } sum += d; }
  return sum % 10 === 0;
}
export const find = (text: string) => matches(text, pattern, 'CREDIT_CARD', m => luhn(m[0]) && !inUrl(text, m.index!));
