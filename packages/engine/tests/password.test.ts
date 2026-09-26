import { expect, it } from 'vitest';
import { find } from '../src/rules/password';
it('password: exact positive offsets and negative boundary', () => {
  const text = "password: \"hunter22\"";
  for(let i=0;i<2;i++) {
    const found=find(text); expect(found.map(f=>f.value)).toEqual(["hunter22"]);
    for(const f of found) expect(text.slice(f.start,f.end)).toBe(f.value);
  }
  expect(find("password missing")).toEqual([]);
});
