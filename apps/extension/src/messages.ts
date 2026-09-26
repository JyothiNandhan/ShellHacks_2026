import type { DetectionResult } from '@promptshield/engine';
import { ENGINE_STUB } from './engineStatus';
export type AiState = 'idle' | 'loading' | 'ready' | 'unavailable';
let aiState: AiState = 'idle';
const listeners = new Set<(state: AiState) => void>();
export const getAiState = () => aiState;
export function setAiState(state: AiState) { aiState = state; listeners.forEach(fn => fn(state)); }
export function watchAiState(fn: (state: AiState) => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }
export async function request<T = void>(message: Record<string, unknown>): Promise<T> {
  const reply = await chrome.runtime.sendMessage({ ...message, target: 'background' });
  if (!reply?.ok) throw new Error(reply?.error ?? 'PromptShield is unavailable. Reload this tab.');
  return reply.value as T;
}
export async function fullDetection(text: string, opts: unknown): Promise<DetectionResult> {
  if (ENGINE_STUB) { setAiState('unavailable'); throw new Error('The preview engine has no AI name detector.'); }
  const timer = setTimeout(() => setAiState('loading'), 1500);
  try {
    const result = await request<DetectionResult>({ type: 'DETECT_FULL', requestId: crypto.randomUUID(), text, opts });
    setAiState('ready'); return result;
  } catch (error) { setAiState('unavailable'); throw error; }
  finally { clearTimeout(timer); }
}
