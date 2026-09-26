# Mind Your Prompt — submission draft

Status: draft. Fill the fields and verify pending integrations before submitting.

**Tagline:** See what you've already told AI, and stop telling it more.

**Repository:** https://github.com/JyothiNandhan/ShellHacks_2026

**Live URL:** TODO(deploy)

**Video URL:** TODO(record)

**Team names / Discord contact:** TODO(team)

## Inspiration

Personal details accumulate across AI conversations. It is difficult to remember what we shared, find the relevant chats, and decide what to clean up. Mind Your Prompt turns a conversation export into a private, understandable look back.

## What the website does

The website scans a ChatGPT export in the browser, identifies categories of personal information in user messages, and presents a visual recap and cleanup report. It shows masked examples and lets the user track conversations they have reviewed. A synthetic sample makes the workflow available without sharing a real export.

## How we built it

The website uses Next.js, React, TypeScript, Tailwind CSS, Framer Motion, and Recharts. ZIP parsing and the shared detection engine run in a Web Worker. Transformers.js and ONNX Runtime Web support local name detection, with matching WASM runtime files served from the website. Model assets download on first use; conversation contents are not sent for inference.

The shared engine combines pattern rules, validation, dictionary matching, and NER. Website work and integration were handled by Krishna; keep the engine, extension, and policy API credited to their respective teammates in the final team description.

## Challenges and validation

We had to coordinate the worker's WASM asset paths, tolerate model download failure with a visible status, parse split exports, exclude assistant text from detection, and avoid leaking raw titles or findings from the worker. The synthetic generator provides known planted category counts for repeatable checks.

The integration check passed 126 engine tests and six website tests, plus production build, lint, and TypeScript checks. In one local Chrome run, the sample completed in about 13 seconds including model downloads, and all planted category counts matched. Full NER also identified places in address conversations. These measurements are specific to that run, not a performance guarantee. A private real-export check is still pending.

## Sponsor evidence to finish

| Track | Evidence/status to verify before claiming completion |
| --- | --- |
| Assurant | Privacy-focused consumer experience and cleanup workflow; check the actual track requirements. |
| Microsoft | Local ONNX Runtime Web inference demonstrated with AI detection enabled; confirm eligibility against the track requirements. |
| Snowflake API | Pending Person 3's real API and cited policy data. Do not present local mock cards as a Snowflake integration. |
| DigitalOcean | Deployment template ready; add the successful live deployment URL and evidence. |
| GoDaddy Registry | Domain not chosen/connected; add the registered domain and verify track eligibility. |

## Before submission

- Replace all TODO fields and add every teammate's full name.
- Describe the extension and policy API only after testing their merged implementations.
- Add the live HTTPS link, screenshots using synthetic data, and backup video.
- Check the event's current submission requirements and sponsor eligibility in the submission form.
- Review the final text as a team; this draft has not been submitted.
