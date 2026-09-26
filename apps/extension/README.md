# Mind your Prompt! Chrome extension

Version 0.4.0 implements the final review-and-send flow. See the [root README](../../README.md) for setup, counter definitions, supported imports, Snowflake configuration and limitations.

## Build and install

From the repository root:

```powershell
npm.cmd ci
npm.cmd run build -w apps/extension
```

Load `apps/extension/.output/chrome-mv3` at `chrome://extensions` with Developer mode enabled. Reload the extension and existing chatbot tabs after updates. Open the dashboard from the extension icon.

## Implementation map

| Area | Source |
| --- | --- |
| Typing suggestions and categories | `src/editor/editorWatcher.ts`, `src/overlay/`, `src/panel/` |
| Paste review before insertion | `src/guards/pasteGate.ts` |
| Enter/button review before send | `src/guards/sendCheck.ts` |
| Upload/drop/clipboard file review | `src/guards/fileGate.ts` |
| Reviewed submission and confirmation | `src/submission.ts`, `src/confirmedSend.ts` |
| Local counters, score, deduplication | `src/activity.ts`, `src/backgroundService.ts` |
| JSON history parsing/scanning | `src/historyImport.ts`, `src/history.worker.ts` |
| Dashboard and regulatory questions | `entrypoints/dashboard/` |
| Website installation handshake | `entrypoints/dashboard-bridge.content.ts` |

Every send presents **Replace and send** and **Send as is**. Paste/file choices insert and submit once without a second review. Cancel leaves the original paste/file outside the composer. For unreadable files, replacement is visibly disabled. Always-allowed values remain unchanged and count as disclosures if sent.

The dashboard starts at 0/0/0/100. Counters use confirmed sends and local JSON imports. The website bridge only announces installation and opens the extension dashboard; it never exposes counts or reset access.

The extension contains no Snowflake credentials. Set `VITE_API_BASE_URL` to the public server address before building; localhost:3000 is the default. Only a regulatory question and the selected tool are sent to that server.

Tests: `npm.cmd test -w apps/extension`, `npm.cmd run test:person3`, and `node tests/browser-app.mjs` from the root with the web server running. The latter uses synthetic chat pages in an isolated browser profile.
