# PromptShield

Shared starting scaffold for the four-person project described in
[the overview and contracts](docs/00-overview-and-contracts.md).

## Start

Requires Node.js 22+ and npm 10+.

```sh
npm ci
npm run build
npm run typecheck
npm test
```

The root is already the `promptshield/` directory in the design. Do not create
another nested repository. All commands above run from this directory.

## What exists

- npm workspaces for `packages/engine`, `apps/extension`, and `apps/web`.
- Shared entity, event, settings, and tool-safety contracts.
- A dependency-free engine main entry with an **email-only starter detector**,
  stable placeholder mapping, redaction, masking, explanations, and defaults.
- Separate NER and file entry points so future heavy dependencies stay out of
  extension content scripts.
- Executable contract tests for the implemented starter behavior.

**This is an integration scaffold, not a working privacy product.**
`detectFull` currently uses the email-only fast detector; it does not run NER.
`createNerRunner` is a stub returning no entities; `computeScore` returns 100
with no trend data. File extraction handles `.txt` only. These stubs match the
overview's initial integration milestone and must be replaced before any demo
claims detection, AI coverage, or privacy scores. They make no network requests.

The web and extension workspaces reserve ownership and link the engine; they
do not yet have UI, framework dependencies, build scripts, or runnable servers.
The root build currently builds **only the engine**, not the future applications.
There is no tool-safety route, Snowflake connection, deployment, or Git remote.

## Ownership and next steps

| Location | Next task file |
| --- | --- |
| `packages/engine`, `fixtures/engine-samples.json` | Person 1: engine |
| `apps/extension` (guards, adapters, internal API, WXT config) | Person 2: guards |
| Extension dashboard/options/popup/file gate, web API, `snowflake` | Person 3: Snowflake and pages |
| Root setup, web UI/export worker, sample export generator, deployment | Person 4: website |

Provide the relevant `01`–`04` task file next to continue your part. See
[implementation status](docs/implementation-status.md) for the explicit backlog.

## Privacy boundary

Typed/pasted text, uploaded files, export data, detected values, and events must
remain local. The future tool-safety route accepts only a tool identifier.
The future NER model needs a model download, but inference stays local.
Use synthetic fixtures only. Put personal test exports in ignored `private/`
or `exports/` directories; an ignore file cannot identify sensitive contents.
