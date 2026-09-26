# Initial integration milestone

This scaffold follows Sections 4–6 of the overview. Team process instructions
in the overview are reference material, not authorization to push, merge,
publish, provision services, or contact teammates.

## Implemented

- Workspace layout, shared strict TypeScript configuration, build/test commands.
- Section 5.1 types and Section 5.6 tool-safety response types.
- All Section 5.2 engine exports are importable through three separate entries.
- Email detection with offsets, normalized keys, defaults, and allowlist flags.
- Per-type placeholders with JSON restoration and original email domains.
- Redaction that skips allowlisted findings and checks source spans.
- Default settings, severity weights, and entity/topic explanation text.
- Plain `.txt` file extraction with unsupported/empty/error results.

## Deliberate starter stubs

- `detectFull`: delegates to email-only `detectFast`; NER merge not implemented.
- `createNerRunner`: resolves to a runner returning `[]`; no model is loaded.
- `computeScore`: returns `{ score: 100, daily: [] }`; no scoring is computed.

## Pending role-specific work

- Person 1: remaining detectors, saved user terms, name dictionary, overlap
  resolution, topics, real NER, PDF/DOCX/code extraction, scoring and accuracy.
- Person 2: WXT setup, site adapters, all guards/overlays, gate UI, internal
  extension API, offscreen inference, approvals/maps/events storage.
- Person 3: done for 5 of 8 tools. Knowledge base loaded (169 chunks), Cortex
  Search live, API verified end to end (snowflake → cache, 400, CORS), cited
  fallbacks prewarmed for chatgpt, claude, gemini, copilot, grammarly.
  Still open: policy text for perplexity, deepseek, meta_ai (sites block
  scripts; paste from a browser), fuller ChatGPT text (currently paraphrases),
  then reload + REFRESH + prewarm. See `snowflake/README.md`.
- Person 4: Next.js setup, export parser/worker, synthetic export generator,
  story/report, tool-safety card, landing page and DigitalOcean deployment.

No end-to-end checklist item has passed yet. Starter tests cover only the
implemented module behavior; they do not establish privacy protection.
