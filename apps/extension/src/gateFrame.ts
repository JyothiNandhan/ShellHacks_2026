import type { GateChoice, GatePayload } from './api';
import { request } from './messages';
let closeActive: (() => void) | undefined;
export function cancelGate(): void { closeActive?.(); }
export async function openGate(payload: GatePayload): Promise<GateChoice> {
  cancelGate();
  const gateId = crypto.randomUUID();
  const host = document.createElement('div');
  host.dataset.promptshield = 'gate';
  host.style.cssText = 'all:initial;position:fixed;top:16px;right:16px;width:min(380px,calc(100vw - 32px));height:min(440px,calc(100vh - 32px));z-index:2147483647;';
  const shadow = host.attachShadow({ mode: 'closed' });
  const frame = document.createElement('iframe');
  frame.title = 'Mind your Prompt privacy review';
  frame.style.cssText = 'width:100%;height:100%;border:0;border-radius:16px;box-shadow:0 16px 64px #0005;background:#101013;';
  frame.src = `${chrome.runtime.getURL('gate.html')}?id=${gateId}`;
  shadow.append(frame);
  return new Promise<GateChoice>(resolve => {
    let finished = false;
    const finish = (choice: GateChoice) => {
      if (finished) return;
      finished = true; clearTimeout(timeout); clearInterval(heartbeat);
      chrome.runtime.onMessage.removeListener(onMessage);
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('pagehide', cancel);
      host.remove();
      if (closeActive === cancel) closeActive = undefined;
      void request({ type: 'GATE_CANCEL', gateId }).catch(() => {});
      resolve(choice);
    };
    const cancel = () => finish('cancel');
    const onMessage = (message: { type?: string; gateId?: string; choice?: GateChoice }, sender: chrome.runtime.MessageSender) => {
      if (sender.id === chrome.runtime.id && message.type === 'GATE_RESULT' && message.gateId === gateId && ['primary', 'secondary', 'cancel'].includes(message.choice ?? '')) finish(message.choice!);
    };
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); cancel(); } };
    const timeout = setTimeout(cancel, 10 * 60_000);
    // Messages keep the service worker's in-memory gate alive during a review.
    const heartbeat = setInterval(() => {
      if (host.isConnected) void request({ type: 'PING' }).catch(cancel);
      else cancel();
    }, 20_000);
    closeActive = cancel;
    chrome.runtime.onMessage.addListener(onMessage);
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('pagehide', cancel, { once: true });
    void request({ type: 'GATE_OPEN', gateId, payload }).then(() => {
      if (!finished) { document.documentElement.append(host); frame.focus(); }
    }, cancel);
  });
}
