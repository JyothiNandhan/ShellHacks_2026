import { expect, it } from 'vitest';
import { find } from '../src/rules/apiKey';
it('apiKey: exact positive offsets and negative boundary', () => {
  const text = "AKIA1234567890ABCDEF";
  for(let i=0;i<2;i++) {
    const found=find(text); expect(found.map(f=>f.value)).toEqual(["AKIA1234567890ABCDEF"]);
    for(const f of found) expect(text.slice(f.start,f.end)).toBe(f.value);
  }
  expect(find("AKIA123")).toEqual([]);
});
