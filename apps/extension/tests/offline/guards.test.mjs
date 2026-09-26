import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SETTINGS, detectFast } from '../fixtures/engine.ts';
import { getSettings } from '../../src/storage.ts';
import { initPasteGate } from '../../src/guards/pasteGate.ts';
import { initSendCheck } from '../../src/guards/sendCheck.ts';
import { getApprovals, invalidateApprovals } from '../../src/approvals.ts';
import { extractFile } from '../../src/api.ts';
import { rememberDetection } from '../../src/editor/detectionCache.ts';

class FakeElement extends EventTarget {
  constructor(tag = 'DIV') { super(); this.tagName = tag; this.isConnected = true; this.style = {}; this.dataset = {}; this.children = []; }
  closest(selector) { return selector === '[data-promptshield]' ? null : this; }
  matches() { return false; }
  getBoundingClientRect() { return { width: 400, height: 80 }; }
  setAttribute() {}
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children = nodes; }
  attachShadow() { return new FakeElement(); }
  remove() { this.isConnected = false; }
  focus() { globalThis.document.activeElement = this; }
}
class FakeTextarea extends FakeElement {
  constructor(value = '') { super('TEXTAREA'); this.value = value; this.selectionStart = value.length; this.selectionEnd = value.length; }
  setSelectionRange(start, end) { this.selectionStart = start; this.selectionEnd = end; }
  setRangeText(text, start, end) { this.value = this.value.slice(0, start) + text + this.value.slice(end); this.selectionStart = this.selectionEnd = start + text.length; }
}
class FakeInputEvent extends Event { constructor(type, props) { super(type, props); Object.assign(this, { data: props.data, inputType: props.inputType }); } }
class FakeKeyboardEvent extends Event { constructor(type, props) { super(type, props); Object.assign(this, { key: props.key, code: props.code }); } }
const tick = () => new Promise(resolve => setImmediate(resolve));
async function settle() { for (let i = 0; i < 15; i++) await tick(); }
async function setup() {
  globalThis.Element = globalThis.HTMLElement = FakeElement;
  globalThis.HTMLTextAreaElement = FakeTextarea;
  globalThis.InputEvent = FakeInputEvent;
  globalThis.KeyboardEvent = FakeKeyboardEvent;
  globalThis.window = new EventTarget();
  globalThis.location = { hostname: 'chatgpt.com', pathname: '/c/test' };
  globalThis.document = { documentElement: new FakeElement(), createElement: tag => new FakeElement(tag), activeElement: null, body: new FakeElement() };
  const settings = structuredClone(DEFAULT_SETTINGS), session = {}, events = [], requests = [];
  globalThis.guardTest = { gates: [], choose: async () => 'primary' };
  globalThis.chrome = {
    runtime: { async sendMessage(message) {
      requests.push(message);
      switch (message.type) {
        case 'DETECT_FULL': return guardTest.failNer ? { ok: false } : { ok: true, value: detectFast(message.text, settings) };
        case 'SESSION_GET': return { ok: true, value: session[message.key] };
        case 'MAP_SAVE': session[message.key] = message.value; break;
        case 'APPROVAL_UPDATE': session[message.key] = [...new Set([...(session[message.key] ?? []), ...(message.add ?? [])])].filter(v => !message.remove?.includes(v)); break;
        case 'LOG_EVENTS': events.push(...message.events); break;
        case 'EXTRACT_FILE': return { ok: true, value: { status: 'ok', text: new TextDecoder().decode(new Uint8Array(message.bytes)) } };
      }
      return { ok: true };
    } },
    storage: { local: { async get() { return { settings }; } } },
  };
  invalidateApprovals(); await getSettings();
  return { settings, session, events, requests };
}
function dispatch(type, editor, props = {}) {
  const event = new Event(type, { cancelable: true });
  for (const [key, value] of Object.entries({ target: editor, ...props })) Object.defineProperty(event, key, { value });
  window.dispatchEvent(event); return event;
}
function paste(editor, text) { return dispatch('paste', editor, { clipboardData: { getData: () => text } }); }
test('paste is stopped synchronously and only renamed text enters the editor', async () => {
  const { events, session } = await setup();
  const editor = new FakeTextarea('Hi '), cleanup = initPasteGate();
  const event = paste(editor, 'alex@example.com');
  assert.equal(event.defaultPrevented, true); assert.equal(editor.value, 'Hi ');
  await settle();
  assert.equal(editor.value, 'Hi person_1@example.com');
  assert.equal(guardTest.gates[0].items[0].value, 'alex@example.com');
  assert.equal(events.length, 1); assert.equal(events[0].action, 'renamed'); assert.equal(events[0].source, 'paste');
  assert.equal('value' in events[0], false); assert.ok(session['map:chatgpt:test']); cleanup();
});
test('cancel leaves editor and activity log unchanged', async () => {
  const { events, session } = await setup(); guardTest.choose = async () => 'cancel';
  const editor = new FakeTextarea('original'), cleanup = initPasteGate();
  paste(editor, 'alex@example.com'); await settle();
  assert.equal(editor.value, 'original'); assert.equal(events.length, 0); assert.equal(Object.keys(session).length, 0); cleanup();
});
test('insert as is approves findings and later sends retain the original event', async () => {
  const { events, session } = await setup(); guardTest.choose = async () => 'secondary';
  const editor = new FakeTextarea(), cleanup = initPasteGate();
  paste(editor, 'alex@example.com'); await settle(); cleanup();
  assert.equal(editor.value, 'alex@example.com'); assert.deepEqual(session['approved:chatgpt:test'], ['EMAIL|alex@example.com']);
  await getApprovals();
  const cleanupSend = initSendCheck(() => editor);
  const send = dispatch('keydown', editor, { key: 'Enter', shiftKey: false, isComposing: false });
  assert.equal(send.defaultPrevented, false); assert.equal(guardTest.gates.length, 1); assert.equal(events[0].action, 'as_is'); cleanupSend();
});
test('clean paste inserts normally without a review or events', async () => {
  const { events } = await setup(); const editor = new FakeTextarea(), cleanup = initPasteGate();
  paste(editor, 'hello world'); await settle();
  assert.equal(editor.value, 'hello world'); assert.equal(guardTest.gates.length, 0); assert.equal(events.length, 0); cleanup();
});
test('allowlisted paste never prompts and logs the allowlisted decision', async () => {
  const { settings, events } = await setup(); settings.allowlist.push('alex@example.com'); await getSettings();
  const editor = new FakeTextarea(), cleanup = initPasteGate();
  paste(editor, 'alex@example.com'); await settle();
  assert.equal(guardTest.gates.length, 0); assert.equal(editor.value, 'alex@example.com'); assert.equal(events[0].action, 'allowlisted'); cleanup();
});
test('reviewing a stale paste never overwrites new user text', async () => {
  const { events } = await setup(); let choose; guardTest.choose = () => new Promise(resolve => { choose = resolve; });
  const editor = new FakeTextarea(), cleanup = initPasteGate();
  paste(editor, 'alex@example.com'); await settle();
  editor.value = 'new draft'; choose('primary'); await settle();
  assert.equal(editor.value, 'new draft'); assert.equal(events.length, 0); cleanup();
});
test('Shift+Enter and composition are untouched while a sensitive Enter is gated', async () => {
  await setup(); guardTest.choose = async () => 'cancel';
  const editor = new FakeTextarea('alex@example.com'), cleanup = initSendCheck(() => editor);
  assert.equal(dispatch('keydown', editor, { key: 'Enter', shiftKey: true }).defaultPrevented, false);
  assert.equal(dispatch('keydown', editor, { key: 'Enter', isComposing: true }).defaultPrevented, false);
  assert.equal(dispatch('keydown', editor, { key: 'Enter' }).defaultPrevented, true);
  await settle(); assert.equal(guardTest.gates.length, 1); assert.equal(guardTest.gates[0].mode, 'send'); cleanup();
});
test('disabled sites leave paste and send events untouched', async () => {
  const { settings } = await setup(); settings.sites = []; await getSettings();
  const editor = new FakeTextarea('alex@example.com'), cleanPaste = initPasteGate(), cleanSend = initSendCheck(() => editor);
  assert.equal(paste(editor, 'alex@example.com').defaultPrevented, false);
  assert.equal(dispatch('keydown', editor, { key: 'Enter' }).defaultPrevented, false);
  cleanPaste(); cleanSend();
});
test('rename and send rewrites before replay and logs once', async () => {
  const { events } = await setup();
  const editor = new FakeTextarea('alex@example.com'), cleanup = initSendCheck(() => editor);
  const sent = []; editor.addEventListener('keydown', () => sent.push(editor.value));
  dispatch('keydown', editor, { key: 'Enter' }); await settle();
  assert.equal(editor.value, 'person_1@example.com');
  assert.deepEqual(sent, ['person_1@example.com']);
  assert.deepEqual(events.map(e => [e.source, e.action]), [['typed', 'renamed']]); cleanup();
});
test('send as is approves before replay', async () => {
  const { session, events } = await setup(); guardTest.choose = async () => 'secondary';
  const editor = new FakeTextarea('alex@example.com'), cleanup = initSendCheck(() => editor);
  let approvalAtSend; editor.addEventListener('keydown', () => { approvalAtSend = session['approved:chatgpt:test']; });
  dispatch('keydown', editor, { key: 'Enter' }); await settle();
  assert.deepEqual(approvalAtSend, ['EMAIL|alex@example.com']);
  assert.equal(events[0].action, 'as_is'); cleanup();
});
test('changing conversations during send review cancels the pending send', async () => {
  const { events } = await setup(); let choose; guardTest.choose = () => new Promise(resolve => { choose = resolve; });
  const editor = new FakeTextarea('alex@example.com'), cleanup = initSendCheck(() => editor); let sends = 0;
  editor.addEventListener('keydown', () => sends++);
  dispatch('keydown', editor, { key: 'Enter' }); await settle(); location.pathname = '/c/other'; choose('primary'); await settle();
  assert.equal(sends, 0); assert.equal(events.length, 0); assert.equal(editor.value, 'alex@example.com'); cleanup();
});
test('file bytes survive runtime serialization and oversized files return a reason', async () => {
  const { requests } = await setup();
  const result = await extractFile(new File(['héllo'], 'test.txt', { type: 'text/plain' }));
  assert.deepEqual(result, { status: 'ok', text: 'héllo' });
  const message = requests.find(m => m.type === 'EXTRACT_FILE');
  assert.ok(Array.isArray(message.bytes)); assert.equal(message.name, 'test.txt');
  assert.equal((await extractFile({ size: 17 * 1024 * 1024 })).status, 'unsupported');
});
test('cached NER findings still prompt when the next NER request fails', async () => {
  await setup(); guardTest.failNer = true; guardTest.choose = async () => 'cancel';
  const editor = new FakeTextarea('Zorvian'), cleanup = initSendCheck(() => editor);
  rememberDetection(editor, editor.value, { findings: [{ id: 'PERSON:0:7', type: 'PERSON', value: 'Zorvian', key: 'zorvian', start: 0, end: 7, severity: 'medium', source: 'ner', confidence: 0.95, allowlisted: false }], topics: [] });
  let sends = 0; editor.addEventListener('keydown', () => sends++);
  try {
    assert.equal(dispatch('keydown', editor, { key: 'Enter' }).defaultPrevented, true);
    await settle();
    assert.equal(sends, 0, 'A known sensitive name was sent without a review');
    assert.equal(guardTest.gates.length, 1);
  } finally { cleanup(); }
});
