import { expect, it } from 'vitest';
import { find } from '../src/rules/namePhrases';
it('namePhrases: exact positive offsets and negative boundary', () => {
  const text = "my name is krishna";
  for(let i=0;i<2;i++) {
    const found=find(text); expect(found.map(f=>f.value)).toEqual(["krishna"]);
    for(const f of found) expect(text.slice(f.start,f.end)).toBe(f.value);
  }
  expect(find("Call me later")).toEqual([]);
});
it('recognizes curly apostrophes in explicit name introductions', () => {
 for (const text of ['my name’s Krishna', 'I’m Rohith']) expect(find(text).map(f=>f.value)).toEqual([text.split(' ').at(-1)]);
 expect(find('I’m tired')).toEqual([]);
});
