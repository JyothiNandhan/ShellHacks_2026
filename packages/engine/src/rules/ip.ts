import { matches, inUrl } from '../util';
const pattern = /(?<![\w.])(?:\d{1,3}\.){3}\d{1,3}(?![\w.]\d|\w)/g;
export const find = (text: string) => matches(text, pattern, 'IP_ADDRESS', m => m[0].split('.').every(n => Number(n) <= 255) && m[0] !== '1.2.3.4' && !inUrl(text, m.index!) && !/\b(?:version|ver|release|v)\s*[:=]?\s*$/i.test(text.slice(Math.max(0, m.index! - 25), m.index!)));
