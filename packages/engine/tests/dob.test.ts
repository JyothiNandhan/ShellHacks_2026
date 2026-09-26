import { expect, it } from 'vitest';
import { find } from '../src/rules/dob';
it('dob: exact positive offsets and negative boundary', () => {
  const text = "DOB 1997-01-15";
  for(let i=0;i<2;i++) {
    const found=find(text); expect(found.map(f=>f.value)).toEqual(["1997-01-15"]);
    for(const f of found) expect(text.slice(f.start,f.end)).toBe(f.value);
  }
  expect(find("meeting 1997-01-15")).toEqual([]);
});
