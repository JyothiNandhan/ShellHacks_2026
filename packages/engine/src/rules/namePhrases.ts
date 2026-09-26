import { makeFinding } from '../util';
import { STOPWORDS } from '../stopwords';
import { isFirstName } from '../nameDictionary';
const prefixes = /\b(my full name is|my name is|my name's|name:|call me|i go by|signed,|i am|i'm|this is|mr\.|mrs\.|ms\.|dr\.)[ \t]+/gi;
const words = /[\p{L}]+(?:['’-][\p{L}]+)*/gu;
const signoff = /(?:^|\n)[ \t]*(?:regards|thanks|best|sincerely|cheers),[ \t]*\r?\n[ \t]*([^\r\n]+)/gi;
function nameLength(candidate: string, capitalized: boolean): number {
  words.lastIndex = 0; let end = 0, count = 0;
  for (const m of candidate.matchAll(words)) {
    if (count === 3 || !/^[ \t]*$/.test(candidate.slice(end, m.index!)) || STOPWORDS.has(m[0].toLowerCase()) || (capitalized && !/^\p{Lu}/u.test(m[0]) && !(count === 0 && isFirstName(m[0])))) break;
    end = m.index! + m[0].length; count++;
  }
  return end;
}
export function find(text: string) {
  const result = []; prefixes.lastIndex = 0; signoff.lastIndex = 0;
  for (const m of text.matchAll(prefixes)) {
    const start = m.index! + m[0].length;
    const length = nameLength(text.slice(start, start + 100), /^(?:i am|i'm|this is|mr\.|mrs\.|ms\.|dr\.)$/i.test(m[1]));
    if (length) result.push(makeFinding('PERSON', text, start, start + length, 'rule', 0.85));
  }
  for (const m of text.matchAll(signoff)) {
    const start = m.index! + m[0].lastIndexOf(m[1]), length = nameLength(m[1], true);
    if (length && !m[1].slice(length).trim()) result.push(makeFinding('PERSON', text, start, start + length, 'rule', 0.85));
  }
  return result;
}
