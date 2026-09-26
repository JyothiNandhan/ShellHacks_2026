import { detectFull, type NerRunner } from '@promptshield/engine';
import { createNerRunner } from '@promptshield/engine/ner';
import { extractText } from '@promptshield/engine/files';
import { env } from '@huggingface/transformers';
// With no path prefix, ONNX uses its embedded loader and the WASM Vite already emits under /assets/.
// A non-empty value stops transformers.js (CDN default) and the engine (./promptshield-wasm/) from overriding it.
// Offscreen documents are not cross-origin isolated, so use one thread.
const wasm = env.backends.onnx.wasm!;
wasm.wasmPaths = {};
wasm.numThreads = 1;
let runnerPromise: Promise<NerRunner> | undefined;
let jobs: Promise<unknown> = Promise.resolve();
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (message?.target !== 'offscreen' || sender.id !== chrome.runtime.id || sender.tab || (sender.url && sender.url !== chrome.runtime.getURL('background.js'))) return;
  const run = async () => {
    if (message.type === 'DETECT_FULL') {
      runnerPromise ??= createNerRunner().catch(error => { runnerPromise = undefined; throw error; });
      return detectFull(message.text, message.opts, await runnerPromise);
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
