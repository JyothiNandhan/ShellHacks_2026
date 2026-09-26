import { expect, it } from 'vitest';
import { find } from '../src/rules/creditCard';
it('creditCard: exact positive offsets and negative boundary', () => {
  const text = "4111 1111 1111 1111";
  for(let i=0;i<2;i++) {
    const found=find(text); expect(found.map(f=>f.value)).toEqual(["4111 1111 1111 1111"]);
    for(const f of found) expect(text.slice(f.start,f.end)).toBe(f.value);
  }
  expect(find("4111 1111 1111 1112")).toEqual([]);
});
