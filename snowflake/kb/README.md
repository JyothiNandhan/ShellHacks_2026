# Policy corpus

Each file: `URL:` and `TITLE:` header lines, then the page text. `load_kb.py`
rejects URLs outside each tool's official domains.

| Tool | Status |
| --- | --- |
| claude, gemini, copilot, grammarly | Official page text fetched by `fetch_kb.py` (2026-09-26) |
| chatgpt | Two short **paraphrases** only. openai.com blocks scripts (HTTP 403): paste the full text of the three `sources.json` pages from a browser |
| perplexity, deepseek, meta_ai | **Missing.** Their sites block scripts (403 / no connection / 400). Paste privacy-policy and data-control help pages from a browser |

Grammarly's privacy policy redirects to superhuman.com (the company's current
name), so that domain is allowed for Grammarly. Copilot uses the "for
individuals" privacy pages that apply to the app version released 2026-08-18.
Never add browser exports or user data here.
