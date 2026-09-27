import { expect, it } from 'vitest';
import { aggregateTokens, chunkText } from '../src/ner';
it('aggregates word pieces, averages scores and preserves repeated-name offsets', () => {
  const text='Priya said Priya Sharma lives in Hyderabad.';
  const entities=aggregateTokens(text,[{entity:'O',word:'Priya',score:1,index:1},{entity:'O',word:'said',score:1,index:2},{entity:'B-PER',word:'Pri',score:.9,index:3},{entity:'I-PER',word:'##ya',score:1,index:4},{entity:'I-PER',word:'Sharma',score:.95,index:5},{entity:'O',word:'lives',score:1,index:6},{entity:'O',word:'in',score:1,index:7},{entity:'B-LOC',word:'Hyderabad',score:.99,index:8}]);
  expect(entities.map(e=>text.slice(e.start,e.end))).toEqual(['Priya Sharma','Hyderabad']); expect(entities[0].start).toBe(11);
});
it('resets on B labels and rejects low-confidence and miscellaneous entities', () => {
  expect(aggregateTokens('Priya, Rahul Miami Test',[{entity:'B-PER',word:'Priya',score:.99},{entity:'O',word:',',score:1},{entity:'B-PER',word:'Rahul',score:.99},{entity:'B-LOC',word:'Miami',score:.89},{entity:'B-MISC',word:'Test',score:1}]).map(e=>e.type)).toEqual(['PERSON','PERSON']);
});
it('joins B-labelled continuation pieces seen in real bert-base-NER output', () => {
  const text='Priya, Rahul';
  const entities=aggregateTokens(text,[{entity:'B-PER',word:'P',score:.99,index:1},{entity:'B-PER',word:'##riya',score:.95,index:2},{entity:'O',word:',',score:1,index:3},{entity:'B-PER',word:'Ra',score:.99,index:4},{entity:'B-PER',word:'##hul',score:.95,index:5}]);
  expect(entities.map(e=>text.slice(e.start,e.end))).toEqual(['Priya','Rahul']);
});
it('keeps O-labelled word pieces inside the name (real output for "Bindhu")', () => {
  const text='I talked to Bindhu yesterday';
  const entities=aggregateTokens(text,[{entity:'O',word:'I',score:1},{entity:'O',word:'talked',score:1},{entity:'O',word:'to',score:1},{entity:'B-PER',word:'Bin',score:.98},{entity:'I-PER',word:'##dh',score:.76},{entity:'O',word:'##u',score:.8},{entity:'O',word:'yesterday',score:1}]);
  expect(entities.map(e=>text.slice(e.start,e.end))).toEqual(['Bindhu']);
});
it('accepts low-confidence capitalized names at 0.6 (real output for "Rohith")', () => {
  const text='Rohith and team';
  const entities=aggregateTokens(text,[{entity:'B-PER',word:'R',score:1},{entity:'I-PER',word:'##oh',score:.46},{entity:'B-PER',word:'##ith',score:.54},{entity:'O',word:'and',score:1},{entity:'O',word:'team',score:1}]);
  expect(entities.map(e=>text.slice(e.start,e.end))).toEqual(['Rohith']);
  expect(aggregateTokens('rohith and team',[{entity:'B-PER',word:'rohith',score:.7}])).toEqual([]);
});
it('expands partial pieces to whole words, joins space-separated names and drops possessives', () => {
  const text="Ask Sai Chetan's team";
  const entities=aggregateTokens(text,[{entity:'B-PER',word:'Sai',score:.99},{entity:'B-PER',word:'Chet',score:.9}]);
  expect(entities.map(e=>text.slice(e.start,e.end))).toEqual(['Sai Chetan']);
});
it('chunks long text with exact offsets and no dropped characters', () => {
  const text=('A short sentence. Another line!\n').repeat(200)+'x'.repeat(1700)+'😀';
  const chunks=chunkText(text); expect(chunks.map(c=>c.text).join('')).toBe(text);
  for(const c of chunks) { expect(c.text.length).toBeLessThanOrEqual(1500); expect(text.slice(c.start,c.start+c.text.length)).toBe(c.text); }
});
it('trims greetings and other stopwords the model glues onto a name', () => {
  const t1='Hi Rohith';
  expect(aggregateTokens(t1,[{entity:'B-PER',word:'Hi',score:.9,index:1},{entity:'I-PER',word:'R',score:.95,index:2},{entity:'I-PER',word:'##oh',score:.9,index:3},{entity:'I-PER',word:'##ith',score:.9,index:4}]).map(e=>t1.slice(e.start,e.end))).toEqual(['Rohith']);
  const t2='Hello Priya Sharma, thanks';
  expect(aggregateTokens(t2,[{entity:'B-PER',word:'Hello',score:.9},{entity:'B-PER',word:'Priya',score:.99},{entity:'I-PER',word:'Sharma',score:.99},{entity:'O',word:',',score:1},{entity:'O',word:'thanks',score:1}]).map(e=>t2.slice(e.start,e.end))).toEqual(['Priya Sharma']);
  const t3='Dear Krishna Thanks';
  expect(aggregateTokens(t3,[{entity:'B-PER',word:'Dear',score:.9,index:1},{entity:'I-PER',word:'Krishna',score:.99,index:2},{entity:'I-PER',word:'Thanks',score:.9,index:3}]).map(e=>t3.slice(e.start,e.end))).toEqual(['Krishna']);
  expect(aggregateTokens('Hi there',[{entity:'B-PER',word:'Hi',score:.99}])).toEqual([]);
});
