import { expect, it } from 'vitest';
import { find } from '../src/rules/address';
it('address: exact positive offsets and negative boundary', () => {
  const text = "Mail to 123 Maple Street";
  for(let i=0;i<2;i++) {
    const found=find(text); expect(found.map(f=>f.value)).toEqual(["123 Maple Street"]);
    for(const f of found) expect(text.slice(f.start,f.end)).toBe(f.value);
  }
  expect(find("A short sentence.")).toEqual([]);
});
it('recognizes lowercase, uppercase and numbered street names with exact spans', () => {
 for (const text of ['send to 123 maple street', 'send to 123 MAPLE STREET', 'meet at 123 nw 8th st']) {
  const found = find(text); expect(found).toHaveLength(1);
  expect(found[0].value).toBe(text.slice(text.indexOf('123')));
  expect(text.slice(found[0].start, found[0].end)).toBe(found[0].value);
 }
 expect(find('I have 123 messages today')).toEqual([]);
});
