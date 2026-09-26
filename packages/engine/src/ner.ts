// TEMPORARY STUB — Person 1 will replace this whole package
import type { NerRunner } from "./types";
export async function createNerRunner(_opts?: {
  model?: string;
  onProgress?: (p: { status: string; progress?: number }) => void;
}): Promise<NerRunner> {
  return async () => [];
}
