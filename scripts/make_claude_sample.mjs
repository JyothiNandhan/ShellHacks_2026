// Converts the synthetic ChatGPT-format fixture into Claude's conversations.json format.
// Synthetic data only. Usage: node scripts/make_claude_sample.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const source = JSON.parse(readFileSync(new URL('fixtures/fake-export/conversations.json', root), 'utf8'));
const iso = (seconds) => new Date(seconds * 1000).toISOString();

const conversations = source.map((conv) => {
  const nodes = Object.values(conv.mapping)
    .filter((n) => n.message && ['user', 'assistant'].includes(n.message.author.role))
    .sort((a, b) => (a.message.create_time ?? 0) - (b.message.create_time ?? 0));
  return {
    uuid: conv.conversation_id ?? conv.id,
    name: conv.title,
    created_at: iso(conv.create_time),
    updated_at: iso(conv.update_time ?? conv.create_time),
    chat_messages: nodes.map((n) => {
      const text = (n.message.content.parts ?? []).filter((p) => typeof p === 'string').join('\n');
      return {
        uuid: n.message.id,
        sender: n.message.author.role === 'user' ? 'human' : 'assistant',
        text,
        content: [{ type: 'text', text }],
        created_at: iso(n.message.create_time ?? conv.create_time),
      };
    }),
  };
});

writeFileSync(new URL('apps/web/public/sample/claude-conversations.json', root), JSON.stringify(conversations));
console.log(`Wrote ${conversations.length} synthetic Claude conversations.`);
