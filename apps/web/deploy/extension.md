# Extension download release

Website integration: Sai Sri Krishna Teja Sanku (Krishna). Extension implementation remains credited to its team owners.

- Public file: `apps/web/public/download/promptshield-extension.zip`
- Download: https://www.mindyourprompt.us/download/promptshield-extension.zip
- Homepage installation section: https://www.mindyourprompt.us/#extension
- Supplied version: 0.1.0, Manifest V3, Chrome 116 or newer.
- SHA-256: `a7274cc5505033384be5bb3adaa9aeb14fab9a4133b4d5b26210d05b3ada073c`

The supplied archive has manifest.json at its root. ZIP CRC, required manifest entrypoints, and bundled WASM presence were checked. One compiled shared-page link in `chunks/style-hyg7UpIa.js` was changed from `http://localhost:3000` to `https://www.mindyourprompt.us` before repackaging. Detection logic and permissions were not changed. The original supplied archive remains outside the public directory for comparison.

For future source builds, set both `VITE_WEBSITE_URL=https://www.mindyourprompt.us` and `VITE_WEB_ORIGIN=https://www.mindyourprompt.us` so the panel and shared pages agree. Replace the public ZIP, verify it, and redeploy; the website checks availability at build time.

## Manual installation

1. Download and unzip the file.
2. Open chrome://extensions and enable Developer mode.
3. Choose Load unpacked, selecting the directory containing manifest.json.
4. The extension appears as PromptShield. Reload ChatGPT, Claude, or Gemini.
5. Test with synthetic details, and confirm the look-back link opens the live scan page.

This is a manual development build, not a Chrome Web Store listing. Archive validation does not prove full extension behavior: the team still needs to test paste/send/file flows on all three real sites. The first AI scan may download model assets.
