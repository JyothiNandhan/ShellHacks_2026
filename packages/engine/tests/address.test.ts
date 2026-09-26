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
