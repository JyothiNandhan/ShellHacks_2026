# Extension download release

Website integration: Sai Sri Krishna Teja Sanku (Krishna). Original extension implementation remains credited to its team owners.

- Version: 0.2.0, Manifest V3, Chrome 116 or newer.
- Download: https://www.mindyourprompt.us/download/promptshield-extension.zip
- SHA-256: `baa1a96d9b416ac48c606c779e7d960d56ac48fcae24af92d0e4a1a5af38f3e6`
- Built from apps/extension source with VITE_WEB_ORIGIN=https://www.mindyourprompt.us.
- ZIP CRC, root manifest, content scripts and bundled WASM checked.

## Changes

Charcoal/red findings panel, removed the two static footer lines, and reset controls beside dashboard metrics. Live activity starts at zero and records only after a new user-message bubble matching the checked prompt appears in ChatGPT, Claude or Gemini. Typing, pasting and clearing the composer alone do not count. Existing pre-send decision logs are excluded from the new metrics.

The website bridge runs only on mindyourprompt.us and www.mindyourprompt.us. It shares aggregate counts and score locally through window messages, never prompt text or detected values. Reset clears sent activity on this device and preserves settings and export reports. The extension dashboard updates through storage events; the website receives updates through the bridge.

Score and detail counts use the most recent 5,000 recorded details. Prompt count is since reset. Replacements counted here are those chosen in the send review; earlier paste/inline replacements are not included. File-only sends are not counted. Confirmation observes chatbot UI, not proof of server storage. If a provider changes its message markup or takes more than 15 seconds, the observer may miss that send.

## Install or update

1. Download and unzip the new ZIP.
2. Open chrome://extensions and enable Developer mode.
3. For an existing installation, replace the contents of its unpacked folder with the new files, then click Reload. For a new installation, choose Load unpacked and select the folder containing manifest.json.
4. Check version 0.2.0. Review any newly requested site access: the website bridge needs access to mindyourprompt.us.
5. Reload ChatGPT/Claude/Gemini and the Mind Your Prompt website.
6. Open /scan and check Live extension activity. Type a synthetic email: numbers must stay unchanged. Send it as is: one sent prompt and one shared email should appear; a fresh score should be 97. Reset should return numbers to zero.
7. Test cancelled sends and send-review replacement, then repeat on each chatbot.

This is an unpacked development build, not a Chrome Web Store release. Automated tests cover message observation, duplicate suppression, draft edits, background authorization, score/reset and existing guards. Real-site integration should also be tested with the installed build; no private prompts are needed.
