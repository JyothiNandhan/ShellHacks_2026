# Extension download release

Website integration: Sai Sri Krishna Teja Sanku (Krishna). Original extension implementation remains credited to its team owners.

- Version: 0.3.0, Manifest V3, Chrome 116 or newer.
- Download: https://www.mindyourprompt.us/download/promptshield-extension.zip
- SHA-256: `b7d1ee99d9f1998075ad746b5ae0077a0f36696f1052c67e3721f40a9f2bf909`
- Built from apps/extension source with VITE_WEB_ORIGIN=https://www.mindyourprompt.us.
- ZIP CRC, root manifest, content scripts and bundled WASM checked.

## Changes

### 0.3.0

- Website dashboard (`/dashboard`, "Mind your Prompt!") shows four totals: conversations with AI, times personal information was shared (details sent as is), categories shared, and privacy score. A fresh install reads 0 / 0 / 0 / 100. The dashboard is open to everyone; the extension adds live totals when installed.
- The bridge now shares stats format version 2: distinct conversation count and the category names of details sent as is (never values). Older extension builds are not recognized by the new dashboard, so update the unpacked folder.
- Reset returns everything to zero and the score to 100.
- File gate: files dropped anywhere on ChatGPT/Claude/Gemini, and files pasted with Ctrl+V, are now checked before the site receives them. File-gate messages appear as in-page toasts.
- The bridge also runs on http://localhost (any port) for local development.
- The popup opens the website dashboard; the extension's own page is under "Detailed activity".

### 0.2.0

Charcoal/red findings panel, removed the two static footer lines, and reset controls beside dashboard metrics. Live activity starts at zero and records only after a new user-message bubble matching the checked prompt appears in ChatGPT, Claude or Gemini. Typing, pasting and clearing the composer alone do not count. Existing pre-send decision logs are excluded from the new metrics.

The website bridge runs only on mindyourprompt.us and www.mindyourprompt.us. It shares aggregate counts and score locally through window messages, never prompt text or detected values. Reset clears sent activity on this device and preserves settings and export reports. The extension dashboard updates through storage events; the website receives updates through the bridge.

Score and detail counts use the most recent 5,000 recorded details. Prompt count is since reset. Replacements counted here are those chosen in the send review; earlier paste/inline replacements are not included. File-only sends are not counted. Confirmation observes chatbot UI, not proof of server storage. If a provider changes its message markup or takes more than 15 seconds, the observer may miss that send.

## Install or update

1. Download and unzip the new ZIP.
2. Open chrome://extensions and enable Developer mode.
3. For an existing installation, replace the contents of its unpacked folder with the new files, then click Reload. For a new installation, choose Load unpacked and select the folder containing manifest.json.
4. Check version 0.3.0. Review any newly requested site access: the website bridge needs access to mindyourprompt.us.
5. Reload ChatGPT/Claude/Gemini and the Mind Your Prompt website.
6. Open /dashboard. A fresh install shows 0 / 0 / 0 / 100. Type a synthetic email: numbers must stay unchanged. Send it as is: 1 conversation, 1 shared detail, 1 category, score 97. Reset should return 0 / 0 / 0 / 100.
7. Test cancelled sends and send-review replacement, then repeat on each chatbot.

This is an unpacked development build, not a Chrome Web Store release. Automated tests cover message observation, duplicate suppression, draft edits, background authorization, score/reset and existing guards. Real-site integration should also be tested with the installed build; no private prompts are needed.
