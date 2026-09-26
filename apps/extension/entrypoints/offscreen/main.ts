import type { DetectionResult, DetectOptions } from '@promptshield/engine';
import { extractText } from '@promptshield/engine/files';
let inference: Worker | undefined;
const requests = new Map<string, { resolve: (value: DetectionResult) => void; reject: () => void }>();
function detect(text: string, opts: DetectOptions): Promise<DetectionResult> {
  if (!inference) {
    inference = new Worker(new URL('../../src/inference.worker.ts', import.meta.url), { type: 'module' });
    inference.onmessage = event => {
      const request = requests.get(event.data.id); if (!request) return;
      requests.delete(event.data.id);
      if (event.data.ok) request.resolve(event.data.value); else request.reject();
    };
    inference.onerror = () => { inference?.terminate(); inference = undefined; for (const request of requests.values()) request.reject(); requests.clear(); };
  }
  const id = crypto.randomUUID();
  return new Promise((resolve, reject) => {
    requests.set(id, { resolve, reject: () => reject(new Error('Local model unavailable')) });
    inference!.postMessage({ id, text, opts });
  });
}
let jobs: Promise<unknown> = Promise.resolve();
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (message?.target !== 'offscreen' || sender.id !== chrome.runtime.id || sender.tab || (sender.url && sender.url !== chrome.runtime.getURL('background.js'))) return;
  const run = async () => {
    if (message.type === 'DETECT_FULL') {
      return detect(message.text, message.opts);
    }
    if (message.type === 'EXTRACT_FILE') {
      const file = new File([new Uint8Array(message.bytes)], message.name, { type: message.mime });
      return extractText(file);
    }
    throw new Error('Unknown job');
  };
  // Models often share a non-reentrant inference session.
  // File reading must not wait behind a first-time model download.
  const job = message.type === 'DETECT_FULL' ? jobs.then(run, run) : run();
  if (message.type === 'DETECT_FULL') jobs = job.catch(() => {});
  void job.then(value => respond({ ok: true, value }), () => respond({ ok: false }));
  return true;
});
