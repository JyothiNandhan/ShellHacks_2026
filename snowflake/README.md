# Snowflake knowledge base (Person 3)

Official AI-tool policy pages → `POLICY_CHUNKS` → Cortex Search `POLICY_SEARCH`
→ `GET /api/tool-safety` (Cortex `AI_COMPLETE`, cited answers only).

## Refresh pipeline (run in this order)

1. **Fetch:** `python3 snowflake/fetch_kb.py` downloads every page in
   `sources.json` into `kb/<tool>/<slug>.txt`. Some sites block scripts (see
   `kb/README.md`); paste those from a browser. Review the text before uploading.
2. **Dry run:** `python3 snowflake/load_kb.py` prints chunk/tool counts only.
3. **Upload:** set `SNOWFLAKE_USER` in `apps/web/.env.local`, then
   `python3 snowflake/load_kb.py --upload` (opens browser SSO; replaces the table).
4. **Index:** first time, run `03-search-service.sql`. Afterwards run
   `ALTER CORTEX SEARCH SERVICE PROMPTSHIELD.KB.POLICY_SEARCH REFRESH;`.
5. **Check the API token:** `npm run check:snowflake -w apps/web`.
   HTTP 401 → token expired, role restriction, or your IP is no longer in the
   network policy (re-run `02-network-access.sql` from the current network).
6. **Prewarm:** `npm run prewarm -w apps/web` replaces the `SAMPLE` fixtures in
   `fixtures/tool-safety/` with cited answers. A tool with no grounded answer
   keeps its existing fixture and the command exits non-zero.

Python deps: `pip install -r snowflake/requirements.txt`. Loader tests:
`cd snowflake && python3 -m unittest test_load_kb`.
