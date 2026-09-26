# MindYourPrompt

See what you've already told AI, and stop telling it more.

MindYourPrompt is the website's public name. The shared `@promptshield/*` packages, WASM paths, and extension artifact keep their existing names for team compatibility. The exact domain extension and registration are pending.

Person 4's npm-workspaces monorepo, local ChatGPT-export website, synthetic fixtures, and integration handoff. The website has a landing page, `/scan`, a worker-driven recap, and a cleanup report. Export contents are never uploaded.

## Run locally

Use Node 22 or later (tested with Node 26).

```sh
npm ci
npm run dev
# http://localhost:3000
```

```sh
npm test
npm run typecheck
npm run lint
npm run build
npm run start -w apps/web
```

Next.js App Router, TypeScript, Tailwind 4, Framer Motion, Recharts, JSZip, and react-dropzone. The standard ESLint configuration comes from create-next-app. Webpack is selected explicitly for the module worker bundle. No external fonts or analytics are loaded.

## Current integration status

- `packages/engine` contains the real shared detection engine: pattern rules, checksums, name dictionary, user terms, topics, and local Transformers.js NER. Both uploaded exports and the synthetic sample are available at `/scan`.
- The scan worker sets ONNX `wasmPaths` to `/promptshield-wasm/` and `numThreads = 1`. `predev` and `prebuild` copy the matching `.mjs` and `.wasm` runtime files from the installed Transformers.js package into the ignored public directory. Run `npm run copy-wasm -w apps/web` manually if needed. The copy script resolves the package entry because Transformers.js 3.8.1 does not export its `package.json` subpath.
- Model assets download from Hugging Face and its delivery hosts, then inference runs locally. Successful candidate inference shows **AI name detection is on** in the report. Download/inference failure retains pattern findings and displays an explicit unavailable notice. Text is never sent for inference.
- Person 3 owns `apps/web/app/api/**` and `apps/web/lib/server/**`; neither has been created. The card requests `GET /api/tool-safety?tool=chatgpt`. If unavailable, a clearly labeled **local mock** renders all four questions. Mock answers make no verified policy claims and contain no fake citations. A valid API response automatically replaces the mock.
- Person 2 will supply `apps/web/public/download/promptshield-extension.zip`. Until that file exists at build time, the site says “coming soon” and has no broken download link.
- The website work is pushed on `Krishna` with PR #3 open. Deployment, domain purchase, and Devpost submission are pending account/team details. New local preparation commits await a manual push. No credentials are required for local work. `// TODO(deploy)`: configure the DigitalOcean app and domain; relative API URLs need no change.

## Ownership

```
packages/engine/       Person 1 (real shared detection engine)
apps/extension/        Persons 2 and 3 (empty placeholder)
apps/web/             Person 4, except API and lib/server (Person 3)
snowflake/            Person 3; policy knowledge base from Person 1
scripts/              Synthetic-export generator
fixtures/fake-export/ Synthetic data only
```

## Synthetic export

```sh
python3 -m venv .venv
.venv/bin/pip install -r scripts/requirements.txt
.venv/bin/python scripts/generate_fake_export.py --as-of 2026-09-26
```

Omit `--as-of` to generate the preceding 14 months from today. Faker and the random generator are seeded with 42. The generator creates 220 conversations, 2–8 user messages per conversation, and 80–400-word assistant replies. Activity is weighted toward recent dates. The fixed demo persona uses an example.com email, fictional address, reserved phone number, nonfunctional API key, Luhn-valid test card, and checksum-valid routing number. No real exports belong in Git.

Outputs: `fixtures/fake-export/conversations.json`, `fake-export.zip`, `manifest.json`, and `apps/web/public/sample/fake-export.zip`. The manifest documents the planted counts. The ZIP includes dummy `chat.html`. Cohorts are non-overlapping, and repeated assistant messages contain no planted details.

## Parser and privacy

`lib/report/parseExport.ts` accepts JSON arrays or ZIP entries matching `/(^|\/)conversations(-\d+)?\.json$/`. It combines split exports, deduplicates conversation/message IDs, accepts string parts of text and multimodal messages, ignores system/tool/image contents, and falls back to conversation timestamps. Every mapping branch is included, not only the active branch. Counts include valid user/assistant conversations; only user messages enter detection.

Input and expanded archive limits are 200 MB. Invalid and unrelated files return the requested friendly error. Assistant text stays in worker memory and never enters report findings. Raw titles are replaced with neutral conversation labels because titles may contain personal information. Only masked examples and necessary chat IDs leave the worker. The worker is terminated after completion or cancellation. Report contents stay in React memory; cleanup IDs alone use sessionStorage. Clearing the report clears in-memory details; closing the tab ends the report.

The browser can download the synthetic sample and NER model assets. Policy cards send only the fixed tool name. Normal Next.js page/JS/CSS requests also occur. No file, text, finding, report, or event data is sent to a server. A literal “only one network request” claim would be inaccurate.

The NER path calls `createNerRunner` and `detectFull` for up to 400 recent candidate user messages below 3,000 characters. Failure preserves fast results and reports that AI detection was unavailable. The success flag is set only after candidate inference completes. Model downloads and cached runs may have different timings.

## Verification and handoff

Unit tests exercise multipart/split exports, invalid ZIP and JSON shapes, unique chat counts, assistant exclusion, masked output, timeline gaps, scoring, and the generated sample. The fixture has not been compared with a real ChatGPT export; do that privately when one arrives.

Verified in the integrated Chrome worker: the synthetic sample reached its recap in approximately 13 seconds including the model download. Both same-origin runtime assets returned HTTP 200, the report showed “AI name detection is on,” and all ten planted category counts matched the manifest. Full NER additionally identified places in the 14 address conversations. The browser check recorded no request bodies: remote requests were model/config/tokenizer assets only. Build, lint, TypeScript, 126 engine tests, and six website tests passed. Timings depend on the device and network.

The formula in the brief is used exactly. Scores are not tuned by inventing counts. The real engine’s fast pass matches every planted category count in `fixtures/fake-export/manifest.json`. Full NER may add locations or overlapping name interpretations; review extra categories with the engine owner rather than changing ground-truth counts to hide gaps.

Next checks after teammates merge:

1. Run the sample with the model available; verify the positive AI status and local WASM requests. Compare any extra full-NER findings with the engine owner.
2. Merge Person 3's route; verify four answers, real citations, loading, and retry.
3. Add the extension artifact and verify the download and unpacked installation.
4. Run all workspace builds and engine tests. Run the overview's extension checklist with Persons 2–3.
5. Compare parser behavior with a private real export; inspect Network for data leakage.
6. At hours 9–12, deploy from the user-created GitHub repository and connect the chosen domain.

Integration work is on `Krishna`; [PR #3](https://github.com/JyothiNandhan/ShellHacks_2026/pull/3) is open for review. New local preparation commits still need a manual push.

Deployment settings and remaining team checks are in [the deployment handoff](apps/web/deploy/README.md), with an [App Platform spec](apps/web/deploy/app.yaml). The [submission draft](apps/web/submission/draft.md) and [demo script](apps/web/submission/demo-script.md) identify the fields and integrations still needed before publishing.

Browser verification: with the production server running, use `npm run test:browser -w apps/web`. Set `CHROME_PATH` if Chrome is installed somewhere other than the default macOS path. Screenshots are written under `/tmp/promptshield-browser`.
