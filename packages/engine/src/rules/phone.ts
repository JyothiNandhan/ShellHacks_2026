import { matches, inUrl } from '../util';
const pattern = /(?<![\w+])(?:\+\d{1,3}[ .-]?\d(?:[ .-]?\d){6,12}|(?:\+?1[ .-]?)?\(?\d{3}\)?[ .-]?\d{3}[ .-]?\d{4}|(?:\+91[ -]?)?[6-9]\d{4}[ -]?\d{5})(?!\w|[ .-]\d)/g;
export const find = (text: string) => matches(text, pattern, 'PHONE', m => {
  const digits = m[0].replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15 && !inUrl(text, m.index!) &&
    !/\b(?:order|invoice|tracking|version)\s*(?:number|no\.?|#|:)?\s*$/i.test(text.slice(Math.max(0, m.index! - 30), m.index!));
});
