# Mind your Prompt!

A Chrome extension for reviewing personal information before sharing with ChatGPT, Claude or Gemini. The website provides installation instructions and opens the installed extension dashboard.

## Final application flow

| Action | Behavior |
| --- | --- |
| Type | Local detection shows replacement chips and a right-side panel with categories and explanations. |
| Click Send or press Enter | Review **Replace and send** or **Send as is**, or cancel. Every new send is reviewed, including a value previously sent as is. Shift+Enter remains a newline. |
| Paste text | Stop the original paste before page handlers. Review the prospective draft in extension memory, then insert and send the chosen version. |
| Upload, drop or paste a file | Hold the original file before the site's input/drop/paste handler. Review all selected files together. Replacement creates plain-text attachments; Send as is retains original bytes. |
| Unsupported/scanned/encrypted/oversized file | Explain that it cannot be checked. Replacement is disabled; explicitly send as is or cancel. No pretend redaction. |
| Dashboard | Four cards: conversations, personal details shared, categories shared, privacy score. Starts at **0 / 0 / 0 / 100**. |
| Reset | Clear activity and temporary approvals/mappings, restore **0 / 0 / 0 / 100**, preserve settings. Pending results from before reset cannot repopulate activity. |
| Import history | Read an exported JSON file locally, scan user messages, add counts, skip already-counted messages, show a sharing summary. |
| Regulatory question | Send only the question and selected AI tool to the server. Snowflake retrieves official policy excerpts and generates an answer with validated citations. |

The actual dashboard is an extension page. The website does not receive activity or reset access. Without the extension, `/dashboard` and `/scan` show installation instructions.

## Run locally (PowerShell)

Use Node.js 24 or newer.

```powershell
npm.cmd ci
npm.cmd run build -w apps/extension
npm.cmd run dev -w apps/web
```

Open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select `apps/extension/.output/chrome-mv3`. Reload already-open chatbot tabs. Open the extension icon, then **Open dashboard**. Keep the local web server running for regulatory answers; protection and activity tracking work independently.

For an existing unpacked installation, replace its files with the new build, click **Reload**, then reload the chatbot tabs. Version **0.4.0**, displayed as **Mind your Prompt!**, includes this flow. Do not leave an old copy enabled alongside it.

## Snowflake configuration

Server-only credentials belong in ignored `apps/web/.env.local`; see `apps/web/.env.example`. Never put credentials in `VITE_` or `NEXT_PUBLIC_` variables.

```powershell
node snowflake/check-connection.mjs --check-only
node snowflake/check-connection.mjs
```

The extension defaults to `http://localhost:3000/api/privacy-question`. For deployment, set `VITE_API_BASE_URL=https://www.mindyourprompt.us` in `apps/extension/.env.local` and rebuild. Supported API hosts are localhost:3000 and mindyourprompt.us. Deploy the web app with the server environment configured. Restart the web server after changing its environment.

A 401 means the supplied Snowflake token/account/role configuration must be refreshed. The question UI shows unavailable when the service fails; it does not invent a policy answer. SQL/Cortex setup lives under `snowflake/`.

## Counter definitions

- A conversation is a unique chat thread, not each message. Clean and replaced messages still establish a conversation.
- A shared detail is one detected occurrence actually sent unchanged. Two emails in one sent message count as two details. Replaced details cost zero; always-allowed details still count as shared.
- Categories count distinct shared types. Repeating an email increases details, not the category count.
- Score starts at 100 and decreases by type weights: SSN/card/bank 15; key/password 10; address/private term 8; phone/birth date 5; email 3; name 2; IP/place/organization 1. Minimum zero; reset restores 100.
- A new matching user-message bubble confirms a send. Typing, opening/cancelling a review, or attaching a file alone do not count. This observes the site's UI, not server-side retention.
- The local activity ledger stores category counts, timestamps, provider, and hashed message/conversation identifiers, not prompt text or original detected values. Detection and replacement mappings remain local.

## Imports and limits

Choose ChatGPT `conversations.json`, Claude conversation JSON, or Gemini Takeout `MyActivity.json` (English `Prompted` entries). Assistant messages are excluded. Limits: 25 MB JSON, 20,000 user messages/ledger records, 100,000 characters per imported message. ZIP, HTML, Claude download manifests and unrelated JSON are not accepted in this flow.

Imports use local rules and dictionaries. Duplicate detection uses provider, conversation ID, normalized text and occurrence number. Reimporting the same history does not inflate counts. Matching live text messages are skipped. Exports omitting attachment contents, containing edited text or lacking stable thread IDs cannot always be matched to live activity. Gemini entries without a thread ID count as separate conversations.

Live detection combines rules, dictionaries and an on-device model. The model downloads on first use; guards retain fast checks if it is slow/unavailable. Detection is best effort. Organization detection is off by default and can be enabled in Settings. Always-allow settings skip replacement for those values.

Files up to 16 MB are read locally, with a one-million-character extracted-text limit. Supported extraction includes TXT, PDF and DOCX. Replacement produces TXT, so document formatting is not preserved. Unreadable contents cannot be included in disclosure counts. If attachment readiness cannot be confirmed, the extension leaves the reviewed attachment for the user to inspect and press Send manually. Browser/provider markup changes can affect automatic insertion, send confirmation and counters.

## Verification

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run test:person3
npm.cmd run lint -w apps/web
npm.cmd run build
# With the production server already running on port 3000:
node tests/browser-app.mjs
```

The browser test uses an isolated Edge profile on Windows (`CHROME_PATH` overrides the executable) and synthetic provider pages. No test messages are sent to real AI accounts. It exercises installation gating, dashboard/reset/import deduplication, typing, both send decisions, cancelled paste, upload/drop/clipboard interception and local model inference. Screenshots are generated in ignored `test-results/app/`. A final manual smoke test against the current signed-in provider UIs is still needed before release.

## Repository

- `packages/engine`: shared local detection, redaction, file extraction.
- `apps/extension`: Manifest V3 guards, local ledger, dashboard/import worker.
- `apps/web`: installation website and server-side Snowflake API.
- `snowflake`: policy knowledge base and Snowflake setup.
- `tests`: cross-package integration tests and browser verification.

Legacy website report components remain available as source for the team, but the public scan route now opens the extension installation flow. No commits or pushes are performed automatically.
