import type { Site } from '@promptshield/engine';
export interface SiteAdapter {
  id: Site;
  hostnames: string[];
  editor: string;
  editBoxes?: string;
  sendButton: string;
  editSendButton?: string;
  fileInput: string;
  convId(): string;
}
export const conversationId = (prefix: string) => location.pathname.match(new RegExp(`^/${prefix}/([^/]+)`))?.[1] ?? 'new';
