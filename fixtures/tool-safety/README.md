# Tool-safety fixtures

Fallback responses (`ToolSafety`, contract 5.6) served when Snowflake fails.
They are `SAMPLE — ` placeholders until `npm run prewarm -w apps/web` replaces
each one with cited answers generated from `snowflake/kb/`. Re-run prewarm
after every knowledge-base upload.
