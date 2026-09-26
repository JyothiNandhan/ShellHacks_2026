import test from 'node:test';
import assert from 'node:assert/strict';
import { startBackground, sanitizeEvents, trustedSite, gateSender } from '../../src/backgroundService.ts';

function signal() {
  const listeners = [];
  return { addListener(fn) { listeners.push(fn); }, removeListener(fn) { const index = listeners.indexOf(fn); if (index >= 0) listeners.splice(index, 1); }, listeners };
}
function setup() {
  const area = () => {
    const data = {};
    return { data, async get(keys) { await new Promise(r => setImmediate(r)); return Object.fromEntries((Array.isArray(keys) ? keys : [keys]).map(k => [k, structuredClone(data[k])])); }, async set(values) { await new Promise(r => setImmediate(r)); Object.assign(data, structuredClone(values)); }, async setAccessLevel() {} };
  };
  const sent = [], contexts = [];
  let creates = 0;
  globalThis.chrome = {
    runtime: { id: 'test-extension', getURL: path => `chrome-extension://test-extension/${path.replace(/^\//, '')}`, onMessage: signal(), onInstalled: signal(), async getContexts() { return contexts; }, async sendMessage(message) { sent.push(message); return { ok: true, value: { findings: [], topics: [] } }; } },
    storage: { local: area(), session: area() },
    tabs: { onRemoved: signal(), async sendMessage(...args) { sent.push(args); } },
    offscreen: { Reason: { WORKERS: 'WORKERS' }, async createDocument() { creates++; await new Promise(r => setImmediate(r)); contexts.push({}); } },
  };
  startBackground();
  const sender = { id: chrome.runtime.id, url: 'https://chatgpt.com/c/a', tab: { id: 1 }, frameId: 0, documentId: 'doc-1' };
  const message = (payload, from = sender) => new Promise((resolve, reject) => {
    const handler = chrome.runtime.onMessage.listeners[0];
    const keep = handler({ ...payload, target: 'background' }, from, resolve);
    if (keep !== true) reject(new Error('Not handled'));
  });
  return { sender, message, sent, creates: () => creates };
}
test('event serialization strips values and rejects unrecognized actions', () => {
  const [result] = sanitizeEvents([{ type: 'EMAIL', site: 'chatgpt', source: 'paste', action: 'renamed', value: 'private@example.com', key: 'private', ts: 0 }]);
  assert.deepEqual(Object.keys(result).sort(), ['action', 'site', 'source', 'ts', 'type']);
  assert.ok(result.ts > 0);
  assert.throws(() => sanitizeEvents([{ ...result, action: 'upload' }]));
});
test('only top-level protected HTTPS pages are accepted', () => {
  setup();
  assert.equal(trustedSite({ url: 'https://chatgpt.com/c/a', tab: { id: 1 }, frameId: 0 }), true);
  for (const url of ['https://chatgpt.com.evil.test/', 'http://chatgpt.com/', 'https://example.com/']) assert.equal(trustedSite({ url, tab: { id: 1 } }), false);
  assert.equal(trustedSite({ url: 'https://chatgpt.com/', tab: { id: 1 }, frameId: 2 }), false);
  assert.equal(gateSender({ url: 'https://example.com/gate.html?id=a' }, 'a'), false);
});
test('concurrent tab events are serialized, bounded, and contain no values', async () => {
  const { message } = setup();
  const event = { type: 'EMAIL', site: 'chatgpt', source: 'typed', action: 'as_is', value: 'private' };
  chrome.storage.local.data.events = Array.from({ length: 4999 }, () => ({ ...event, value: undefined }));
  const replies = await Promise.all(Array.from({ length: 20 }, () => message({ type: 'LOG_EVENTS', events: [event] })));
  assert.ok(replies.every(r => r.ok));
  assert.equal(chrome.storage.local.data.events.length, 5000);
  assert.equal(chrome.storage.local.data.events.slice(-20).filter(e => 'value' in e).length, 0);
});
test('concurrent approval writes merge and Undo removes only its value', async () => {
  const { message } = setup();
  const key = 'approved:chatgpt:a';
  await Promise.all(['EMAIL|a', 'EMAIL|b'].map(value => message({ type: 'APPROVAL_UPDATE', key, add: [value] })));
  assert.deepEqual(new Set(chrome.storage.session.data[key]), new Set(['EMAIL|a', 'EMAIL|b']));
  await message({ type: 'APPROVAL_UPDATE', key, remove: ['EMAIL|a'] });
  assert.deepEqual(chrome.storage.session.data[key], ['EMAIL|b']);
  assert.equal((await message({ type: 'SESSION_GET', key: 'approved:claude:a' })).ok, false);
});
test('mapper writes detect cross-tab placeholder collisions', async () => {
  const { message } = setup();
  const key = 'map:chatgpt:a';
  assert.equal((await message({ type: 'MAP_SAVE', key, value: { a: 'PERSON_1' } })).ok, true);
  assert.equal((await message({ type: 'MAP_SAVE', key, value: { b: 'PERSON_1' } })).ok, false);
  assert.deepEqual(chrome.storage.session.data[key], { a: 'PERSON_1' });
});
test('gate payload is available only to the matching extension frame in the originating tab', async () => {
  const { message, sender, sent } = setup();
  const gateId = '12345678-1234-1234-1234-123456789abc';
  const payload = { mode: 'paste', title: 'Found', items: [{ value: 'private@example.com' }], topics: [] };
  assert.equal((await message({ type: 'GATE_OPEN', gateId, payload })).ok, true);
  assert.equal((await message({ type: 'GATE_GET', gateId })).ok, false);
  const gate = { ...sender, url: `${chrome.runtime.getURL('gate.html')}?id=${gateId}`, frameId: 10 };
  assert.equal((await message({ type: 'GATE_GET', gateId }, { ...gate, tab: { id: 2 } })).ok, false);
  assert.deepEqual((await message({ type: 'GATE_GET', gateId }, gate)).value, payload);
  assert.equal((await message({ type: 'GATE_CHOICE', gateId, choice: 'secondary' }, gate)).ok, true);
  assert.deepEqual(sent.at(-1), [1, { type: 'GATE_RESULT', gateId, choice: 'secondary' }, { documentId: 'doc-1' }]);
  assert.equal((await message({ type: 'GATE_GET', gateId }, gate)).ok, false);
});
test('simultaneous local processing requests create one offscreen document', async () => {
  const { message, creates, sent } = setup();
  const replies = await Promise.all(Array.from({ length: 8 }, () => message({ type: 'DETECT_FULL', text: 'test' })));
  assert.ok(replies.every(r => r.ok)); assert.equal(creates(), 1);
  assert.ok(sent.every(m => m.target === 'offscreen'));
});

test('live totals change only on confirmed sends, deduplicate, and reset without losing settings', async()=>{
 const {message,sender}=setup();
 const website={...sender,url:'https://www.mindyourprompt.us/scan'};
 const event={type:'EMAIL',site:'chatgpt',source:'typed',action:'as_is',value:'private@example.com'};
 chrome.storage.local.data.settings={marker:true};
 await message({type:'LOG_EVENTS',events:[event]});
 assert.equal((await message({type:'GET_LIVE_STATS'},website)).value.prompts,0);
 assert.equal((await message({type:'GET_LIVE_STATS'},website)).value.score,100);
 const payload={type:'LOG_SENT_EVENTS',id:'12345678-1234-1234-1234-123456789abc',events:[event],conversation:'abc-123'};
 await Promise.all([message(payload),message(payload)]);
 const stats=(await message({type:'GET_LIVE_STATS'},website)).value;
 assert.equal(stats.prompts,1);assert.equal(stats.shared,1);assert.equal(stats.score,97);
 assert.equal(stats.conversations,1);assert.deepEqual(stats.categories,['EMAIL']);
 await message({...payload,id:'22345678-1234-1234-1234-123456789abc'});
 assert.equal((await message({type:'GET_LIVE_STATS'},website)).value.conversations,1);
 assert.ok(!JSON.stringify(chrome.storage.local.data.sentEvents).includes('private@example.com'));
 assert.ok(!('events' in stats));
 assert.equal((await message({type:'GET_LIVE_STATS'},{...website,url:'https://evil.test/'})).ok,false);
 const reset=(await message({type:'RESET_LIVE_STATS'},website)).value;
 assert.equal(reset.score,100);assert.equal(reset.conversations,0);assert.equal(reset.shared,0);
 assert.equal(chrome.storage.local.data.sentPrompts,0);
 assert.deepEqual(chrome.storage.local.data.settings,{marker:true});
});
