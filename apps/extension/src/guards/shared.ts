import { EXPLANATIONS, type DetectionResult, type Finding, type PlaceholderMapper } from '@promptshield/engine';
import type { GatePayload } from '../api';
import type { Editor } from '../sites';
import { buildTextModel } from '../editor/textModel';
import { getAdapter } from '../api';
import { toast } from '../ui';
let busy = false;
export const gateBusy = () => busy;
export function lockGuard(): (() => void) | null {
  if (busy) return null;
  busy = true;
  return () => { busy = false; };
}
export function snapshot(editor: Editor) {
  const path = location.pathname;
  const text = buildTextModel(editor).text;
  return { text, valid: () => !!getAdapter() && editor.isConnected && location.pathname === path && buildTextModel(editor).text === text };
}
export function payloadFor(mode: 'paste' | 'send', findings: Finding[], result: DetectionResult, mapper: PlaceholderMapper): GatePayload {
  return {
    mode, title: 'Personal information found',
    items: findings.map(f => ({ label: EXPLANATIONS[f.type].label, value: f.value, why: EXPLANATIONS[f.type].why, placeholder: mapper.placeholderFor(f) })),
    topics: result.topics.map(t => ({ label: EXPLANATIONS[t.topic].label, snippet: t.sentence, why: EXPLANATIONS[t.topic].why })),
  };
}
export function guardError(): void { toast('PromptShield couldn’t finish checking. Your action was stopped; please try again.'); }
export function staleNotice(): void { toast('The conversation or text changed. Please try again with the current text.'); }
