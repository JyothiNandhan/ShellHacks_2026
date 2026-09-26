# PromptShield — Overview & Shared Contracts (4-person, middle path)

> **How to use this file:** each team member gives their coding LLM TWO files: this one plus their own task file (`01`–`04`). This file is the single source of truth. If a task file disagrees with it, this file wins. Contracts in Section 5 are frozen at hour 1; change them only if all four agree.

---

## 1. What we are building

**PromptShield shows you what you've already leaked to AI, stops new leaks at the moment you paste, upload or send, and tells you what each AI tool does with your data.**

People paste resumes, bank emails, logs and code into AI chats without noticing the personal data inside. Existing tools (Caviard, PasteSecure, RedactChat, etc.) only protect your *next* message. Nobody helps ordinary users see what they've *already* shared.

| Part | What the user does | Where it runs |
|---|---|---|
| **Look back** (website) — our USP | Drops their ChatGPT data export into our website → a "Wrapped"-style story and report: what they've shared, the riskiest chats (links to open and delete them), and cited answers about what ChatGPT does with their data. | The export is processed **100% in the browser**. Only the tool name goes to our server for the tool-safety card. |
| **Look forward** (Chrome extension) | **Paste and file gate:** content is scanned before the AI site gets it; if personal info is found, a popup offers *Rename & insert / Insert as is / ✕*. **Typing:** red underlines, green placeholder chips, a right-edge list. **Send check:** a final scan with *Rename & send / Send as is / ✕*. | 100% on the laptop. No server, no login. |
| **Dashboard** (extension page) | Sees items caught, privacy score, 30-day trend, recent events. "Clear my data". | Reads the extension's local storage. Nothing leaves the laptop. |
| **Know your tools** (Snowflake RAG) | Four fixed questions per tool with cited answers: training, retention, opt-out, deleting chats. | One API route on our server calls Snowflake. |

**Pitch:** "Other tools only protect your next message. PromptShield shows you what you've already given away, stops new leaks at the gate, and tells you what each AI tool does with your data."

### 1.1 Which tool does what
| Piece | Tool | Job |
|---|---|---|
| Detection engine | TypeScript package `@promptshield/engine` | One brain for extension + website |
| Pattern rules | Regex + Luhn (cards) + ABA checksum (bank routing) + SSN range rules | Email, phone, SSN, card, bank, API key, password, IP, DOB, address |
| Name rules | Name phrases, first-name dictionary, the user's saved details | Fast name detection (incl. lowercase "krishna") |
| **Local AI** | **transformers.js** NER model (runs in the browser) | Names and places without patterns — our "AI-powered" part for Microsoft |
| File reading | pdf.js, mammoth, `File.text()` | File → text for the file gate |
| Extension | WXT (Manifest V3) + TypeScript; React + Tailwind for extension pages | Guards, popups, overlay, dashboard, settings |
| Extension storage | `chrome.storage.session` / `chrome.storage.local` | Placeholder map, approvals / events, settings |
| Charts | Recharts | Dashboard + look-back report |
| Look-back website | Next.js + JSZip + Web Worker + Framer Motion | Parses the export locally, tells the story |
| Tool-safety answers | Next.js API route → **Snowflake Cortex Search + Cortex LLM** (REST APIs) | Cited answers from official policy pages |
| Hosting | **DigitalOcean App Platform** | Website + API route |
| Domain | **GoDaddy Registry** | Website address (the name itself is judged) |

### 1.2 What leaves the laptop
Only the **tool name** (tool-safety card) and the one-time NER model download from Hugging Face. Never typed text, pasted text, file contents, export data or events.

---

## 2. Sponsors

| Sponsor | How we satisfy it | Their tool |
|---|---|---|
| **Assurant — Take Control of AI** | Privacy protection (look back + gates + send check) and confident tool selection (tool-safety cards). Stretch: spending (subscription value). | — |
| **Microsoft — What's Missing?** | AI-powered via the local NER model; the core experience is the look-back audit (a file-based website, no chat window) plus a privacy layer; no chatbot anywhere; real tasks (auditing and deleting risky chats, cleaning a resume). | — |
| **Snowflake API** | Cortex Search + Cortex LLM via REST for cited RAG answers | Yes |
| **DigitalOcean** | Hosts the website + API route (hosting only — qualifies, unlikely to win) | Yes |
| **GoDaddy Registry — Best Domain Name** | A short, clever, memorable name (team votes at hour 1) | Yes |

Not targeted: MongoDB (no server-side data by design), Gemini, ElevenLabs, Tiger Data, State Farm, Waymo, Blackstone, INIT, Solana, Sperry.

**Guardrails (everyone):**
1. No free-text chat box anywhere (Microsoft).
2. The NER model is **required**. The name dictionary is an extra layer, never a replacement (Microsoft).
3. No text, values or events are ever sent to any server.
4. No fake numbers in the demo; costs (if built) show "as of" dates.
5. Microsoft pitch: lead with the look-back audit.

---

## 3. Architecture

```
┌──────────────────────────── User's laptop ──────────────────────────────┐
│ Chrome extension                         Look-back website (browser)     │
│  content script (Person 2):              (Person 4)                      │
│   paste gate · typing overlay ·          dropzone → Web Worker:          │
│   send check · right list                JSZip → parse → engine scan     │
│  file gate (Person 3)                     → story + report               │
│  gate iframe popup + offscreen NER (P2)                                  │
│  dashboard, settings, toolbar popup (P3)                                 │
│  chrome.storage: map, approvals, events, settings                        │
│              └──────── both import ──────────┘                           │
│                 @promptshield/engine (Person 1)                          │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │ tool name only
┌────────── DigitalOcean App Platform (deploy: Person 4) ─────────────────┐
│ Next.js: website pages (P4) + GET /api/tool-safety (P3) → Snowflake      │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Repository and ownership

```
promptshield/
├─ package.json                         (Person 4 — npm workspaces root)
├─ packages/engine/                     (Person 1)
├─ apps/extension/
│  ├─ entrypoints/dashboard/            (Person 3)
│  ├─ entrypoints/options/              (Person 3 — settings page)
│  ├─ entrypoints/popup/                (Person 3 — toolbar popup)
│  ├─ src/guards/fileGate.ts            (Person 3)
│  ├─ src/shared-ui/                    (Person 3 — colors, badges; Person 2 may import)
│  └─ everything else                   (Person 2 — incl. wxt.config.ts, package.json, src/api.ts)
├─ apps/web/
│  ├─ app/api/**, lib/server/**         (Person 3 — tool-safety route)
│  └─ everything else                   (Person 4 — website, config, deploy)
├─ snowflake/                           (Person 3; Person 1 adds kb/<tool>/ files after hour 12)
├─ scripts/generate_fake_export.py      (Person 4)
└─ fixtures/
   ├─ engine-samples.json               (Person 1)
   ├─ fake-export/                      (Person 4)
   └─ tool-safety/*.json                (Person 3)
```
Edit only what you own. Dependencies for `apps/extension` are added by Person 2 (Person 3 asks); for `apps/web` by Person 4 (Person 3 asks).

---

## 5. Shared contracts (frozen at hour 1)

### 5.1 Types — `packages/engine/src/types.ts`
```ts
export type ToolId = "chatgpt" | "claude" | "gemini" | "copilot" | "perplexity" | "deepseek" | "meta_ai" | "grammarly";
export type Site = "chatgpt" | "claude" | "gemini";

export type EntityType =
  | "PERSON" | "EMAIL" | "PHONE" | "ADDRESS" | "SSN" | "CREDIT_CARD" | "BANK"
  | "API_KEY" | "PASSWORD" | "IP_ADDRESS" | "DATE_OF_BIRTH"
  | "LOCATION" | "ORGANIZATION" | "USER_TERM";
export type TopicType = "HEALTH" | "FINANCE" | "LEGAL";
export type Severity = "high" | "medium" | "low";
export type Source = "user_terms" | "rule" | "ner" | "dictionary";   // merge priority in this order

export interface Finding {
  id: string;            // `${type}:${start}:${end}`
  type: EntityType;
  value: string;         // exactly text.slice(start, end)
  key: string;           // normalized value: lowercase+trim; digits only for PHONE/CREDIT_CARD/BANK/SSN
  start: number; end: number;
  severity: Severity;
  source: Source;
  confidence: number;
  allowlisted: boolean;  // true if the value is on the user's "always allow" list
}
export interface TopicFlag { topic: TopicType; start: number; end: number; sentence: string; keywords: string[] }
export interface DetectionResult { findings: Finding[]; topics: TopicFlag[] }   // findings sorted, no overlaps

export interface UserTerms { names: string[]; emails: string[]; phones: string[]; addresses: string[]; custom: string[] }
export interface DetectOptions {
  userTerms?: UserTerms;          // always flag these
  allowlist?: string[];           // never ask about these (returned with allowlisted: true)
  enabledTypes?: EntityType[];    // default: all except ORGANIZATION
  enableNameDictionary?: boolean; // default true
}
export interface NerEntity { type: "PERSON" | "LOCATION" | "ORGANIZATION"; start: number; end: number; score: number }
export type NerRunner = (text: string) => Promise<NerEntity[]>;

// Extension events — never contain values
export type EventSource = "paste" | "file" | "typed";
export type EventAction = "renamed" | "as_is" | "allowlisted";
export interface PiiEvent { type: EntityType; site: Site; source: EventSource; action: EventAction; ts: number }

export interface Settings {
  userTerms: UserTerms;
  allowlist: string[];
  enabledTypes: EntityType[];
  sites: Site[];                  // protection on/off per site
}
export const DEFAULT_SETTINGS: Settings;  // exported from index.ts
```

### 5.2 Engine API
Main entry `@promptshield/engine` (small; safe in content scripts):
```ts
detectFast(text: string, opts?: DetectOptions): DetectionResult;
detectFull(text: string, opts: DetectOptions | undefined, ner: NerRunner): Promise<DetectionResult>;
class PlaceholderMapper { constructor(initial?: Record<string, string>); placeholderFor(f: Finding): string; toJSON(): Record<string, string> }
redactText(text: string, findings: Finding[], mapper: PlaceholderMapper): string;   // skips allowlisted findings
maskValue(type: EntityType, value: string): string;
computeScore(events: PiiEvent[], now?: number): { score: number; daily: Array<{ date: string; score: number }> };  // last 30 days
EXPLANATIONS: Record<EntityType | TopicType, { label: string; why: string }>;
SEVERITY_WEIGHT: Record<Severity, number>;   // high 10, medium 5, low 2
DEFAULT_SETTINGS: Settings;
```
NER entry `@promptshield/engine/ner` (worker/offscreen only):
```ts
createNerRunner(opts?: { model?: string; onProgress?: (p: { status: string; progress?: number }) => void }): Promise<NerRunner>;
```
Files entry `@promptshield/engine/files` (offscreen/worker/extension page only):
```ts
type Extracted = { status: "ok"; text: string } | { status: "unsupported" | "empty" | "error"; reason: string };
extractText(file: File): Promise<Extracted>;   // txt/csv/json/md/code, PDF (pdf.js), DOCX (mammoth)
```

### 5.3 Placeholders
`PERSON_n` · EMAIL → `person_n@<original domain>` · `PHONE_n` · `ADDRESS_n` · `SSN_n` · `CARD_n` · `BANK_n` · `API_KEY_n` · `PASSWORD_n` · `IP_n` · `DOB_n` · `PLACE_n` · `ORG_n` · `TERM_n`. One counter per type; the same `key` always gets the same placeholder within a conversation. Topics never get placeholders.

### 5.4 Severity and score
- **high:** SSN, CREDIT_CARD, BANK, API_KEY, PASSWORD, ADDRESS, USER_TERM · **medium:** PERSON, EMAIL, PHONE, DATE_OF_BIRTH · **low:** IP_ADDRESS, LOCATION, ORGANIZATION
- **Privacy score** (`computeScore`): start 100. Each `as_is` event subtracts: SSN/CREDIT_CARD/BANK −15; API_KEY/PASSWORD −10; ADDRESS/USER_TERM −8; PHONE/DATE_OF_BIRTH −5; EMAIL −3; PERSON −2; IP/LOCATION/ORGANIZATION −1. `renamed` and `allowlisted` cost 0. +2 for each full day with no `as_is` event (after the first event). Clamp 0–100.

### 5.5 Extension storage keys (Person 2 writes events/map/approvals; Person 3 reads events and owns settings)
| Key | Area | Shape |
|---|---|---|
| `map:<site>:<convId>` | session | `PlaceholderMapper.toJSON()` |
| `approved:<site>:<convId>` | session | `string[]` of `` `${type}|${key}` `` |
| `events` | local | `PiiEvent[]` (keep newest 5,000) |
| `settings` | local | `Settings` (missing → `DEFAULT_SETTINGS`) |

`convId` = the conversation id from the URL (ChatGPT `/c/<id>`, Claude `/chat/<id>`, Gemini `/app/<id>`), or `"new"`.

### 5.6 Backend API (Person 3 builds; Person 4's website and Person 2's stretch card call it)
```ts
// GET /api/tool-safety?tool=<ToolId>
export type QuestionId = "training" | "retention" | "opt_out" | "delete";
export interface ToolSafety {
  toolId: ToolId; toolName: string;
  answers: Array<{ questionId: QuestionId; question: string; answer: string; citations: Array<{ url: string; title?: string }> }>;
  generatedAt: string;
  source: "snowflake" | "cache" | "fallback";
}
// errors: { error: string } with 4xx/5xx. CORS: allow chrome-extension://* and our domain.
```
Links: ChatGPT conversation `https://chatgpt.com/c/<id>`.

---

### 5.7 Extension internal API — `apps/extension/src/api.ts` (Person 2 builds; Person 3's file gate uses it)
```ts
export interface GatePayload {
  mode: "paste" | "file" | "send" | "cant_check";
  title: string;
  items: Array<{ label: string; value: string; why: string; placeholder: string }>;
  topics: Array<{ label: string; snippet: string; why: string }>;
  fileName?: string; reason?: string;
}
export type GateChoice = "primary" | "secondary" | "cancel";   // primary = Rename…, secondary = … as is / Upload anyway

export function getAdapter(): SiteAdapter | null;                        // current site, null if unprotected
export function getSettings(): Promise<Settings>;
export function convId(): string;
export function getMapper(): Promise<PlaceholderMapper>;                 // for this conversation
export function saveMapper(m: PlaceholderMapper): Promise<void>;
export function detectWithTimeout(text: string, ms?: number): Promise<DetectionResult>;   // fast + NER if it answers within ms (default 1500)
export function splitForPrompt(r: DetectionResult): Promise<{ toAsk: Finding[]; allowlisted: Finding[] }>;  // removes approved + allowlisted
export function openGate(payload: GatePayload): Promise<GateChoice>;   // shows the extension-iframe popup
export function approve(findings: Finding[]): Promise<void>;
export function logEvents(findings: Finding[], source: EventSource, action: EventAction): Promise<void>;
export function extractFile(file: File): Promise<Extracted>;           // via the offscreen document
```
Person 3 exports `initFileGate(): void` from `src/guards/fileGate.ts`; Person 2's `content.ts` calls it once at `document_start` (behind a try/catch so a file-gate bug can never break the other guards).

---

## 6. Working in parallel
| Others need | From | Ready by | Until then |
|---|---|---|---|
| Repo + workspaces | Person 4 | **0:30** | — |
| Engine stub (every export; `detectFast` finds emails; NER runner returns `[]`; `extractText` handles `.txt` only; `computeScore` returns 100) | Person 1 | **1:00** | the stub |
| `fixtures/tool-safety/chatgpt.json` + fixture route | Person 3 | **1:30** | — |
| `src/api.ts` stub (every function exists; `openGate` shows a `window.confirm` placeholder) | Person 2 | **6:00** | Person 3 doesn't need it before hour 17 |
| `events` written by the extension | Person 2 | 12:00 | Person 3 uses a dev "Load sample events" button |
| Fake export zip | Person 4 | 4:00 | a tiny hand-written `conversations.json` |

## 7. Git
Branches `p1-engine`, `p2-guards`, `p3-snowflake-pages`, `p4-web`. Push whenever something works. **Merge into `main` at hours 6, 12, 17 and 21** (order: P1 → P3 → P4 → P2): merge `origin/main` into your branch, `npm install`, `npm run build --workspaces --if-present`, `npm test -w packages/engine`, push, PR, merge. Person 4 runs the Section 9 checklist on `main` after each merge. Never commit secrets or real exports.

## 8. Timeline

| Hours | Person 1 — Engine | Person 2 — Extension guards | Person 3 — Snowflake + extension pages + file gate | Person 4 — Website + deploy |
|---|---|---|---|---|
| 0–1 | Engine stub | WXT skeleton; check selectors on 3 sites | Snowflake account + Cortex smoke test; fixture route | Repo, domain shortlist + vote, request real export |
| 1–6 | Rules, names (phrases, dictionary, user terms), placeholders, explanations, tests | Text model, first underline, **paste gate + gate iframe** | ChatGPT policy pages, loader, search service | Fake export generator, parser, worker |
| **6** | **Merge 1** | | | |
| 6–12 | NER runner, `extractText`, `computeScore` | Chips, replace, right-edge list, offscreen NER, **send check**, `src/api.ts` | Real tool-safety route + prewarm; then dashboard page (with sample events) | Report builder, Wrapped story, deploy on DO + domain |
| **12** | **Merge 2 — Checkpoint 1:** paste gate + typing chips on ChatGPT with the real engine; sample export → story on the deployed site | | | |
| 12–17 | Policy pages for 7 more tools; help wire NER; accuracy list | Events, approvals, allowlist, edit-message boxes, Claude + Gemini | Settings page, toolbar popup; reload KB with 8 tools + prewarm | Full report, tool-safety card, NER in worker, landing page |
| **17** | **Merge 3 — Checkpoint 2:** full flow end to end; dashboard live | | | |
| 17–21 | False-positive fixes; test support | Polish; stretch: Gmail, "About this tool" card | **File gate** | Polish; stretch: subscription value; Devpost draft |
| **21** | **Merge 4 — feature freeze** | | | |
| 21–24 | All: test list, 5 rehearsals, backup video, Devpost (Person 4 submits) | | | |

**Cut order (top first):** subscription value → Gmail → file gate → Claude/Gemini polish → dashboard trend chart → organization detection.
**Never cut:** paste gate, send check, typing underlines + list, the look-back report, the NER model, the tool-safety card.

## 9. End-to-end checklist
1. Builds pass; engine tests pass.
2. ChatGPT: paste the sample resume → gate popup **before** anything lands → Rename & insert → only placeholders. Insert as is → original; ✕ → nothing.
3. Type `my name is krishna and my email is krishna.test@example.com ` → underlines, chips `PERSON_1`, `person_1@example.com`, right-edge list with reasons; click chips → replaced.
4. Press Enter with an unrenamed item → send check; approved items aren't asked again; allowlisted email never asked.
5. Upload a `.txt`/PDF with an email → file gate; an image → "Can't check this file".
6. Dashboard shows the new events, score changes after "as is"; Clear my data empties it.
7. Website `/scan` → Try with sample data → story → report → tool-safety card with citations.
8. DevTools Network: no request contains typed, pasted, file or export text.

## 10. Demo (3 minutes)
1. **Hook (15 s):** "How much have you already told ChatGPT about yourself?"
2. **Look back (60 s):** drop the fake export → story → "Your address appeared in 14 chats" → open a risky chat to delete.
3. **Know your tool (20 s):** "Does ChatGPT train on my chats?" with citation.
4. **Look forward (65 s):** paste a resume → gate → Rename & insert. Type "my name is krishna" → chip. Type an email, press Enter → send check.
5. **Dashboard + proof (20 s):** score and events; DevTools shows nothing uploaded. Close with the pitch line.

## 11. Honest limitations
- Typing is warned, not gated: the site sees typed text before you rename it. Paste and file gates are the strong protection.
- Detection is best-effort: fixed formats are very reliable, names good, subtle context poor.
- Images, scanned PDFs, voice input and cloud-drive attachments can't be checked (shown as "Can't check").
- Deleting old chats can't undo data already used or retained.
- Desktop Chrome only; site redesigns can break selectors until updated.
- The extension must be trusted: open source, minimal permissions.
