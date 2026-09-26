# Person 3 — Snowflake Tool-Safety API + Extension Pages + File Gate

> Give your coding LLM this file **together with** `00-overview-and-contracts.md`. Implement contract 5.6 (API) exactly, use contracts 5.1–5.5 for the extension pages, and build the file gate only through contract 5.7 (`src/api.ts`).

## Your mission
1. **Snowflake RAG (hours 0–10):** load official AI-tool privacy pages into Snowflake, and build `GET /api/tool-safety` that answers four fixed questions with citations using Cortex Search + the Cortex LLM (Snowflake prize + Assurant's tool-selection pillar).
2. **Extension pages (hours 10–17):** the **dashboard** (items caught, privacy score, trends, recent events, clear data), the **settings page** (your details, always allow, detection types, sites) and the **toolbar popup**.
3. **File gate (hours 17–21):** catch picked or dropped files, extract text locally, scan, and show the gate popup: *Rename & upload* (redacted .txt) / *Upload as is* / ✕, or "Can't check this file".

You own: `apps/web/app/api/**`, `apps/web/lib/server/**`, `snowflake/**` (Person 1 adds `snowflake/kb/<tool>/` after hour 12), `fixtures/tool-safety/`, `apps/extension/entrypoints/{dashboard,options,popup}/`, `apps/extension/src/guards/fileGate.ts`, `apps/extension/src/shared-ui/`.

## What you depend on
| Need | From | Until ready |
|---|---|---|
| Repo | Person 4, 0:30 | Start the Snowflake account (Step 1) |
| Engine (`computeScore`, `EXPLANATIONS`, `DEFAULT_SETTINGS`, `redactText`, `maskValue`) | Person 1, stub at hour 1 | Stub |
| `events` in storage | Person 2, hour 12 | Your dev "Load sample events" button |
| `src/api.ts` (contract 5.7) | Person 2, stub at hour 6, real by 17 | You start the file gate at hour 17 |
| Deployment of your route | Person 4 | Run locally with `npm run dev -w apps/web` |

---

## Step 1 — Snowflake account and smoke test (hour 0–1)
- Sign up with the MLH Snowflake student trial. Pick a region where Cortex LLM functions are available (AWS US East/West are safest; check Snowflake's Cortex availability page).
- In a Snowsight worksheet run `SELECT SNOWFLAKE.CORTEX.COMPLETE('mistral-large2', 'Say hello in 3 words');`. If the model name fails, try others your account lists (e.g. `llama3.1-70b`). **If Cortex isn't available at all, tell the team immediately.**
- By 1:30: `fixtures/tool-safety/chatgpt.json` (contract 5.6 shape, `source: "fallback"`, every answer starting `SAMPLE — `) and a fixture version of the route, so Person 4 can build the card UI.

## Step 2 — Snowflake knowledge base (hours 1–6)
**Collect** ChatGPT's official pages first (privacy policy + help pages on data controls, training, retention, deleting chats) into `snowflake/kb/chatgpt/<slug>.txt`:
```
URL: https://...
TITLE: ...
<page text without menus/footers>
```
Person 1 adds 7 more tools between hours 12 and 16; re-run the loader and prewarm then.

**`snowflake/setup.sql`** (Snowsight worksheet):
```sql
CREATE DATABASE IF NOT EXISTS PROMPTSHIELD;
CREATE SCHEMA IF NOT EXISTS PROMPTSHIELD.KB;
CREATE WAREHOUSE IF NOT EXISTS PS_WH WAREHOUSE_SIZE='XSMALL' AUTO_SUSPEND=60 AUTO_RESUME=TRUE;
CREATE OR REPLACE TABLE PROMPTSHIELD.KB.POLICY_CHUNKS (TOOL_ID STRING, TOOL_NAME STRING, SOURCE_URL STRING, SOURCE_TITLE STRING, CHUNK_TEXT STRING);
-- run load_kb.py, then:
CREATE OR REPLACE CORTEX SEARCH SERVICE PROMPTSHIELD.KB.POLICY_SEARCH
  ON CHUNK_TEXT ATTRIBUTES TOOL_ID WAREHOUSE = PS_WH TARGET_LAG = '1 day'
  AS SELECT CHUNK_TEXT, TOOL_ID, TOOL_NAME, SOURCE_URL, SOURCE_TITLE FROM PROMPTSHIELD.KB.POLICY_CHUNKS;
```
**`snowflake/load_kb.py`** (`pip install "snowflake-connector-python[pandas]"`): read files → split on blank lines → pack into ~1,200-char chunks with 200-char overlap → DataFrame (`TOOL_ID, TOOL_NAME, SOURCE_URL, SOURCE_TITLE, CHUNK_TEXT`) → `write_pandas(conn, df, "POLICY_CHUNKS", database="PROMPTSHIELD", schema="KB", overwrite=True)`.

**Test in Snowsight first:**
```sql
SELECT SNOWFLAKE.CORTEX.SEARCH_PREVIEW('PROMPTSHIELD.KB.POLICY_SEARCH',
  '{"query":"is my content used to train models","columns":["CHUNK_TEXT","SOURCE_URL"],"filter":{"@eq":{"TOOL_ID":"chatgpt"}},"limit":4}');
SELECT SNOWFLAKE.CORTEX.COMPLETE('mistral-large2', 'Say hello in 3 words');
```
If the model name fails, try others your account offers (e.g. `llama3.1-70b`) and store the working one in `SNOWFLAKE_MODEL`. If Cortex isn't available in your region, tell the team immediately; the prewarmed fallback (Step 3) keeps the demo alive.

**Auth:** a Programmatic Access Token (Snowsight → profile → Programmatic access tokens). If Snowflake requires a network policy for PATs, create one allowing all IPs for the hackathon, or use key-pair (JWT) auth.

## Step 3 — Tool-safety API (`app/api/tool-safety/route.ts`, `lib/server/*`) (hours 6–10)
`.env.local` (and give the same names/values to Person 4 for DigitalOcean's encrypted env vars): `SNOWFLAKE_ACCOUNT_URL`, `SNOWFLAKE_PAT`, `SNOWFLAKE_WAREHOUSE=PS_WH`, `SNOWFLAKE_ROLE`, `SNOWFLAKE_MODEL`, `WEB_ORIGIN`.

**Snowflake client (`lib/server/snowflake.ts`, server only):** headers `Authorization: Bearer <PAT>`, `X-Snowflake-Authorization-Token-Type: PROGRAMMATIC_ACCESS_TOKEN`, JSON.
- Search: `POST {ACCOUNT_URL}/api/v2/databases/PROMPTSHIELD/schemas/KB/cortex-search-services/POLICY_SEARCH:query` with `{ query, columns: ["CHUNK_TEXT","SOURCE_URL","SOURCE_TITLE"], filter: { "@eq": { "TOOL_ID": toolId } }, limit: 4 }` → `results[]`.
- Complete: `POST {ACCOUNT_URL}/api/v2/statements` with `{ statement: "SELECT SNOWFLAKE.CORTEX.COMPLETE(?, ?)", timeout: 60, warehouse, role, bindings: { "1": { type: "TEXT", value: model }, "2": { type: "TEXT", value: prompt } } }` → `data[0][0]`.
- 20 s timeout, one retry. If a shape is rejected, check Snowflake's REST docs and the MLH Snowflake tutorial repo.

**Answers (`lib/server/toolSafety.ts`):** four fixed questions (never a chat box): training by default, how long data is kept, how to stop training, how to delete chats. For each (in parallel): search → prompt:
```
You answer questions about an AI tool's privacy practices for ordinary users.
Use ONLY the excerpts below. If they don't answer the question, say exactly:
"The policy pages we checked don't clearly say."
Write 1–3 short, plain-English sentences. Return ONLY JSON: {"answer": "...", "source_numbers": [1, 2]}
Question: {question}
Excerpts:
[1] ({SOURCE_TITLE}, {SOURCE_URL}) {CHUNK_TEXT}
...
```
Strip code fences → `JSON.parse` → zod. **Citations may only be URLs from the retrieved excerpts.** Parse failure → raw text + the top excerpt's URL.

**Route:** validate `tool` (ToolId) → 400 if invalid → in-memory cache (24 h) → `source: "cache"`; else generate → cache → `source: "snowflake"`; any error → `fixtures/tool-safety/<tool>.json` with `source: "fallback"`. CORS: allow `chrome-extension://*` and `WEB_ORIGIN`; handle `OPTIONS`. Simple rate limit: 60 requests/minute/IP. Never log request details beyond status.

**Prewarm (`npm run prewarm -w apps/web`):** generate all tools and write real answers into `fixtures/tool-safety/<tool>.json` (replacing the SAMPLE ones). Run at hour 11 and hour 20, so the fallback is real and honest.

**Card UI** is built by Person 4 on the website (and optionally by Person 2 in the extension); you own the data. Post a sample response in team chat at hour 10.

---

## Step 4 — Extension pages (hours 10–17)
Stack: React + Tailwind + Recharts inside the extension (Person 2 adds the dependencies at hour 0; tell them if you need more). Pages are WXT HTML entrypoints: `entrypoints/dashboard/index.html` + `main.tsx`, `entrypoints/options/index.html` + `main.tsx`. Open the dashboard from your toolbar popup (Step 5) and the settings page via `chrome.runtime.openOptionsPage()`.

`src/shared-ui/`: colors per severity (high red `#E24B4A`, medium amber `#EF9F27`, low grey), a `TypeBadge` component, and `formatRelativeTime`. Person 2 may import these for popups.

## Step 4a — Dashboard (`entrypoints/dashboard`)
Reads `events` and `settings` from `chrome.storage.local`; listens to `chrome.storage.onChanged` and updates live.
1. **Tiles:** personal info caught (total events) · renamed · sent as is · privacy score (`computeScore`) in a colored ring (red < 40, amber 40–70, green > 70) with a "How is this calculated?" tooltip listing the penalties.
2. **By type:** horizontal bar chart (labels from `EXPLANATIONS`).
3. **By site and by source:** two small bar charts (ChatGPT/Claude/Gemini; paste/file/typed).
4. **Score trend:** 30-day line chart from `computeScore(events).daily`.
5. **Recent events:** table of the latest 20: time ("2 min ago"), site, source, type badge, action badge (Renamed green, Sent as is red, Allowed grey). **No values anywhere.**
6. **Clear my data:** confirm dialog → `chrome.storage.local.set({ events: [] })`.
7. Link: "See what you shared before installing PromptShield →" (Person 4's website `/scan`).
8. Empty state: "No activity yet. Paste something into ChatGPT to see PromptShield work."
9. **Dev-only "Load sample events" button** (hidden in production builds) that writes ~60 realistic fake events over 20 days, so you can build before Person 2's logging is ready.

## Step 4b — Settings (`entrypoints/options`)
Reads/writes `settings` (`Settings` contract; missing → `DEFAULT_SETTINGS`).
- **Your details (always flagged):** names, emails, phones, address, custom private words; comma-separated inputs. One line of explanation: "Stored only on this device. Makes detecting your own details 100% reliable."
- **Always allow:** list with add/remove (e.g. your work email you're happy to share). Explanation: "These are never asked about."
- **Detection types:** a checkbox per `EntityType` (ORGANIZATION off by default).
- **Sites:** toggles for ChatGPT, Claude, Gemini.
- **Save** writes to storage; Person 2's content script listens to `onChanged` and applies it immediately.

---


## Step 5 — Toolbar popup (`entrypoints/popup`)
Small (320 px): site status ("Protecting ChatGPT ✓" + an off toggle for this site, writing `settings.sites`), today's count of items caught, **Open dashboard** (`chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") })`), **Settings** (`chrome.runtime.openOptionsPage()`), **Scan my AI history** (Person 4's website `/scan`).

---

## Step 6 — File gate (`src/guards/fileGate.ts`, hours 17–21; first to cut if behind)
Use **only** `src/api.ts` (contract 5.7). Export `initFileGate()`; Person 2's `content.ts` calls it at `document_start` inside a try/catch.

1. **Register listeners** in `initFileGate` on `window`, capture phase:
   - `change`: target is `input[type="file"]` with files, and `allowNextFileChange` is false → `e.stopImmediatePropagation()`.
   - `drop`: `e.dataTransfer?.files.length > 0` and the drop target is inside the chat area → `e.preventDefault(); e.stopImmediatePropagation()`.
   - Do nothing if `getAdapter()` is null (site unprotected).
2. **For each file:** `r = await extractFile(file)`.
   - `r.status !== "ok"` → `openGate({ mode: "cant_check", title: "Can't check this file", fileName, reason: r.reason, items: [], topics: [] })` → `secondary` (Upload anyway) attaches the original; `cancel` stops. **Never treat unreadable files as clean.**
   - `"ok"` → `result = await detectWithTimeout(r.text)` → `{ toAsk, allowlisted } = await splitForPrompt(result)` → log allowlisted with `logEvents(allowlisted, "file", "allowlisted")`.
   - `toAsk` empty → attach the original.
   - Otherwise build `items` (label from `EXPLANATIONS`, value, why, placeholder from `getMapper()`) → `openGate({ mode: "file", title: `${fileName} contains ${toAsk.length} items`, ... })`:
     - `primary` (Rename & upload) → `redacted = redactText(r.text, toAsk, mapper)`; `saveMapper(mapper)`; attach `new File([redacted], baseName + "-redacted.txt", { type: "text/plain" })`; `logEvents(toAsk, "file", "renamed")`.
     - `secondary` (Upload as is) → attach the original; `approve(toAsk)`; `logEvents(toAsk, "file", "as_is")`.
     - `cancel` → nothing.
3. **Attach:**
   - Picker: `const dt = new DataTransfer(); files.forEach(f => dt.items.add(f)); input.files = dt.files; allowNextFileChange = true; input.dispatchEvent(new Event("change", { bubbles: true }));` then reset the flag.
   - Drop: dispatch a new `DragEvent("drop", { dataTransfer: dt, bubbles: true, cancelable: true })` on the original target, with a flag so your own listener lets it through.
4. **Test each site.** If a site ignores the re-dispatched event: for Rename, insert the redacted text into the chat box instead with a short note ("Attached as text because this site blocked the file swap"); for as-is, show "Please attach the file again" and pause the gate for 10 seconds.
5. Multiple files: process in order; one gate per file with findings.

---

## Step 7 — Testing
1. `curl localhost:3000/api/tool-safety?tool=chatgpt` → 4 answers; every citation is a knowledge-base URL; second call `source: "cache"`; `?tool=abc` → 400; broken PAT → real prewarmed `fallback`; a `chrome-extension://` origin is allowed.
2. Dashboard with sample events: tiles, charts, trend, recent events without values; live update when events change; Clear my data works.
3. Settings: saved details are flagged immediately in ChatGPT; always-allow items are never asked about; turning a site off disables all guards there.
4. Toolbar popup: toggle and links work.
5. File gate on ChatGPT, Claude, Gemini: `.txt`/PDF/DOCX with an email → gate → Rename & upload attaches `…-redacted.txt`; Upload as is attaches the original; an image and a scanned PDF → "Can't check".
6. DevTools Network: no file contents or values leave the laptop.

## Done when
Real, cited answers for 8 tools are served (with an honest fallback), the dashboard/settings/popup work with real events, and the file gate works on at least ChatGPT (or was cleanly cut).
