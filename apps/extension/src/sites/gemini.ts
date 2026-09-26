import { conversationId, type SiteAdapter } from './types';
export const gemini: SiteAdapter = {
  id: 'gemini', hostnames: ['gemini.google.com'],
  editor: 'rich-textarea [contenteditable="true"], .ql-editor[contenteditable="true"]',
  editBoxes: 'textarea, .query-text [contenteditable="true"]',
  sendButton: 'button.send-button, button[aria-label*="Send message" i]',
  editSendButton: 'button[aria-label*="Update" i], button[aria-label*="Send" i]',
  fileInput: 'input[type="file"]', convId: () => conversationId('app'),
};
