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
