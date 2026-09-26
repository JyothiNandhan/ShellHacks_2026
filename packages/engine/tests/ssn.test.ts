import { expect, it } from 'vitest';
import { find } from '../src/rules/ssn';
it('ssn: exact positive offsets and negative boundary', () => {
  const text = "ssn 123-45-6789";
  for(let i=0;i<2;i++) {
    const found=find(text); expect(found.map(f=>f.value)).toEqual(["123-45-6789"]);
    for(const f of found) expect(text.slice(f.start,f.end)).toBe(f.value);
  }
  expect(find("000-45-6789")).toEqual([]);
});
