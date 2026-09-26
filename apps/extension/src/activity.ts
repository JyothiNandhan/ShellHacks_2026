import type { EntityType, Site } from '@promptshield/engine';

export const disclosureWeights: Record<EntityType, number> = {
  SSN: 15, CREDIT_CARD: 15, BANK: 15, API_KEY: 10, PASSWORD: 10,
  ADDRESS: 8, USER_TERM: 8, PHONE: 5, DATE_OF_BIRTH: 5, EMAIL: 3,
  PERSON: 2, IP_ADDRESS: 1, LOCATION: 1, ORGANIZATION: 1,
};
export type Counts = Partial<Record<EntityType, number>>;
export interface ActivityRecord {
  id: string; conversation: string; site: Site; counts: Counts; ts: number;
}
export interface Activity { version: 2; epoch: string; records: ActivityRecord[] }
export const emptyActivity = (): Activity => ({ version: 2, epoch: crypto.randomUUID(), records: [] });
export const normalizePrompt = (text: string) => text.replace(/\s+/g, ' ').trim();
export async function hash(value: string): Promise<string> {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))].map(v => v.toString(16).padStart(2, '0')).join('');
}
export async function identifyMessage(site: Site, conversationId: string, text: string, occurrence = 0) {
  const conversation = await hash(JSON.stringify([site, conversationId]));
  return { conversation, id: await hash(JSON.stringify([conversation, normalizePrompt(text), occurrence])) };
}
export function validateRecord(value: unknown): ActivityRecord {
  const r = value as ActivityRecord;
  if (!r || !/^[a-f0-9]{64}$/.test(r.id) || !/^[a-f0-9]{64}$/.test(r.conversation) || !['chatgpt', 'claude', 'gemini'].includes(r.site) || !Number.isFinite(r.ts) || r.ts < 0 || !r.counts || typeof r.counts !== 'object') throw new Error('Invalid activity record');
  const counts: Counts = {};
  for (const [type, count] of Object.entries(r.counts)) {
    if (!Object.hasOwn(disclosureWeights, type) || !Number.isInteger(count) || count < 0 || count > 10000) throw new Error('Invalid disclosure count');
    if (count) counts[type as EntityType] = count;
  }
  return { id: r.id, conversation: r.conversation, site: r.site, counts, ts: r.ts };
}
export function addActivity(current: Activity, incoming: ActivityRecord[], epoch: string): { activity: Activity; added: number } {
  if (current.epoch !== epoch) throw new Error('Activity was reset. Please try again.');
  const records = new Map(current.records.map(r => [r.id, r]));
  let added = 0;
  for (const input of incoming) {
    const record = validateRecord(input);
    if (!records.has(record.id)) { records.set(record.id, record); added++; }
  }
  if (records.size > 20000) throw new Error('This device has reached the 20,000-message activity limit. Export a backup and reset before adding more.');
  return { activity: { ...current, records: [...records.values()] }, added };
}
export function activityStats(activity: Activity) {
  const counts: Counts = {};
  for (const r of activity.records) for (const [type, count] of Object.entries(r.counts)) counts[type as EntityType] = (counts[type as EntityType] ?? 0) + count;
  const shared = Object.values(counts).reduce((a, b) => a + b, 0);
  const cost = Object.entries(counts).reduce((n, [type, count]) => n + disclosureWeights[type as EntityType] * count, 0);
  return { conversations: new Set(activity.records.map(r => r.conversation)).size, messages: activity.records.length, shared, categories: Object.keys(counts).length, score: Math.max(0, 100 - cost), counts };
}
