import { expect, it } from 'vitest';
import { find } from '../src/rules/phone';
it('phone: exact positive offsets and negative boundary', () => {
  const text = "Call +91 98765 43210";
  for(let i=0;i<2;i++) {
    const found=find(text); expect(found.map(f=>f.value)).toEqual(["+91 98765 43210"]);
    for(const f of found) expect(text.slice(f.start,f.end)).toBe(f.value);
  }
  expect(find("order number 1234567890")).toEqual([]);
});
