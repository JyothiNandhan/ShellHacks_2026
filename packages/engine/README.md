# @promptshield/engine — Bhoomika's detection task

The implementation lives in the existing `bhoomika` branch. No commit or push was made by the coding agent. This branch initially contained only the root README; the extension, website, root workspace configuration and Snowflake loader are owned by the other teammates and are not present here.

## Run locally

From `repository/packages/engine`:

```powershell
npm ci
npm test
npm run typecheck
npm run test:ner
npm run test:browser
```

`test:ner` downloads the quantized model into ignored `.cache/models`, runs actual local inference, asserts both required examples and all 89 synthetic accuracy cases, and writes an ignored diagnostic report. `test:browser` requires Microsoft Edge and the model cached by `test:ner`. It launches a separate headless profile and tests actual inference and PDF/DOCX extraction in a browser Web Worker and a Manifest V3 offscreen document. Its model/runtime downloads are served from a local test server; no input is sent to Hugging Face or an inference service. The profile, models and reports are ignored by Git. Runtime network connections in the smoke harness contain asset paths only.

## Shared API and integration

Three TypeScript source entries are exported with no build step:

- `@promptshield/engine`: `detectFast`, `detectFull`, `PlaceholderMapper`, `redactText`, `maskValue`, `computeScore`, `EXPLANATIONS`, `SEVERITY_WEIGHT`, `DEFAULT_SETTINGS`, and shared types.
- `@promptshield/engine/ner`: `createNerRunner` (worker/offscreen only).
- `@promptshield/engine/files`: `extractText` and `Extracted` (worker/offscreen/page only).

Person 4 should add `packages/*` to the root npm workspaces and add the engine to the website dependencies; Next.js should use `transpilePackages: ['@promptshield/engine']`. Person 2 adds the dependency to the extension. Until the workspace exists, a consumer can use a local `file:../../packages/engine` dependency. Main-entry imports do not import Transformers.js, PDF.js or Mammoth.

```ts
import { detectFast, PlaceholderMapper, redactText } from '@promptshield/engine';
const text = 'my name is krishna and my email is krishna.test@example.com';
const result = detectFast(text);
const mapper = new PlaceholderMapper();
const safe = redactText(text, result.findings, mapper);
// my name is PERSON_1 and my email is person_1@example.com
```

### Local model runtime assets — required host setup

Copy `ort-wasm-simd-threaded.jsep.mjs` and `ort-wasm-simd-threaded.jsep.wasm` from `@huggingface/transformers/dist/` into the host's local public assets. Before constructing a runner, set `env.backends.onnx.wasm.wasmPaths` to that local asset URL and set `numThreads = 1` if the host is not cross-origin isolated. In an extension, use `chrome.runtime.getURL('promptshield-wasm/')`. In a website worker use the application's public asset URL. Example:

```ts
import { env } from '@huggingface/transformers';
import { createNerRunner } from '@promptshield/engine/ner';
env.backends.onnx.wasm!.wasmPaths = '/promptshield-wasm/';
env.backends.onnx.wasm!.numThreads = 1;
const ner = await createNerRunner();
```

Without a host override the runner uses `./promptshield-wasm/` relative to its module; it does not silently use the library's default CDN. Allow local WebAssembly (`wasm-unsafe-eval`) in the extension CSP. Model downloads require Hugging Face and its asset-delivery hosts; they contain model/config/tokenizer assets only. Run initial loading outside content scripts, keep one runner, display real progress, and handle download/offline errors in the host. `detectFull` propagates runner errors so the host can explicitly use `detectFast` on timeout/failure; it does not claim a failed NER scan succeeded.

### File handling

Plain text, code, PDF and DOCX are read locally; unsupported, empty, malformed, password-protected or oversized files return a non-ok result. Inputs above 15 MiB are rejected. PDF.js v4 removed the old `disableWorker` switch, so the bundled worker handler supplies its fake-worker fallback in the calling worker/offscreen context. No remote PDF worker URL is needed. The browser Mammoth build avoids Node filesystem dependencies. Consumers must treat every non-ok status as “cannot check”, not “clean”. OCR, spreadsheets, presentation files, cloud attachments and archives are not supported.

## Detection decisions

Source priority is saved user terms, pattern rules, NER, dictionary; severity and span length break ties. Results are sorted and never overlap. Disabled types are filtered before merging so a disabled password cannot suppress an enabled email at the same location. Allowlisted findings remain visible and are skipped during redaction. Placeholders are allocated in reading order, keyed by type and normalized value, with restored per-type counters. Only the entropy fallback lowers API_KEY severity to medium, as required by the task.

Scores use UTC calendar days for consistent results in the extension and website. The first event's partial day and the current incomplete day do not earn recovery. All available events are replayed, including events older than the 30-day chart; future or nonfinite timestamps are ignored. The chart includes today as a partial-day point. Each event penalty and each recovery are clamped immediately to 0–100.

## Model choice and evidence

`Xenova/bert-base-NER`, quantized q8, was verified against its [official ONNX model card](https://huggingface.co/Xenova/bert-base-NER) and run locally. Both required examples work:

- `my name is Krishna Teja and I live in Hyderabad` → Krishna Teja (PERSON), Hyderabad (LOCATION).
- `Priya and Rahul met Sarah in Miami` → Priya, Rahul, Sarah (PERSON), Miami (LOCATION).

Real inference splits unfamiliar names into low-confidence word pieces with inconsistent labels (Rohith = `R`/B-PER 1.00, `##oh`/I-PER 0.46, `##ith`/B-PER 0.54; Bindhu ends with `##u`/O). Aggregation therefore:

- joins every word piece glued to an active entity, whatever its label (only entity-labelled pieces count toward the score);
- expands each entity to whole-word boundaries (`[\p{L}\p{M}'’-]`), drops a trailing possessive, merges overlapping spans and PERSON spans separated by a single space;
- keeps PERSON at ≥ 0.6 when every word is capitalized, 3+ letters and not a stopword, otherwise ≥ 0.85; LOCATION/ORGANIZATION ≥ 0.90; MISC is excluded (`src/nerThreshold.ts`, shared by the runner and `detectFull`).

O tokens participate in alignment to correctly locate repeated names. Chunks preserve original UTF-16 offsets and are at most 1,500 characters. Festival and holiday names are stopwords because the lower threshold otherwise flagged "Happy Diwali" as a person.

**Model comparison (2026-09-26),** 16 names across Indian and Western test sentences plus non-name controls:

| Model | Full names | Wrong/partial | Download | Inference (10 sentences) |
| --- | --- | --- | --- | --- |
| `Xenova/bert-base-NER` (kept) | 16/16 | 0 | 105 MB | 169 ms |
| `Xenova/bert-base-multilingual-cased-ner-hrl` | 13/16 (missed Bhoomika, Bindhu; "Sai" without "Chetan") | 1 | 174 MB | 759 ms |

General name detection remains best effort; these examples are not a guarantee for all languages or text formats.

## Dictionary sources

`src/data/first-names.json` contains 5,762 unique lowercase first names (well below 1.5 MB):

- U.S. Social Security Administration baby-name data, years 1980/1990/2000/2010/2020, entries with at least 100 births. [SSA source](https://www.ssa.gov/oact/babynames/limits.html). SSA rejected direct downloads during setup, so the generator used the [SSA data mirror](https://github.com/hackerb9/ssa-baby-names/tree/main/raw-data). This is U.S. government data.
- Indian names from [Faker's en_IN provider](https://github.com/joke2k/faker/blob/master/faker/providers/person/en_IN/__init__.py), MIT licensed; full notice is in `src/data/faker-LICENSE.txt`.

The 10,000-word exclusion list is from [first20hours/google-10000-english](https://github.com/first20hours/google-10000-english); its actual license/provenance notice is included as `src/data/common-words-LICENSE.md`. That notice permits educational/personal research use and cautions about commercial licensing. This hackathon snapshot is not represented as an unrestricted commercial dictionary. The additional stopword list is maintained in this package. Dictionary filtering deliberately removes common-word names and avoids sentence-initial guesses. User-saved names and strong name phrases still work without the dictionary.

Regenerate with `python scripts/fetch-dictionaries.py`; review upstream source and license changes before updating.

## Validation and remaining teammate checks

Validated on 2026-09-26, Windows, Node 24:

- 126 Vitest tests across 16 files; strict TypeScript check passes.
- 89 synthetic cases, including 20 additional realistic fake messages, tested through fast and full detection; actual q8 inference also matches all expected findings.
- 249-word fake resume, all requested rule categories, negatives, offsets, merging, allowlist, mapper restoration, topic flags, score recovery/clamping.
- Fast scan of 10,000 characters: warmed median approximately 0.9–1.1 ms on this machine (20 ms budget).
- Real text PDF, scanned/empty multi-page PDF and DOCX extraction; malformed/unsupported and oversized input handling.
- Isolated Edge Web Worker and MV3 offscreen-document smoke tests with actual WASM inference and file extraction.

Still requires the teammates' application code: test live typing/pasting on ChatGPT/Claude/Gemini, compare Person 4's planted export counts with the final report, and inspect the integrated application network log. Those applications and export generator are absent from this branch. The Snowflake loader/account are also absent: Person 3 must ingest the knowledge-base files and verify citations. No messages have been sent to teammates.

## Policy knowledge base handoff

`snowflake/kb/` contains dated summaries from 2–3 official sources per extra tool. Each file begins with URL and TITLE and explicitly identifies its content as a summary, not a full copyrighted page reproduction. Copilot sources distinguish the newer August 2026 experience from older training defaults. Meta's publicly accessible sources do not establish every regional retention/opt-out answer: the RAG response must state missing information instead of inventing it. Person 3 should reload these sources and preserve date, scope and source URL in citations.

## Your manual commit commands

Run these only when you have reviewed the work, from PowerShell:

```powershell
cd C:\Users\bhoom\OneDrive\Desktop\shellhacks\repository
git branch --show-current
git status --short
git add packages/engine fixtures/engine-samples.json snowflake/kb
git diff --cached --stat
git commit -m "Implement PromptShield detection engine and policy knowledge base"
git push origin bhoomika
```

The branch command should print `bhoomika`. The engine `.gitignore` excludes dependencies, downloaded models, browser profiles and test reports. The earlier `shellhacks/packages` and `shellhacks/fixtures` directories are pre-clone drafts; this repository copy is the working version.
