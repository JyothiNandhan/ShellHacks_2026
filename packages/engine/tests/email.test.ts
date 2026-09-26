import { expect, it } from 'vitest';
import { find } from '../src/rules/email';
it('email: exact positive offsets and negative boundary', () => {
  const text = "Email: demo@example.com";
  for(let i=0;i<2;i++) {
    const found=find(text); expect(found.map(f=>f.value)).toEqual(["demo@example.com"]);
    for(const f of found) expect(text.slice(f.start,f.end)).toBe(f.value);
  }
  expect(find("abc@example")).toEqual([]);
});
