import { defineContentScript } from 'wxt/utils/define-content-script';
import { request } from '../src/messages';
export default defineContentScript({
  matches: ['https://www.mindyourprompt.us/*', 'https://mindyourprompt.us/*', 'http://localhost:3000/*'],
  runAt: 'document_idle',
  main(ctx) {
    const announce = () => window.postMessage({ source: 'mindyourprompt-extension', type: 'READY' }, location.origin);
    const receive = (event: MessageEvent) => {
      if (event.source !== window || event.origin !== location.origin || event.data?.source !== 'mindyourprompt-website') return;
      if (event.data.type === 'PING') announce();
      if (event.data.type === 'OPEN_DASHBOARD') void request({ type: 'OPEN_DASHBOARD' });
    };
    window.addEventListener('message', receive); announce();
    ctx.onInvalidated(() => window.removeEventListener('message', receive));
  },
});
