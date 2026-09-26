# Local Snowflake connection

The database PROMPTSHIELD, schema KB, empty POLICY_CHUNKS table, warehouse PS_WH,
and PROMPTSHIELD_APP role have passed your manual tests. The working model is
claude-sonnet-4-5 with AI_COMPLETE (llama3.3-70b took ~38 s per answer; mistral-large2 is retired).

## Fill the local file

Open `apps/web/.env.local`. Replace `PASTE_YOUR_TOKEN_HERE` with your generated
token and `https://YOUR-ACCOUNT.snowflakecomputing.com` with the Account URL
from Snowsight account details. The browser's app.snowflake.com address is not
an API account URL. Leave the other fields unchanged.

The local file is ignored by Git and has owner-only filesystem permissions.
`.env.example` is a shareable template; never put credentials in it. Never put
the token into a NEXT_PUBLIC_ variable, extension source, chat, or screenshot.

## Validate, then connect

From the repository root, with Node.js 22 or newer:

```sh
npm run check:env -w apps/web
npm run check:snowflake -w apps/web
```

The first command checks configuration without connecting. The second sends
one small AI greeting request using trial credits. Neither prints the token.
The checker reads the local file regardless of your working directory. If you
have exported the same variables in your shell, those values take precedence.

## Authentication errors

Check token expiration and the PROMPTSHIELD_APP role restriction. Snowflake
normally requires a network policy for token authentication. Allow the source
IP of the machine running the app. Deployment may require different outbound
IP settings. Share only the sanitized checker error, never credentials.

## Next

See `snowflake/README.md` for the full fetch → upload → index → prewarm pipeline.

References:
- https://docs.snowflake.com/en/user-guide/programmatic-access-tokens
- https://docs.snowflake.com/en/developer-guide/sql-api/reference
- https://docs.snowflake.com/en/developer-guide/sql-api/handling-responses
