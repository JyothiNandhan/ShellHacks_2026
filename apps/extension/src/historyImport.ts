import { detectFast, DEFAULT_SETTINGS, type Settings, type Site } from '@promptshield/engine';
import { identifyMessage, normalizePrompt, type ActivityRecord, type Counts } from './activity';
type Row = Record<string, any>;
const object = (v: unknown): Row | null => v !== null && typeof v === 'object' && !Array.isArray(v) ? v as Row : null;
export interface HistoryMessage { site: Site; conversationId: string; text: string; ts: number; messageId: string }
export function parseHistory(data: unknown): HistoryMessage[] {
  const root = object(data);
  const rows = Array.isArray(data) ? data : Array.isArray(root?.conversations) ? root.conversations : root?.chat_messages ? [root] : [];
  const result: HistoryMessage[] = [], seen = new Set<string>();
  const add = (m: HistoryMessage) => {
    const key = `${m.site}|${m.conversationId}|${m.messageId}`;
    if (!m.text.trim() || seen.has(key)) return;
    if (m.text.length > 100000) throw new Error('A message is too large to scan. Please select a smaller export.');
    seen.add(key); result.push(m);
    if (result.length > 20000) throw new Error('Choose an export with at most 20,000 user messages.');
  };
  const timestamp = (value: unknown) => { const n = typeof value === 'number' ? value * 1000 : Date.parse(String(value)); return Number.isFinite(n) && n > 0 ? n : 0; };
  for (const value of rows) {
    const r = object(value); if (!r) continue;
    if (object(r.mapping) && typeof (r.conversation_id ?? r.id) === 'string') {
      for (const [id, v] of Object.entries(r.mapping)) {
        const m = object(object(v)?.message);
        if (m?.author?.role !== 'user' || !Array.isArray(m.content?.parts)) continue;
        add({ site: 'chatgpt', conversationId: r.conversation_id ?? r.id, messageId: String(m.id ?? id), text: m.content.parts.filter((p: unknown) => typeof p === 'string').join('\n'), ts: timestamp(m.create_time ?? r.create_time) });
      }
    } else if (Array.isArray(r.chat_messages) && typeof (r.uuid ?? r.id) === 'string') {
      for (const [index, v] of r.chat_messages.entries()) {
        const m = object(v); if (!m || m.sender !== 'human') continue;
        const text = typeof m.text === 'string' ? m.text : Array.isArray(m.content) ? m.content.filter((b: Row) => b?.type === 'text' && typeof b.text === 'string').map((b: Row) => b.text).join('\n') : '';
        add({ site: 'claude', conversationId: r.uuid ?? r.id, messageId: String(m.uuid ?? m.id ?? index), text, ts: timestamp(m.created_at ?? r.created_at) });
      }
    } else if (Array.isArray(r.products) && r.products.some((p: unknown) => ['Gemini', 'Gemini Apps', 'Bard'].includes(String(p))) && typeof r.title === 'string' && /^Prompted\s+/i.test(r.title)) {
      let id = `activity:${String(r.time)}:${r.title}`;
      try { const url = new URL(r.titleUrl); if (url.hostname === 'gemini.google.com' && /^\/app\/[^/]+$/.test(url.pathname)) id = url.pathname.split('/')[2]; } catch { /* Takeout sometimes omits thread IDs. */ }
      add({ site: 'gemini', conversationId: id, messageId: String(r.time) + r.title, text: r.title.replace(/^Prompted\s+/i, ''), ts: timestamp(r.time) });
    }
  }
  if (!result.length) throw new Error('No user messages found. Choose ChatGPT conversations.json, Claude conversations JSON, or Gemini MyActivity.json.');
  return result.sort((a, b) => a.ts - b.ts);
}
export async function scanHistory(data: unknown, settings: Settings = DEFAULT_SETTINGS, progress: (done: number, total: number) => void = () => {}) {
  const messages = parseHistory(data), occurrences = new Map<string, number>(), records: ActivityRecord[] = [];
  for (const [index, message] of messages.entries()) {
    const identity = JSON.stringify([message.site, message.conversationId, normalizePrompt(message.text)]);
    const occurrence = occurrences.get(identity) ?? 0; occurrences.set(identity, occurrence + 1);
    const counts: Counts = {};
    // Historical disclosure counts include always-allowed details: those were still shared.
    for (const finding of detectFast(message.text, { ...settings, enabledTypes: DEFAULT_SETTINGS.enabledTypes }).findings) counts[finding.type] = (counts[finding.type] ?? 0) + 1;
    records.push({ ...await identifyMessage(message.site, message.conversationId, message.text, occurrence), site: message.site, counts, ts: message.ts });
    if (index % 25 === 0) progress(index + 1, messages.length);
  }
  progress(messages.length, messages.length);
  return records;
}
