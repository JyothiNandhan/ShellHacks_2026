import { pipeline, env } from '@huggingface/transformers';
import type { NerEntity, NerRunner } from './types';
export const DEFAULT_MODEL = 'Xenova/bert-base-NER';
export interface NerToken { entity: string; word: string; score: number; index?: number }
/** Split at sentence/word boundaries, never splitting a UTF-16 surrogate pair. */
export function chunkText(text: string, limit = 1500): Array<{ text: string; start: number }> {
  if (limit < 2) throw new Error('Chunk limit must be at least 2');
  const chunks = []; let start = 0;
  while (start < text.length) {
    let end = Math.min(start + limit, text.length);
    if (end < text.length) {
      const section = text.slice(start, end);
      const boundaries = Array.from(section.matchAll(/[.!?](?=\s)|\n/g));
      const sentenceEnd = boundaries[boundaries.length - 1]?.index;
      if (sentenceEnd !== undefined && sentenceEnd > limit / 3) end = start + sentenceEnd + 1;
      else { const space = section.lastIndexOf(' '); if (space > limit / 2) end = start + space + 1; }
      if (/[\uD800-\uDBFF]/.test(text[end - 1])) end--;
    }
    chunks.push({ text: text.slice(start, end), start }); start = end;
  }
  return chunks;
}
/** Align all tokens, including O tokens, so repeated words retain exact offsets. */
export function aggregateTokens(text: string, tokens: NerToken[], offset = 0): NerEntity[] {
  const result: NerEntity[] = []; let cursor = 0;
  let active: { type: NerEntity['type']; start: number; end: number; scores: number[]; index?: number } | undefined;
  const flush = () => {
    if (active) { const score = active.scores.reduce((a, b) => a + b, 0) / active.scores.length;
      if (score >= (active.type === 'PERSON' ? 0.85 : 0.9)) result.push({ type: active.type, start: active.start + offset, end: active.end + offset, score });
    } active = undefined;
  };
  const lower = text.toLowerCase();
  for (const token of tokens) {
    const word = token.word.replace(/^##|^[▁Ġ]/, '').trim();
    if (!word) continue;
    const start = lower.indexOf(word.toLowerCase(), cursor);
    if (start < 0) { flush(); continue; }
    const end = start + word.length, label = /^(B|I)-(PER|LOC|ORG)$/.exec(token.entity);
    cursor = end;
    if (!label) { flush(); continue; }
    const type = ({ PER: 'PERSON', LOC: 'LOCATION', ORG: 'ORGANIZATION' } as const)[label[2] as 'PER' | 'LOC' | 'ORG'];
    // Some CoNLL models emit B-PER on continuation pieces too. Never split
    // a single word solely because its ## continuation has a B label.
    const continuous = active && active.type === type && (label[1] === 'I' || (token.word.startsWith('##') && start === active.end)) &&
      (token.index === undefined || active.index === undefined || token.index === active.index + 1) && /^[\s'-]*$/.test(text.slice(active.end, start));
    if (!continuous) { flush(); active = { type, start, end, scores: [token.score], index: token.index }; }
    else { active!.end = end; active!.scores.push(token.score); active!.index = token.index; }
  }
  flush(); return result;
}
export async function createNerRunner(opts: { model?: string; onProgress?: (p: { status: string; progress?: number }) => void } = {}): Promise<NerRunner> {
  env.allowLocalModels = false;
  // Bundle WASM alongside the host application. Transformers.js otherwise
  // defaults to a third-party CDN, which is outside PromptShield's data contract.
  const wasm = env.backends.onnx.wasm;
  if (wasm && (wasm.wasmPaths === undefined || (typeof wasm.wasmPaths === 'string' && wasm.wasmPaths.startsWith('https://cdn.jsdelivr.net/')))) {
    // Non-literal path: bundlers (webpack/Vite) must not try to resolve this directory at build time.
    const wasmDir = './promptshield-wasm/';
    wasm.wasmPaths = new URL(wasmDir, import.meta.url).href;
  }
  const classifier = await pipeline('token-classification', opts.model ?? DEFAULT_MODEL, {
    dtype: 'q8', progress_callback: p => opts.onProgress?.({ status: p.status, ...('progress' in p ? { progress: p.progress } : {}) }),
  });
  return async text => {
    const entities: NerEntity[] = [];
    for (const chunk of chunkText(text)) {
      // Request O tokens as well to avoid aligning a later entity to an earlier occurrence.
      const tokens = await classifier(chunk.text, { ignore_labels: [] });
      entities.push(...aggregateTokens(chunk.text, tokens as NerToken[], chunk.start));
    }
    return entities;
  };
}
