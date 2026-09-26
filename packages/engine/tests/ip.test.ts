import { expect, it } from 'vitest';
import { find } from '../src/rules/ip';
it('ip: exact positive offsets and negative boundary', () => {
  const text = "IP 192.168.0.12";
  for(let i=0;i<2;i++) {
    const found=find(text); expect(found.map(f=>f.value)).toEqual(["192.168.0.12"]);
    for(const f of found) expect(text.slice(f.start,f.end)).toBe(f.value);
  }
  expect(find("version 1.2.3.4")).toEqual([]);
});
