import type { PiiEvent } from "@promptshield/engine";
import { request } from "./messages";
import { buildTextModel } from "./editor/textModel";
import type { Editor } from "./sites";

const selectors = {
  chatgpt: '[data-message-author-role="user"]',
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
): () => void {
  const expected = normalize(text);
  if (!expected) return () => {};
  const selector = selectors[site];
  const matches = () =>
    Array.from(document.querySelectorAll(selector)).filter((el) => {
      const value = normalize(el.textContent ?? "");
      return value === expected || value.endsWith(expected);
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
    const sent = matches() > before;
    if (sent) {
      stop();
      onConfirmed();
      void request({ type: "LOG_SENT_EVENTS", id, events }).catch(() => {});
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
