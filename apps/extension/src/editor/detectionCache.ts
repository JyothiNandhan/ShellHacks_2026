import type { DetectionResult } from '@promptshield/engine';
import type { Editor } from '../sites';
const cache = new WeakMap<Editor, { text: string; path: string; result: DetectionResult }>();
export function rememberDetection(editor: Editor, text: string, result: DetectionResult) {
  cache.set(editor, { text, path: location.pathname, result });
}
export function latestDetection(editor: Editor, text: string): DetectionResult | undefined {
  const entry = cache.get(editor);
  return entry?.text === text && entry.path === location.pathname ? entry.result : undefined;
}
export function clearDetection(editor: Editor) { cache.delete(editor); }
