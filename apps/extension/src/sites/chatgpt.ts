import { conversationId, type SiteAdapter } from './types';
export const chatgpt: SiteAdapter = {
  id: 'chatgpt', hostnames: ['chatgpt.com', 'chat.openai.com'],
  editor: '#prompt-textarea, textarea[name="prompt"]',
  editBoxes: '[data-message-author-role="user"] textarea, [data-message-author-role="user"] [contenteditable="true"]',
  sendButton: 'button[data-testid="send-button"], button[aria-label="Send prompt"], button[aria-label="Send message"]',
  editSendButton: 'button[data-testid="save-button"], button[aria-label*="Save" i], button[aria-label*="Send" i]',
  fileInput: 'input[type="file"]', convId: () => conversationId('c'),
};
