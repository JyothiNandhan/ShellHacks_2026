import { matches } from '../util';
const formatted = /(?<!\w)(?!000|666|9\d\d)\d{3}-(?!00)\d{2}-(?!0000)\d{4}(?!\w)/g;
// Bare or space-separated digits count only with "ssn"/"social security" just before them.
const bare = /(?<!\w)(?!000|666|9\d\d)\d{3}( ?)(?!00)\d{2}\1(?!0000)\d{4}(?!\w)/g;
export const find = (text: string) => [...matches(text, formatted, 'SSN'), ...matches(text, bare, 'SSN', m => /\b(?:ssn|social security)\b/i.test(text.slice(Math.max(0, m.index! - 25), m.index!)))];
