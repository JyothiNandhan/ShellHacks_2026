import { matches, inUrl } from '../util';
const pattern = /(?<![\w.%+@-])[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}(?![\w@-])/g;
export const find = (text: string) => matches(text, pattern, 'EMAIL', m => !inUrl(text, m.index!));
