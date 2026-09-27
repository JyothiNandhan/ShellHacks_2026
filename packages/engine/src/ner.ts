import { pipeline, env } from '@huggingface/transformers';
import type { NerEntity, NerRunner } from './types';
import { nerThreshold } from './nerThreshold';
import { STOPWORDS } from './stopwords';
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
type Span = { type: NerEntity['type']; start: number; end: number; scores: number[]; index?: number };
const wordChar = /[\p{L}\p{M}'’-]/u;
/** Align all tokens, including O tokens, so repeated words retain exact offsets. */
export function aggregateTokens(text: string, tokens: NerToken[], offset = 0): NerEntity[] {
  const spans: Span[] = []; let cursor = 0; let active: Span | undefined;
  const flush = () => { if (active) spans.push(active); active = undefined; };
  const lower = text.toLowerCase();
  for (const token of tokens) {
    const word = token.word.replace(/^##|^[▁Ġ]/, '').trim();
    if (!word) continue;
    const start = lower.indexOf(word.toLowerCase(), cursor);
    if (start < 0) { flush(); continue; }
    const end = start + word.length, label = /^(B|I)-(PER|LOC|ORG)$/.exec(token.entity);
    cursor = end;
    const type = label && ({ PER: 'PERSON', LOC: 'LOCATION', ORG: 'ORGANIZATION' } as const)[label[2] as 'PER' | 'LOC' | 'ORG'];
    // A word piece glued to the active entity belongs to it whatever its label
    // (bert-base-NER tags "Bindhu" as Bin/B-PER ##dh/I-PER ##u/O). Only entity-labelled pieces count toward the score.
    if (active && start === active.end && /^[\p{L}\p{M}]/u.test(word) && !/^[▁Ġ]/.test(token.word)) {
      active.end = end; active.index = token.index; if (type === active.type) active.scores.push(token.score); continue;
    }
    if (!type) { flush(); continue; }
    const continuous = active && active.type === type && label![1] === 'I' &&
      (token.index === undefined || active.index === undefined || token.index === active.index + 1) && /^[\s'-]*$/.test(text.slice(active.end, start));
    if (!continuous) { flush(); active = { type, start, end, scores: [token.score], index: token.index }; }
    else { active!.end = end; active!.scores.push(token.score); active!.index = token.index; }
  }
  flush();
  // Expand to whole words, drop a trailing possessive, then join overlapping spans and PERSON spans one space apart.
  for (const s of spans) {
    while (s.start > 0 && wordChar.test(text[s.start - 1])) s.start--;
    while (s.end < text.length && wordChar.test(text[s.end])) s.end++;
    const trimmed = /(?:['’]s|['’-]+)$/i.exec(text.slice(s.start, s.end));
    if (trimmed && trimmed.index > 0) s.end = s.start + trimmed.index;
  }
  const joined: Span[] = [];
  for (const s of spans) {
    const last = joined[joined.length - 1];
    if (last && last.type === s.type && (s.start <= last.end || (s.type === 'PERSON' && text.slice(last.end, s.start) === ' '))) {
      last.end = Math.max(last.end, s.end); last.scores.push(...s.scores);
    } else joined.push({ ...s, scores: [...s.scores] });
  }
  // The model sometimes tags a greeting or other stopword next to a name ("Hi Rohith", "Dear Priya")
  // as part of the PERSON span. Trim such words from both edges so only the name is replaced.
  for (const s of joined) {
    if (s.type !== 'PERSON') continue;
    let m: RegExpExecArray | null;
    while ((m = /^([\p{L}\p{M}'’-]+)[\s,]+/u.exec(text.slice(s.start, s.end))) && STOPWORDS.has(m[1].toLowerCase())) s.start += m[0].length;
    while ((m = /[\s,]+([\p{L}\p{M}'’-]+)$/u.exec(text.slice(s.start, s.end))) && STOPWORDS.has(m[1].toLowerCase())) s.end -= m[0].length;
    if (STOPWORDS.has(text.slice(s.start, s.end).toLowerCase())) s.end = s.start;
  }
  return joined.filter(s => s.end > s.start).flatMap(s => {
    const score = s.scores.reduce((a, b) => a + b, 0) / s.scores.length;
    return score >= nerThreshold(s.type, text.slice(s.start, s.end)) ? [{ type: s.type, start: s.start + offset, end: s.end + offset, score }] : [];
  });
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
