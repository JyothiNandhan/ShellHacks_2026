import { expect, it } from 'vitest';
import { aggregateTokens, chunkText } from '../src/ner';
it('aggregates word pieces, averages scores and preserves repeated-name offsets', () => {
  const text='Priya said Priya Sharma lives in Hyderabad.';
  const entities=aggregateTokens(text,[{entity:'O',word:'Priya',score:1,index:1},{entity:'O',word:'said',score:1,index:2},{entity:'B-PER',word:'Pri',score:.9,index:3},{entity:'I-PER',word:'##ya',score:1,index:4},{entity:'I-PER',word:'Sharma',score:.95,index:5},{entity:'O',word:'lives',score:1,index:6},{entity:'O',word:'in',score:1,index:7},{entity:'B-LOC',word:'Hyderabad',score:.99,index:8}]);
  expect(entities.map(e=>text.slice(e.start,e.end))).toEqual(['Priya Sharma','Hyderabad']); expect(entities[0].start).toBe(11);
});
it('resets on B labels and rejects low-confidence and miscellaneous entities', () => {
  expect(aggregateTokens('Priya Rahul Miami Test',[{entity:'B-PER',word:'Priya',score:.99},{entity:'B-PER',word:'Rahul',score:.99},{entity:'B-LOC',word:'Miami',score:.89},{entity:'B-MISC',word:'Test',score:1}]).map(e=>e.type)).toEqual(['PERSON','PERSON']);
});
it('joins B-labelled continuation pieces seen in real bert-base-NER output', () => {
  const entities=aggregateTokens('Priya Rahul',[{entity:'B-PER',word:'P',score:.99,index:1},{entity:'B-PER',word:'##riya',score:.95,index:2},{entity:'B-PER',word:'Ra',score:.99,index:3},{entity:'B-PER',word:'##hul',score:.95,index:4}]);
  expect(entities.map(e=>'Priya Rahul'.slice(e.start,e.end))).toEqual(['Priya','Rahul']);
});
it('chunks long text with exact offsets and no dropped characters', () => {
  const text=('A short sentence. Another line!\n').repeat(200)+'x'.repeat(1700)+'😀';
  const chunks=chunkText(text); expect(chunks.map(c=>c.text).join('')).toBe(text);
  for(const c of chunks) { expect(c.text.length).toBeLessThanOrEqual(1500); expect(text.slice(c.start,c.start+c.text.length)).toBe(c.text); }
});
