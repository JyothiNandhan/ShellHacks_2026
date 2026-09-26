import { DEFAULT_SETTINGS, type PiiEvent } from '@promptshield/engine';
import type { GatePayload } from './api';

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
  void access.catch(() => {});
  chrome.runtime.onInstalled.addListener(() => {
    void serial(async () => {
      const existing = await chrome.storage.local.get(['settings', 'events']);
      if (!existing.settings) await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
      if (!existing.events) await chrome.storage.local.set({ events: [] });
    });
  });
  const ensureOffscreen = async () => {
    if (!creating) creating = (async () => {
      const contexts = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT' as chrome.runtime.ContextType], documentUrls: [chrome.runtime.getURL('offscreen.html')] });
      if (!contexts.length) await chrome.offscreen.createDocument({ url: 'offscreen.html', reasons: [chrome.offscreen.Reason.WORKERS], justification: 'Run a local AI model and read files without sending anything off the device' });
    })().finally(() => { creating = undefined; });
    await creating;
  };
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
      if (!trustedSite(sender)) throw new Error('Invalid sender');
      switch (message.type) {
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
