import { defineContentScript } from 'wxt/utils/define-content-script';
import { request } from '../src/messages';
export default defineContentScript({
  matches: ['https://www.mindyourprompt.us/*', 'https://mindyourprompt.us/*', 'http://localhost:3000/*'],
  runAt: 'document_idle',
  main(ctx) {
    const announce = () => window.postMessage({ source: 'mindyourprompt-extension', type: 'READY' }, location.origin);
    const publishStats = async (reset = false) => {
      try {
        const stats = await request({ type: reset ? 'WEBSITE_STATS_RESET' : 'WEBSITE_STATS_GET' });
        window.postMessage({ source: 'mindyourprompt-extension', type: 'STATS', stats }, location.origin);
      } catch {
        window.postMessage({ source: 'mindyourprompt-extension', type: 'ERROR' }, location.origin);
      }
    };
    const changed = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'local' && changes.liveActivity) void publishStats();
    };
    chrome.storage.onChanged.addListener(changed);
    const receive = (event: MessageEvent) => {
      if (event.source !== window || event.origin !== location.origin || event.data?.source !== 'mindyourprompt-website') return;
      if (event.data.type === 'PING') announce();
      if (event.data.type === 'GET_STATS') void publishStats();
      if (event.data.type === 'RESET_STATS') void publishStats(true);
      if (event.data.type === 'OPEN_DASHBOARD') void request({ type: 'OPEN_DASHBOARD' });
    };
    window.addEventListener('message', receive); announce();
    ctx.onInvalidated(() => { window.removeEventListener('message', receive); chrome.storage.onChanged.removeListener(changed); });
  },
});
