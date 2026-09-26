# PromptShield

See what you've already told AI, and stop telling it more.

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

- `packages/engine` is **TEMPORARY STUB — Person 1 will replace this whole package**. It exports the frozen 5.1–5.2 signatures, detects emails only, returns no NER entities, reads `.txt` only, and returns a score of 100 from `computeScore`. Placeholder mapping is scaffolding, not production behavior.
- `/scan` currently permits the synthetic sample only. This avoids presenting an email-only check as a complete audit of a real export. Reports and scores are explicitly labeled incomplete. The sample has 23 chats with email findings; do not claim the other planted categories are detected yet.
- Person 1 should replace the entire engine package, including its `package.json`. The temporary manifest's `promptshieldTemporaryStub` flag drives the preview label and real-file gate. After replacement, run `npm install` and restart Next.js. Web and worker imports already use `@promptshield/engine` and `@promptshield/engine/ner` directly.
- Person 3 owns `apps/web/app/api/**` and `apps/web/lib/server/**`; neither has been created. The card requests `GET /api/tool-safety?tool=chatgpt`. If unavailable, a clearly labeled **local mock** renders all four questions. Mock answers make no verified policy claims and contain no fake citations. A valid API response automatically replaces the mock.
- Person 2 will supply `apps/web/public/download/promptshield-extension.zip`. Until that file exists at build time, the site says “coming soon” and has no broken download link.
- Deployment, domain purchase, remote branches, pushes, and Devpost submission are deferred as requested. No credentials are required for local work. `// TODO(deploy)`: configure the DigitalOcean app and domain during hours 9–12; relative API URLs need no change.

## Ownership

```
packages/engine/       Person 1 (authorized temporary stub provided)
apps/extension/        Persons 2 and 3 (empty placeholder)
apps/web/             Person 4, except API and lib/server (Person 3)
snowflake/            Person 3 (empty placeholder)
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

The browser can download the synthetic sample and, after engine integration, NER model assets. Policy cards send only the fixed tool name. Normal Next.js page/JS/CSS requests also occur. No file, text, finding, report, or event data is sent to a server. A literal “only one network request” claim would be inaccurate.

The NER path calls `createNerRunner` and `detectFull` for up to 400 recent candidate user messages below 3,000 characters. Failure preserves fast results and reports that AI detection was unavailable. A stub returning `[]` is never described as a successful AI scan. The real model and first-download latency remain Person 1 integration checks.

## Verification and handoff

Unit tests exercise multipart/split exports, invalid ZIP and JSON shapes, unique chat counts, assistant exclusion, masked output, timeline gaps, scoring, and the generated sample. The fixture has not been compared with a real ChatGPT export; do that privately when one arrives.

The formula in the brief is used exactly. Scores are not tuned by inventing counts. A sample-only stub will not produce the final 50–65 target. Shared engine exports must be integrated before acceptance testing the full planted category counts.

Next checks after teammates merge:

1. Replace the engine stub; confirm all planted counts and real NER in the worker.
2. Merge Person 3's route; verify four answers, real citations, loading, and retry.
3. Add the extension artifact and verify the download and unpacked installation.
4. Run all workspace builds and engine tests. Run the overview's extension checklist with Persons 2–3.
5. Compare parser behavior with a private real export; inspect Network for data leakage.
6. At hours 9–12, deploy from the user-created GitHub repository and connect the chosen domain.

A local Git repository is initialized on `main`. No Git commit or remote is created automatically. The working tree is ready for review and a first commit.

Browser verification: with the production server running, use `npm run test:browser -w apps/web`. Set `CHROME_PATH` if Chrome is installed somewhere other than the default macOS path. Screenshots are written under `/tmp/promptshield-browser`.
