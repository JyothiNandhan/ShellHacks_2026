import { DEFAULT_SETTINGS, type PiiEvent } from '@promptshield/engine';
import type { GatePayload } from './api';
import { addActivity, activityStats, emptyActivity, type Activity } from './activity';

interface SentStorage { sentEvents?: PiiEvent[]; sentPrompts?: number; sentIds?: string[] }
interface Gate { payload: GatePayload; tabId: number; frameId: number; documentId?: string; expires: number }
const allowedHosts = new Set(['chatgpt.com', 'chat.openai.com', 'claude.ai', 'gemini.google.com']);
export function trustedSite(sender: chrome.runtime.MessageSender): boolean {
  try { const url = new URL(sender.url!); return url.protocol === 'https:' && allowedHosts.has(url.hostname) && sender.tab?.id !== undefined && (sender.frameId ?? 0) === 0; }
  catch { return false; }
}
export function gateSender(sender: chrome.runtime.MessageSender, gateId: string): boolean {
  try { const url = new URL(sender.url!); return url.origin === new URL(chrome.runtime.getURL('/')).origin && url.pathname === '/gate.html' && url.searchParams.get('id') === gateId; }
  catch { return false; }
}
export function sanitizeEvents(input: unknown): PiiEvent[] {
  if (!Array.isArray(input)) throw new Error('Invalid events');
  const types = new Set(['PERSON', 'EMAIL', 'PHONE', 'ADDRESS', 'SSN', 'CREDIT_CARD', 'BANK', 'API_KEY', 'PASSWORD', 'IP_ADDRESS', 'DATE_OF_BIRTH', 'LOCATION', 'ORGANIZATION', 'USER_TERM']);
  return input.slice(0, 5000).map(e => {
    if (!e || !types.has(e.type) || !['chatgpt', 'claude', 'gemini'].includes(e.site) || !['paste', 'file', 'typed'].includes(e.source) || !['renamed', 'as_is', 'allowlisted'].includes(e.action)) throw new Error('Invalid event');
    return { type: e.type, site: e.site, source: e.source, action: e.action, ts: Date.now() };
  });
}
export function startBackground(): void {
  const gates = new Map<string, Gate>();
  let creating: Promise<void> | undefined;
  let writes: Promise<unknown> = Promise.resolve();
  const serial = <T>(fn: () => Promise<T>): Promise<T> => {
    const next = writes.then(fn, fn); writes = next.catch(() => {}); return next;
  };
  const access = chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS' });
  const loadActivity = async () => {
    const data = (await chrome.storage.local.get<{ activity?: Activity }>('activity')).activity;
    if (data?.version === 2) return data;
    const activity = emptyActivity(); await chrome.storage.local.set({ activity }); return activity;
  };
  void access.catch(() => {});
  chrome.runtime.onInstalled.addListener(() => {
    void serial(async () => {
      const existing = await chrome.storage.local.get(['settings', 'events']);
      if (!existing.settings) await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
      if (!existing.events) await chrome.storage.local.set({ events: [] });
      await loadActivity();
    });
  });
  const ensureOffscreen = async () => {
    if (!creating) creating = (async () => {
      const contexts = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT' as chrome.runtime.ContextType], documentUrls: [chrome.runtime.getURL('offscreen.html')] });
      if (!contexts.length) await chrome.offscreen.createDocument({ url: 'offscreen.html', reasons: [chrome.offscreen.Reason.WORKERS], justification: 'Run a local AI model and read files without sending anything off the device' });
    })().finally(() => { creating = undefined; });
    await creating;
  };
  // Warm the local model using a fixed string; no chat contents leave the device.
  const warmModel = () => { void ensureOffscreen().then(() => chrome.runtime.sendMessage({ target: 'offscreen', type: 'DETECT_FULL', text: 'Warm up', opts: {} })).catch(() => {}); };
  chrome.runtime.onInstalled.addListener(warmModel);
  chrome.runtime.onStartup?.addListener(warmModel);
  const validKey = (key: unknown, sender: chrome.runtime.MessageSender) => {
    if (typeof key !== 'string' || !/^(map|approved):(chatgpt|claude|gemini):[^:]{1,200}$/.test(key)) throw new Error('Invalid session key');
    const host = new URL(sender.url!).hostname;
    const site = host === 'claude.ai' ? 'claude' : host === 'gemini.google.com' ? 'gemini' : 'chatgpt';
    if (key.split(':')[1] !== site) throw new Error('Wrong site');
    return key;
  };
  const replyToGate = async (gateId: string, choice: string) => {
    const gate = gates.get(gateId);
    if (!gate) return;
    gates.delete(gateId);
    await chrome.tabs.sendMessage(gate.tabId, { type: 'GATE_RESULT', gateId, choice }, gate.documentId ? { documentId: gate.documentId } : { frameId: gate.frameId }).catch(() => {});
  };
  chrome.tabs.onRemoved.addListener(tabId => { for (const [id, gate] of gates) if (gate.tabId === tabId) gates.delete(id); });
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.target !== 'background' || sender.id !== chrome.runtime.id) return;
    const run = async () => {
      for (const [id, gate] of gates) if (gate.expires < Date.now()) void replyToGate(id, 'cancel');
      if (message.type === 'GATE_GET' || message.type === 'GATE_CHOICE') {
        if (!gateSender(sender, message.gateId)) throw new Error('Invalid gate sender');
        const gate = gates.get(message.gateId);
        if (!gate || gate.tabId !== sender.tab?.id) throw new Error('This review expired. Close it and try again.');
        if (message.type === 'GATE_GET') return gate.payload;
        if (!['primary', 'secondary', 'cancel'].includes(message.choice)) throw new Error('Invalid choice');
        await replyToGate(message.gateId, message.choice); return;
      }
      const extensionPage = !!sender.url?.startsWith(chrome.runtime.getURL('')) && ['dashboard.html', 'popup.html', 'options.html'].some(page => sender.url!.split('?')[0] === chrome.runtime.getURL(page));
      if (['WEBSITE_STATS_GET', 'WEBSITE_STATS_RESET'].includes(message.type)) {
        const url = new URL(sender.url ?? '');
        if (!['https://www.mindyourprompt.us', 'https://mindyourprompt.us', 'http://localhost:3000'].includes(url.origin) || sender.tab?.id === undefined || (sender.frameId ?? 0) !== 0) throw new Error('Invalid website sender');
        return serial(async () => {
          let activity = (await chrome.storage.local.get<{ liveActivity?: Activity }>('liveActivity')).liveActivity ?? emptyActivity();
          if (message.type === 'WEBSITE_STATS_RESET') {
            activity = emptyActivity();
            await chrome.storage.local.set({ liveActivity: activity });
          }
          const since = typeof message.since === "number" && Number.isFinite(message.since) && message.since >= 0 ? message.since : 0;
          const stats = activityStats({ ...activity, records: activity.records.filter(record => record.ts > since) });
          return { since, cost: stats.cost, version: 2, prompts: stats.messages, conversations: stats.conversations, findings: stats.shared, shared: stats.shared, protected: 0, categories: Object.keys(stats.counts), score: stats.score };
        });
      }
      if (message.type === 'OPEN_DASHBOARD') {
        const url = new URL(sender.url ?? '');
        if (!extensionPage && !['https://www.mindyourprompt.us', 'https://mindyourprompt.us', 'http://localhost:3000'].includes(url.origin)) throw new Error('Invalid sender');
        await chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') }); return;
      }
      if (['ACTIVITY_GET', 'ACTIVITY_RESET', 'ACTIVITY_IMPORT', 'REGULATORY_QUESTION'].includes(message.type)) {
        if (!extensionPage) throw new Error('Open the installed extension dashboard.');
        if (message.type === 'REGULATORY_QUESTION') {
          if (typeof message.question !== 'string' || message.question.trim().length < 5 || message.question.length > 1000 || !['chatgpt','claude','gemini'].includes(message.tool)) throw new Error('Enter a question of 5–1,000 characters.');
          const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
          const response = await fetch(new URL('/api/privacy-question', base), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tool: message.tool, question: message.question.trim() }), signal: AbortSignal.timeout(60000), credentials: 'omit', redirect: 'error' });
          if (!response.ok) throw new Error('Privacy answers are unavailable. Check the local server and try again.');
          return response.json();
        }
        return serial(async () => {
          if (message.type === 'ACTIVITY_RESET') {
            const activity = emptyActivity();
            await chrome.storage.local.set({ activity, liveActivity: emptyActivity(), events: [], sentEvents: [], sentPrompts: 0, sentIds: [] });
            await chrome.storage.session.clear();
            return activity;
          }
          const activity = await loadActivity();
          if (message.type === 'ACTIVITY_GET') return activity;
          if (!Array.isArray(message.records) || message.records.length > 20000) throw new Error('Invalid import');
          const result = addActivity(activity, message.records, message.epoch);
          await chrome.storage.local.set({ activity: result.activity }); return result;
        });
      }
      if (!trustedSite(sender)) throw new Error('Invalid sender');
      switch (message.type) {
        case 'ACTIVITY_EPOCH': return serial(async () => (await loadActivity()).epoch);
        case 'ACTIVITY_RECORD': return serial(async () => {
          const activity = await loadActivity();
          const result = addActivity(activity, [message.record], message.epoch);
          const liveActivity = (await chrome.storage.local.get<{ liveActivity?: Activity }>('liveActivity')).liveActivity ?? emptyActivity();
          const live = result.added ? addActivity(liveActivity, [message.record], liveActivity.epoch).activity : liveActivity;
          await chrome.storage.local.set({ activity: result.activity, liveActivity: live });
        });
        case 'PING': return;
        case 'GATE_OPEN': {
          if (typeof message.gateId !== 'string' || !/^[\w-]{36}$/.test(message.gateId)) throw new Error('Invalid gate');
          for (const [id, gate] of gates) if (gate.tabId === sender.tab!.id) await replyToGate(id, 'cancel');
          gates.set(message.gateId, { payload: message.payload, tabId: sender.tab!.id!, frameId: sender.frameId ?? 0, documentId: sender.documentId, expires: Date.now() + 10 * 60_000 });
          return;
        }
        case 'GATE_CANCEL': {
          const gate = gates.get(message.gateId);
          if (gate && gate.tabId === sender.tab!.id && gate.frameId === (sender.frameId ?? 0)) await replyToGate(message.gateId, 'cancel');
          return;
        }
        case 'DETECT_FULL':
        case 'EXTRACT_FILE': {
          await ensureOffscreen();
          const result = await chrome.runtime.sendMessage({ ...message, target: 'offscreen' });
          if (!result?.ok) throw new Error('Local AI or file processing unavailable');
          return result.value;
        }
        case 'SESSION_GET': {
          await access;
          const key = validKey(message.key, sender);
          return (await chrome.storage.session.get(key))[key];
        }
        case 'MAP_SAVE': return serial(async () => {
          const key = validKey(message.key, sender);
          if (!key.startsWith('map:')) throw new Error('Invalid map key');
          const old = (await chrome.storage.session.get<Record<string, Record<string, string>>>(key))[key] ?? {};
          const next = message.value;
          if (!next || typeof next !== 'object' || Object.values(next).some(v => typeof v !== 'string')) throw new Error('Invalid map');
          for (const [k, v] of Object.entries(next)) {
            if ((old[k] && old[k] !== v) || Object.entries(old).some(([other, value]) => other !== k && value === v)) throw new Error('The conversation changed in another tab. Try again.');
          }
          await chrome.storage.session.set({ [key]: { ...old, ...next } });
        });
        case 'APPROVAL_UPDATE': return serial(async () => {
          const key = validKey(message.key, sender);
          if (!key.startsWith('approved:')) throw new Error('Invalid approval key');
          const values = new Set<string>((await chrome.storage.session.get<Record<string, string[]>>(key))[key] ?? []);
          for (const value of message.add ?? []) if (typeof value === 'string') values.add(value);
          for (const value of message.remove ?? []) values.delete(value);
          await chrome.storage.session.set({ [key]: [...values] });
        });
        case 'LOG_SENT_EVENTS': return serial(async () => {
          if(typeof message.id!=='string'|| !/^[a-f0-9-]{36}$/i.test(message.id)) throw new Error('Invalid send ID');
          const current=await chrome.storage.local.get<SentStorage>(['sentEvents','sentPrompts','sentIds']);
          const ids: string[]=current.sentIds??[]; if(ids.includes(message.id)) return;
          const events=sanitizeEvents(message.events);
          await chrome.storage.local.set({sentEvents:[...(current.sentEvents??[]),...events].slice(-5000),sentPrompts:(current.sentPrompts??0)+1,sentIds:[...ids,message.id].slice(-5000)});
        });
        case 'LOG_EVENTS': return serial(async () => {
          const events = sanitizeEvents(message.events);
          const current = (await chrome.storage.local.get<{ events?: PiiEvent[] }>('events')).events ?? [];
          await chrome.storage.local.set({ events: [...current, ...events].slice(-5000) });
        });
        default: throw new Error('Unknown request');
      }
    };
    void run().then(value => sendResponse({ ok: true, value }), () => sendResponse({ ok: false, error: 'PromptShield could not complete this action. Please try again.' }));
    return true;
  });
}
