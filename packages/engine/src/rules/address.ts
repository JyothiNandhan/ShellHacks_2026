import { matches, makeFinding } from '../util';
const street = /(?<!\w)\d{1,6}[ \t]+(?:[A-Z0-9][A-Z0-9’'-]*[ \t]+){1,4}(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Way|Place|Pl|Terrace|Circle|Highway|Hwy)\b\.?(?:[ ,]+(?:Apt|Suite|Unit|#)\.?[ \t]*[\w-]+)?(?:,[ \t]*[A-Z][a-z]+(?:[ \t][A-Z][a-z]+){0,2},[ \t]*[A-Z]{2}\b(?:[ \t]+\d{5}(?:-\d{4})?)?)?/gi;
const phrase = /\b(?:my address is|my address:|address:|i live at|i live on)[ \t]+([^\r\n]{1,80})/gi;
// Free-text capture ends where the next clause starts ("... Jersey City and my number is ...").
const clauseEnd = /[ \t]+(?:and|but|so|or|because|if|then)[ \t]|[;!?]/i;
export function find(text: string) {
  phrase.lastIndex = 0;
  return [...matches(text, street, 'ADDRESS'), ...Array.from(text.matchAll(phrase), m => {
    const cut = m[1].search(clauseEnd);
    const value = (cut > 0 ? m[1].slice(0, cut) : m[1]).trimEnd().replace(/[,.]$/, ''); const start = m.index! + m[0].indexOf(m[1]);
    return makeFinding('ADDRESS', text, start, start + value.length);
  })];
}
