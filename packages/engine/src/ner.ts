import type { NerRunner } from "./types.js";

/** Initial integration stub. A real local transformers.js model is still required. */
export async function createNerRunner(opts?: {
  model?: string;
  onProgress?: (p: { status: string; progress?: number }) => void;
}): Promise<NerRunner> {
  opts?.onProgress?.({ status: "stub: NER model not implemented" });
  return async () => [];
}
