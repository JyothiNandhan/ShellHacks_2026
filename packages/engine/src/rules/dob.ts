import { matches } from '../util';
const pattern = /(?<!\w)(?:\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+\d{4}|\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})(?!\w)/gi;
export const find = (text: string) => matches(text, pattern, 'DATE_OF_BIRTH', m => /\b(?:born|dob|date of birth|birthday|birth date)\b/i.test(text.slice(Math.max(0, m.index! - 30), m.index!)));
