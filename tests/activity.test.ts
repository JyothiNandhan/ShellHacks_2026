import { expect, it } from 'vitest';
import { activityStats, addActivity, emptyActivity, identifyMessage, validateRecord } from '../apps/extension/src/activity';
import { parseHistory, scanHistory } from '../apps/extension/src/historyImport';

it('starts and resets at 0/0/0/100, retaining no stale imports', async () => {
  const initial = emptyActivity();
  expect(activityStats(initial)).toMatchObject({ conversations: 0, shared: 0, categories: 0, score: 100 });
  const record = { ...await identifyMessage('chatgpt', 'chat-1', 'hello'), site: 'chatgpt' as const, ts: 1, counts: { EMAIL: 2 } };
  const next = addActivity(initial, [record], initial.epoch).activity;
  expect(activityStats(next)).toMatchObject({ conversations: 1, shared: 2, categories: 1, score: 94 });
  const reset = emptyActivity();
  expect(() => addActivity(reset, [record], initial.epoch)).toThrow('reset');
  expect(activityStats(reset).score).toBe(100);
});
it('counts unique chats, individual disclosures and distinct categories; floors score', async () => {
  const a = emptyActivity();
  const records = await Promise.all(['first', 'second'].map(async text => ({ ...await identifyMessage('chatgpt', 'one', text), site: 'chatgpt' as const, ts: 1, counts: { SSN: 5, EMAIL: 1 } })));
  expect(activityStats(addActivity(a, records, a.epoch).activity)).toMatchObject({ conversations: 1, messages: 2, shared: 12, categories: 2, score: 0 });
});
it('strips raw values, rejects unknown categories, and accepts only count metadata', async () => {
  const r = { ...await identifyMessage('claude', 'one', 'private'), site: 'claude', counts: { EMAIL: 1 }, ts: 1, text: 'private' };
  expect(validateRecord(r)).not.toHaveProperty('text');
  expect(() => validateRecord({ ...r, counts: { constructor: 1 } })).toThrow();
  expect(() => validateRecord({ ...r, counts: { EMAIL: -1 } })).toThrow();
});
const history = [{ id: 'one', mapping: {
  a: { message: { id: 'a', author: { role: 'user' }, content: { parts: ['Contact demo@example.com'] }, create_time: 1 } },
  b: { message: { id: 'b', author: { role: 'assistant' }, content: { parts: ['other@example.com'] } } },
} }];
it('scans only user messages locally, without persisting their text; deduplicates repeated imports and live sends', async () => {
  const records = await scanHistory(history);
  expect(records).toHaveLength(1);
  expect(records[0].counts.EMAIL).toBe(1);
  expect(JSON.stringify(records)).not.toContain('demo@example.com');
  const a = emptyActivity();
  const live = { ...await identifyMessage('chatgpt', 'one', 'Contact demo@example.com'), site: 'chatgpt' as const, ts: 1000, counts: { EMAIL: 1 } };
  const first = addActivity(a, [live], a.epoch).activity;
  expect(addActivity(first, records, a.epoch).added).toBe(0);
  expect(addActivity(addActivity(a, records, a.epoch).activity, records, a.epoch).added).toBe(0);
});
it('parses Claude and Gemini exports and distinguishes repeated messages', async () => {
  const claude = [{ uuid: 'chat', chat_messages: [{ uuid: 'a', sender: 'human', text: 'hello' }, { uuid: 'b', sender: 'human', text: 'hello' }, { sender: 'assistant', text: 'answer' }] }];
  const records = await scanHistory(claude);
  expect(records).toHaveLength(2); expect(records[0].id).not.toBe(records[1].id);
  expect(parseHistory([{ products: ['Gemini Apps'], title: 'Prompted hello', titleUrl: 'https://gemini.google.com/app/abc', time: '2026-09-26T10:00:00Z' }])[0]).toMatchObject({ site: 'gemini', conversationId: 'abc', text: 'hello' });
  expect(() => parseHistory({ token: 'unrelated' })).toThrow('No user messages');
});
