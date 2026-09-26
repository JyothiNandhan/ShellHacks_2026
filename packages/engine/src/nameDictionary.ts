import names from './data/first-names.json';
import common from './data/common-words.json';
import { STOPWORDS } from './stopwords';
import { makeFinding, splitSentences, inUrl } from './util';
const excluded = new Set([...common, ...STOPWORDS]);
const dictionary = new Set(names.filter(n => n.length >= 3 && !excluded.has(n)));
export const isFirstName = (word: string) => dictionary.has(word.toLowerCase());
const knownNames = new Set(names), commonWords = new Set(common);
/** An everyday English word that is not also a first name ("Run", "Beautiful" — but not "Grace" or "Greg"). */
export const isOrdinaryWord = (word: string) => { const w = word.toLowerCase(); return commonWords.has(w) && !knownNames.has(w); };
const wordPattern =/\b[A-Z][a-z]+(?:['’-][A-Za-z]+)*\b/g;
export function find(text: string) {
  const result = [];
  for (const sentence of splitSentences(text)) {
    wordPattern.lastIndex = 0;
    const words = Array.from(sentence.sentence.matchAll(wordPattern));
    for (let i = 0; i < words.length; i++) {
      const m = words[i], start = sentence.start + m.index!;
      if (!dictionary.has(m[0].toLowerCase()) || !sentence.sentence.slice(0, m.index).trim() || inUrl(text, start) || /[\w@./-]/.test(text[start - 1] ?? '')) continue;
      let end = start + m[0].length;
      const next = words[i + 1];
      if (next && /^[ \t]+$/.test(text.slice(end, sentence.start + next.index!)) && !excluded.has(next[0].toLowerCase())) { end = sentence.start + next.index! + next[0].length; i++; }
      if (/[\w@.-]/.test(text[end] ?? '')) continue;
      result.push(makeFinding('PERSON', text, start, end, 'dictionary', 0.6));
    }
  }
  return result;
}
