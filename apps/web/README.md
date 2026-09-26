# Website workspace

Reserved for Next.js, the browser-local export audit, and the tool-safety route.
Person 4 owns framework setup, dependencies, UI, parser/worker, and deployment.
Person 3 owns `app/api/**` and `lib/server/**`.

This workspace currently links `@promptshield/engine` only. It has no web server
or UI yet. Use the Person 4 task file to start the website, or Person 3 for the
tool-safety API. Import shared `ToolSafety`, `QuestionId`, and `ToolId` types
from the engine main entry.

Export reading and engine scanning must run locally in a browser worker. Never
post export data to a Next.js route or server action. The future API accepts
only `GET /api/tool-safety?tool=<ToolId>` and keeps Snowflake credentials server-side.
