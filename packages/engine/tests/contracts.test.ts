import { expect, it } from 'vitest';
import { detectFast, detectFull, DEFAULT_SETTINGS, EXPLANATIONS, PlaceholderMapper, redactText, maskValue } from '../src/index';
import { makeFinding, normalizeKey, splitSentences } from '../src/util';
import { merge } from '../src/merge';
it('keeps exact shared defaults and explanations', () => {
  expect(DEFAULT_SETTINGS.enabledTypes).toHaveLength(13); expect(DEFAULT_SETTINGS.enabledTypes).not.toContain('ORGANIZATION');
  expect(Object.keys(EXPLANATIONS)).toHaveLength(17); expect(DEFAULT_SETTINGS.sites).toEqual(['chatgpt','claude','gemini']);
});
it('normalizes keys by entity type', () => {
  expect(normalizeKey('PHONE','+1 (305) 555-0123')).toBe('13055550123'); expect(normalizeKey('PERSON',' Priya ')).toBe('priya');
});
it('redacts saved international phones without leaving a leading plus sign', () => {
  const text='Call +91 98765 43210';
  const result=detectFast(text,{userTerms:{names:[],emails:[],phones:['+919876543210'],addresses:[],custom:[]}});
  expect(result.findings[0].source).toBe('user_terms');
  expect(redactText(text,result.findings,new PlaceholderMapper())).toBe('Call PHONE_1');
});
it('returns allowlisted values and respects disabled types', () => {
  const text = 'a@example.com and +1 305 555 0123';
  const r = detectFast(text, { allowlist: ['A@EXAMPLE.COM', '+1 (305) 555-0123'] });
  expect(r.findings).toHaveLength(2); expect(r.findings.every(f => f.allowlisted)).toBe(true);
  expect(redactText(text,r.findings,new PlaceholderMapper())).toBe(text);
  expect(detectFast(text,{ enabledTypes: [] }).findings).toEqual([]);
});
it('allocates placeholders in reading order and restores counters', () => {
  const text = 'a@example.com b@example.org A@example.com'; const mapper = new PlaceholderMapper();
  expect(redactText(text,detectFast(text).findings,mapper)).toBe('person_1@example.com person_2@example.org person_1@example.com');
  const restored = new PlaceholderMapper(mapper.toJSON());
  expect(restored.placeholderFor(detectFast('c@example.net').findings[0])).toBe('person_3@example.net');
  const snapshot = restored.toJSON(); snapshot['EMAIL|a@example.com']='changed';
  expect(restored.placeholderFor(detectFast('a@example.com').findings[0])).toBe('person_1@example.com');
});
it('resolves overlapping sources then severity then length', () => {
  const text = 'Priya Sharma';
  const a = makeFinding('PERSON',text,0,12,'rule'); const b = makeFinding('USER_TERM',text,0,5,'user_terms');
  expect(merge([a,b])).toEqual([b]);
  expect(merge([makeFinding('PERSON',text,0,5,'ner'),a])).toEqual([a]);
});
it('does not let a disabled type suppress an enabled one', () => {
  const r = detectFast('password: test@example.com', { enabledTypes: ['EMAIL'] });
  expect(r.findings.map(f=>f.type)).toEqual(['EMAIL']);
});
it('drops low confidence, stopword, invalid and default organization NER', async () => {
  const r = await detectFull('happy Acme x', undefined, async () => [
    {type:'PERSON',start:0,end:5,score:.99}, {type:'ORGANIZATION',start:6,end:10,score:.99},
    {type:'PERSON',start:11,end:12,score:.99}, {type:'LOCATION',start:6,end:10,score:.5},
    {type:'PERSON',start:-1,end:5,score:.99},
  ]); expect(r.findings).toEqual([]);
});
it('handles empty text without invoking inference', async () => {
  expect(await detectFull('',undefined,async()=>{throw new Error('unexpected');})).toEqual({findings:[],topics:[]});
});
it('keeps sentence offsets and distinct topic flags', () => {
  const text = 'I have anxiety and depression. My salary pays the lawyer.\nAnother line';
  for (const sentence of splitSentences(text)) expect(sentence.sentence).toBe(text.slice(sentence.start,sentence.end));
  expect(detectFast(text).topics.map(f=>f.topic)).toEqual(['HEALTH','FINANCE','LEGAL']);
});
it('masks structured values', () => {
  expect(maskValue('EMAIL','krishna@gmail.com')).toBe('k••••••@gmail.com');
  expect(maskValue('PHONE','3055551234')).toBe('•••-•••-1234');
  expect(maskValue('SSN','123-45-6789')).toBe('•••-••-6789');
  expect(maskValue('PASSWORD','abc')).toBe('••••••••');
  expect(maskValue('ADDRESS','123 Maple Street')).toBe('123 •••••');
});
