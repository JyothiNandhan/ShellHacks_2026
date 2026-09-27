import type { PiiEvent } from "@promptshield/engine";
import { request } from "./messages";
import { buildTextModel } from "./editor/textModel";
import type { Editor } from "./sites";
import { siteAdapter } from './sites';
import { identifyMessage, type Counts } from './activity';

const selectors = {
  chatgpt: '[data-message-author-role="user"], [data-chatgpt-search-unit-key$=":user"]',
  claude: '[data-testid="user-message"]',
  gemini: "user-query, .user-query",
};
const normalize = (text: string) => text.replace(/\s+/g, " ").trim();
// Count only after a new/changed user-message bubble contains the checked text.
// A clicked button or cleared composer alone is not evidence of a send.
export function observeSentPrompt(
  editor: Editor,
  text: string,
  site: keyof typeof selectors,
  events: PiiEvent[],
  onConfirmed = () => {},
  attachmentNames: string[] = [],
): () => void {
  const expected = normalize(text);
  const startingConversation = siteAdapter()?.convId();
  if (!expected && !attachmentNames.length) return () => {};
  const epoch = request<string>({ type: 'ACTIVITY_EPOCH' });
  void epoch.catch(() => {});
  const selector = selectors[site];
  const matches = () =>
    Array.from(document.querySelectorAll(selector)).filter((el) => {
      const value = normalize(el.textContent ?? "");
      return (!expected || value === expected || value.endsWith(expected) || value.includes(expected)) && attachmentNames.every(name => value.includes(normalize(name)));
    }).length;
  const before = matches();
  let stopped = false;
  const id = crypto.randomUUID();
  const stop = () => {
    if (stopped) return;
    stopped = true;
    observer.disconnect();
    clearInterval(timer);
    clearTimeout(expiry);
  };
  const check = () => {
    if (stopped) return;
    const currentConversation = siteAdapter()?.convId();
    if (startingConversation !== 'new' && currentConversation !== startingConversation) { stop(); return; }
    const sent = matches() > before;
    if (sent) {
      stop();
      onConfirmed();
      // Wait briefly for a new chat's URL to receive its conversation ID.
      void (async () => {
        await new Promise(resolve => setTimeout(resolve, 400));
        const adapter = siteAdapter();
        if (!adapter || adapter.id !== site) return;
        const conversationId = currentConversation && currentConversation !== 'new' ? currentConversation : adapter.convId() === 'new' ? `new:${id}` : adapter.convId();
        const counts: Counts = {};
        for (const e of events) if (e.action !== 'renamed') counts[e.type] = (counts[e.type] ?? 0) + 1;
        const record = { ...await identifyMessage(site, conversationId, text + attachmentNames.map(n => `\n[Attachment: ${n}]`).join(''), before), site, counts, ts: Date.now() };
        await request({ type: 'ACTIVITY_RECORD', record, epoch: await epoch });
      })().catch(() => {});
    } else if (
      editor.isConnected &&
      buildTextModel(editor).text.trim() &&
      normalize(buildTextModel(editor).text) !== expected
    ) {
      stop(); // The user revised an unsent draft.
    }
  };
  const observer = new MutationObserver(check);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });
  const timer = setInterval(check, 300);
  const expiry = setTimeout(stop, 15000);
  return stop;
}
