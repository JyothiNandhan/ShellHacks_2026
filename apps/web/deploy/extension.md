# Extension release 0.4.0

Display name: **Mind your Prompt!**. Manifest V3, Chrome 116 or newer. The website download remains `/download/promptshield-extension.zip`.

This release replaces the old activity dashboard with conversations / personal details shared / categories / score, initial and reset state 0/0/0/100, local JSON history import and regulatory questions. Every Send is reviewed. Paste, upload, drop and clipboard attachments are intercepted before the host's editor/upload handlers. Counters update after matching user-message bubbles appear, not during attachment preparation.

The dashboard is extension-only. The website bridge announces installation and opens it, without exposing activity or reset access. The RAG endpoint receives only the selected tool and user-entered question. Credentials remain server-side.

## Rebuild the download

This published archive is built for https://www.mindyourprompt.us. For future production releases, configure `VITE_API_BASE_URL=https://www.mindyourprompt.us` in `apps/extension/.env.local` and deploy the server environment.

```powershell
npm.cmd run zip -w apps/extension
Copy-Item apps/extension/.output/promptshieldextension-0.4.0-chrome.zip apps/web/public/download/promptshield-extension.zip
```

Check the actual ZIP filename emitted by WXT; if different, copy that file. Never include `.env.local` or credentials in the ZIP. The ZIP root must contain `manifest.json`.

## Update

1. Unzip into your unpacked extension directory, or load the built `apps/extension/.output/chrome-mv3` directory.
2. At `chrome://extensions`, reload and verify version 0.4.0. Disable any old duplicate installation.
3. Reload the chatbot tabs and the website.
4. Open the extension dashboard. Reset once for a clean demo.
5. Type a fake email: suggestions/category panel appear, counters stay unchanged. Send as is: shared details increase and score decreases. Replace and send: original detail is absent and does not reduce score.
6. Repeat with paste, upload and drop; originals must stay outside the composer until a choice.
7. Import synthetic JSON twice: the second import leaves counters unchanged. Reset restores 0/0/0/100.
8. Ask a regulatory question; verify a real cited answer with valid Snowflake credentials. An unavailable answer indicates a server/authentication issue, not working RAG.

Automated browser tests use synthetic provider layouts. Check current real-provider UIs manually before release. File extraction cannot read every format, and UI observation cannot prove server storage.

## Production verification

- Privacy-question API target verified in compiled background.js.
- ZIP SHA-256: `6f89a996cbe288e02ae355e8b960120266bfa0dc51ba64c8c0bfa5f258150fc7`
- ZIP CRC, version, entrypoints and absence of environment files verified.
- Snowflake API routes allow up to 60 seconds. Server-side credentials must be configured separately in Vercel.
- Use Node.js 24.x for deployment to match the extension workspace requirement.
