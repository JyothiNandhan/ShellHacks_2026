import { describe, expect, it } from 'vitest';
import samples from '../../../fixtures/engine-samples.json';
import { detectFast, detectFull } from '../src/index';
import type { DetectOptions, NerEntity } from '../src/types';
describe('synthetic accuracy corpus', () => {
  for (const sample of samples.cases) it(sample.id, async () => {
    const opts = ('options' in sample ? sample.options : undefined) as DetectOptions | undefined;
    const fast = detectFast(sample.text, opts);
    expect(fast.findings.map(({ type, value }) => ({ type, value }))).toEqual(sample.expected);
    const full = await detectFull(sample.text, opts, async () => ('ner' in sample ? sample.ner ?? [] : []) as NerEntity[]);
    expect(full.findings.map(({ type, value }) => ({ type, value }))).toEqual('fullExpected' in sample ? sample.fullExpected : sample.expected);
    for (const result of [fast, full]) for (let i = 0; i < result.findings.length; i++) {
      const f = result.findings[i]; expect(f.value).toBe(sample.text.slice(f.start, f.end));
      expect(f.id).toBe(`${f.type}:${f.start}:${f.end}`);
      if (i) expect(result.findings[i - 1].end).toBeLessThanOrEqual(f.start);
    }
  });
  it('detects planted resume details', () => {
    const result = detectFast(samples.resume);
    for (const type of ['PERSON', 'EMAIL', 'PHONE', 'ADDRESS']) expect(result.findings.some(f => f.type === type)).toBe(true);
  });
  it('scans 10,000 characters in under 20 ms after warmup', () => {
    const text = samples.resume.repeat(5).slice(0, 10000);
    for (let i = 0; i < 10; i++) detectFast(text);
    const runs = Array.from({ length: 20 }, () => { const start = performance.now(); detectFast(text); return performance.now() - start; }).sort((a,b) => a-b);
    console.info(`detectFast 10k median: ${runs[10].toFixed(2)}ms`);
    expect(runs[10]).toBeLessThan(20);
  });
});
