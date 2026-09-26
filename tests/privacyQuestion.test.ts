import { expect, it, vi } from 'vitest';
import { answerPrivacyQuestion, questionHandlers } from '../apps/web/lib/server/privacyQuestion';
import { SnowflakeError } from '../apps/web/lib/server/snowflake';
const excerpt = { SOURCE_TITLE: 'Official privacy policy', SOURCE_URL: 'https://openai.com/policies/privacy-policy/', CHUNK_TEXT: 'You can delete chats.', TOOL: 'chatgpt' };
it('retrieves the asked question and returns only citations from retrieved sources', async () => {
  const client = { search: vi.fn().mockResolvedValue([excerpt]), complete: vi.fn().mockResolvedValue('{"answer":"You can delete chats.","source_numbers":[1]}') };
  const result = await answerPrivacyQuestion('chatgpt', 'Can I delete chats?', client);
  expect(client.search).toHaveBeenCalledWith('chatgpt', 'Can I delete chats?');
  expect(result.source).toBe('snowflake'); expect(result.citations).toEqual([{ title: excerpt.SOURCE_TITLE, url: excerpt.SOURCE_URL }]);
});
const post = (body: unknown, origin = 'chrome-extension://' + 'a'.repeat(32)) => new Request('http://localhost:3000/api/privacy-question', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin }, body: JSON.stringify(body) });
it('rejects unrelated origins, raw history fields, oversized bodies and invalid tools', async () => {
  const answer = vi.fn(); const handlers = questionHandlers(answer);
  expect((await handlers.POST(post({ tool: 'chatgpt', question: 'privacy?' }, 'https://evil.example'))).status).toBe(403);
  for (const body of [{ tool: 'chatgpt', question: 'privacy?', history: [] }, { tool: 'unknown', question: 'privacy?' }, { tool: 'chatgpt', question: 'a'.repeat(9000) }]) expect((await handlers.POST(post(body))).status).toBe(400);
  expect(answer).not.toHaveBeenCalled();
});
it('reports authentication failure without invented policy advice or leaked secrets', async () => {
  const handlers = questionHandlers(vi.fn().mockRejectedValue(new SnowflakeError('authentication')));
  const result = await (await handlers.POST(post({ tool: 'claude', question: 'Can I delete data?' }))).json();
  expect(result).toMatchObject({ source: 'unavailable', reason: 'authentication', citations: [] });
  expect(JSON.stringify(result)).not.toContain('secret-token');
});
it('rate limits and allows requests again after the window expires', async () => {
  let time = 0; const handlers = questionHandlers(vi.fn().mockResolvedValue({ answer: 'answer', citations: [], source: 'snowflake' }), () => time);
  for (let i = 0; i < 12; i++) expect((await handlers.POST(post({ tool: 'gemini', question: 'Can I delete data?' }))).status).toBe(200);
  expect((await handlers.POST(post({ tool: 'gemini', question: 'Can I delete data?' }))).status).toBe(429);
  time = 60001; expect((await handlers.POST(post({ tool: 'gemini', question: 'Can I delete data?' }))).status).toBe(200);
});
