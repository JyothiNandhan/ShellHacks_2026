import { conversationId, type SiteAdapter } from './types';
export const claude: SiteAdapter = {
  id: 'claude', hostnames: ['claude.ai'],
  editor: '[contenteditable="true"].ProseMirror, [contenteditable="true"][data-placeholder]',
  editBoxes: 'textarea, [data-testid="user-message"] [contenteditable="true"]',
  sendButton: 'button[aria-label="Send message"], button[data-testid="send-button"]',
  editSendButton: 'button[aria-label*="Save" i], button[aria-label*="Send" i]',
  fileInput: 'input[type="file"]', convId: () => conversationId('chat'),
};
