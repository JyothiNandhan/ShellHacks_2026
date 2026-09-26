# PromptShield — Person 2 extension

This directory implements Person 2's Chrome extension work from `00-overview-and-contracts.md` and `02-person2-extension-guards.md`. It imports the shared `@promptshield/engine` workspace package (Person 1's real engine, merged on `main`). Unit tests use a separate, isolated engine double.

## Current verification

- All 26 checks pass: 21 offline background/guard checks and 5 Vitest/jsdom editor tests.
- TypeScript typecheck and the production WXT build pass against the real engine.
- The NER model loads and runs inside the built extension's offscreen document (verified in Chromium: names and places are found by `ner`). The ONNX runtime WASM ships once, in the extension's `assets/` (the offscreen page sets `wasmPaths = {}` so neither the transformers.js CDN default nor the engine's `promptshield-wasm/` default applies); only model weights come from Hugging Face.
- Browser end-to-end check (Chromium, local pages served at `https://chatgpt.com/c/...` with a ChatGPT-like contenteditable editor and with the newer `<textarea name="prompt">` + `Send message` button): clean paste, paste gate before insertion, Rename & insert, Insert as is, Escape/cancel, approved items skip the send check, Shift+Enter, typing underline/chip/panel, send check Rename & send, and value-free events all behave as specified.
- Live ChatGPT/Claude/Gemini selectors still need a manual check in a signed-in browser (Step 14).

## Run after adding this folder to the team repository

Use Node 24 or later. The repository root must list `apps/*` and `packages/*` as npm workspaces, and `packages/engine` must export the overview's main, `/ner`, and `/files` APIs.

```powershell
# From the repository root. On Windows use npm.cmd if PowerShell blocks npm.ps1.
npm.cmd install
npm.cmd run typecheck -w apps/extension
npm.cmd test -w apps/extension
npm.cmd run build -w apps/extension
npm.cmd run dev -w apps/extension
npm.cmd run zip -w apps/extension
```

Load `apps/extension/.output/chrome-mv3` from Chrome's **Extensions → Developer mode → Load unpacked** after building. WXT writes the distributable zip under `.output`.

The generated artifact is `.output/promptshieldextension-0.1.0-chrome.zip`. Until Person 3 merges the file gate it contains the file-gate integration placeholder, so it is not the final Devpost release. Person 4 can copy the final rebuilt ZIP to their website download path after the real engine and Person 3's file gate/pages are merged.

The dependency-free checks can run now from this directory:

```powershell
node --import ./tests/offline/register.mjs --test ./tests/offline/*.test.mjs
```

The panel's look-back link opens https://www.mindyourprompt.us/scan. To point it at a local website instead, copy `.env.example` to `.env.local` (it sets `VITE_WEBSITE_URL`) before building.

## What is implemented

| Area | Files | Behavior |
| --- | --- | --- |
| Site support | `src/sites/` | ChatGPT, legacy ChatGPT hostname, Claude, Gemini; conversation IDs, main/edit selectors, nearby send-button lookup |
| Editor integration | `src/editor/` | Text-node offsets, block/newline handling, textarea selection, stale-selection protection, 300/900 ms scanning, IME handling |
| Paste | `src/guards/pasteGate.ts` | Stops plain-text paste before page handlers; local scan; rename, insert as is, cancel; clipboard fallback |
| Send | `src/guards/sendCheck.ts` | Enter/click interception, current full-result cache, clean trusted-event passthrough, final review, scoped replay, Shift+Enter/IME passthrough |
| Typing | `src/overlay/`, `src/panel/` | Closed-shadow underlines/chips (textareas measured through an invisible mirror) and list, explanations, masked secrets, replace all, topics, approvals/Undo, AI availability |
| Gate | `src/gateFrame.ts`, `entrypoints/gate/` | Extension-origin React iframe; paste/file/send/can't-check labels; keyboard focus and Escape |
| Processing | `entrypoints/offscreen/` | Lazy engine NER loading and file extraction, serialized local jobs |
| Background | `src/backgroundService.ts` | Offscreen lifecycle, gate ownership checks, serialized session/event writes, 5,000-event cap |
| Integration API | `src/api.ts` | All contract 5.7 exports with matching signatures |

## Handoff to Person 3

`src/guards/fileGate.ts` is a deliberately empty `initFileGate()` integration placeholder. Person 3 should replace that file with their implementation. It is called once at `document_start`, with its initialization isolated from the other guards. File detection/upload interception itself is Person 3's work.

The dashboard, options, popup, and `src/shared-ui/` directories were not created or edited. React, React DOM, Recharts, Tailwind, and the WXT React module are listed for those pages. WXT automatically discovers options/popup entrypoints when Person 3 adds them; no manifest reference points to a missing HTML page.

File gate usage:

1. Use `getAdapter()` and `getSettings()` to check site protection.
2. Block the native upload/drop before awaiting extraction.
3. Call `extractFile(file)`, then `detectWithTimeout(text)` and `splitForPrompt(result)`.
4. Use `getMapper()`, `openGate(payload)`, `saveMapper()`, `approve()`, and `logEvents()` for the chosen outcome.
5. `cant_check` returns `secondary` for **Upload anyway**, and `cancel` for closing.
6. Recheck the editor and conversation after every review, so a stale file review cannot upload into a different chat.
7. Log decisions only after accepting the chosen upload action. Cancellation logs nothing.

`extractFile` transfers byte arrays through extension messaging and refuses files over 16 MiB with an explicit reason. No `File` object is sent directly. The API preserves the frozen `Extracted` union.

Settings use `chrome.storage.local.settings`; events use `chrome.storage.local.events`; maps and approvals use the specified session keys. Event records contain only `type`, `site`, `source`, `action`, and `ts`. Background serialization prevents concurrent tabs from losing event/approval writes. Mapping conflicts across tabs abort replacement instead of reassigning an existing placeholder.

## Privacy and implementation notes

- Pasted text is blocked synchronously before any awaited work. Typed text is already visible to the site, as the panel explains.
- The gate payload lives in background memory. The iframe URL contains only a random ID. There is no `window.postMessage`, page-world script injection, or network call carrying drafts, files, or events.
- Gate retrieval requires an extension gate frame in the originating tab. Results target the original content-script document. Cancellation, navigation, timeout, and disconnect remove the review.
- NER failure leaves fast rules active and exposes an unavailable status. A 1.5-second gate timeout uses the fast result; slow model loading can therefore miss entities found only by NER.
- The production model and PDF/DOCX implementation belong to the engine. Its ONNX WASM and PDF worker are packaged locally for MV3; remote script loading is blocked by the extension CSP. Model weights download once from the declared Hugging Face hosts.
- Findings whose value is already one of this conversation's placeholders (e.g. `person_1@example.com`) are never flagged again.
- Replace and Replace all edit each span in place (last to first), so line breaks and formatting are never retyped.
- Clipboard write permission supports the specified insertion fallback. It never grants clipboard-read access.
- Rich editor replacements use `execCommand('insertText')`; textareas use `setRangeText` plus `input`. Failed replacements offer a copy action. Synthetic replay behavior and site selectors need live verification after site changes.
- Gmail and the optional tool-safety panel card are deferred until the core checkpoint is verified, as the assignment specifies. No backend/domain host permission is added for an unconfigured API.

## Live acceptance checklist

Run all rows on ChatGPT and the first four on Claude and Gemini. Use fake data only.

| Check | Expected result |
| --- | --- |
| Paste an email/resume; choose rename | Gate appears before insertion; only placeholders enter the editor |
| Paste same content; choose as is, then send | Original inserted; approval prevents another prompt |
| Paste and cancel; paste `hello world` | Cancel inserts/logs nothing; clean paste has no gate |
| Type `my name is krishna ` and an email; press Enter | Engine findings get marks/chips; send offers rename/as is/cancel |
| Click chip/Replace/Replace all; repeat value later | Correct offsets; stable conversation placeholders |
| Shift+Enter, IME, scroll/resize, edit old message | Newline/composition preserved; marks aligned; correct editor checked |
| Always allow an email; undo an approval | Allowed value skips prompts and logs allowlisted; undone value prompts again |
| Type/navigate during an open review | Original review cannot overwrite or submit the changed draft |
| Disable protection, clear data, open two tabs | Site off is respected; approvals refresh; event writes are retained |
| Integrate Person 3 file gate/pages | File/can't-check gate buttons work; dashboard responds to live event writes |
| DevTools Network after renamed fake SSN | No request contains the original pasted SSN; model requests contain no draft text |

The checks above are a handoff checklist, not a claim that live-site testing has passed.

## Reference implementation choices

WXT HTML entrypoints use folders (`entrypoints/gate/index.html` and `entrypoints/offscreen/index.html`) so companion scripts are not mistaken for separate entrypoints. See the [WXT entrypoints documentation](https://wxt.dev/guide/essentials/entrypoints). The offscreen lifecycle follows Chrome's [offscreen API](https://developer.chrome.com/docs/extensions/reference/api/offscreen).
