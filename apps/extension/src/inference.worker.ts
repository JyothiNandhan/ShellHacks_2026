import { detectFull, type NerRunner, type DetectOptions } from '@promptshield/engine';
import { createNerRunner } from '@promptshield/engine/ner';
import { env } from '@huggingface/transformers';

// Keep synchronous WASM inference off the renderer thread used by extension UI.
// Vite emits the runtime beside this worker; no remote executable code is loaded.
const wasm = env.backends.onnx.wasm!;
wasm.wasmPaths = {};
wasm.numThreads = 1;
let runner: Promise<NerRunner> | undefined;
let jobs: Promise<unknown> = Promise.resolve();
self.onmessage = (event: MessageEvent<{ id: string; text: string; opts: DetectOptions }>) => {
  const { id, text, opts } = event.data;
  const run = async () => {
    runner ??= createNerRunner().catch(error => { runner = undefined; throw error; });
    return detectFull(text, opts, await runner);
  };
  const job = jobs.then(run, run); jobs = job.catch(() => {});
  void job.then(value => self.postMessage({ id, ok: true, value }), () => self.postMessage({ id, ok: false }));
};
