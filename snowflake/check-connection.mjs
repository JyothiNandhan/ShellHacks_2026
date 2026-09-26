import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

class SetupError extends Error {}

async function main() {
  try {
    loadEnvFile(fileURLToPath(new URL("../apps/web/.env.local", import.meta.url)));
  } catch {
    throw new SetupError("Cannot load apps/web/.env.local. Create it from .env.example first.");
  }
  const required = ["SNOWFLAKE_ACCOUNT_URL", "SNOWFLAKE_PAT", "SNOWFLAKE_WAREHOUSE", "SNOWFLAKE_ROLE", "SNOWFLAKE_MODEL"];
  const missing = required.filter(key => {
    const value = process.env[key]?.trim();
    return !value || /YOUR-ACCOUNT|PASTE_YOUR_TOKEN_HERE/.test(value);
  });
  if (missing.length) throw new SetupError(`Fill these fields in apps/web/.env.local: ${missing.join(", ")}`);
  let account;
  try { account = new URL(process.env.SNOWFLAKE_ACCOUNT_URL); }
  catch { throw new SetupError("SNOWFLAKE_ACCOUNT_URL must be a valid HTTPS account URL."); }
  if (account.protocol !== "https:" || !account.hostname.endsWith(".snowflakecomputing.com") ||
      account.username || account.password || account.port || account.search || account.hash || account.pathname !== "/") {
    throw new SetupError("Use the HTTPS Account URL ending in .snowflakecomputing.com, with no path, port, or query.");
  }
  if (process.argv.includes("--check-only")) {
    console.log("Environment fields are filled and the account URL has a valid format. No network request was made.");
    return;
  }

  const signal = AbortSignal.timeout(20_000);
  const headers = {
    Authorization: `Bearer ${process.env.SNOWFLAKE_PAT}`,
    "X-Snowflake-Authorization-Token-Type": "PROGRAMMATIC_ACCESS_TOKEN",
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  const request = async (path, body) => {
    const response = await fetch(new URL(path, account), {
      method: body ? "POST" : "GET",
      headers,
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal,
      redirect: "error",
    });
    if (!response.ok) {
      const guidance = response.status === 401 || response.status === 403
        ? "Check token expiration, the PROMPTSHIELD_APP role restriction, and the network policy."
        : "Check the warehouse, role grants, and model availability in Snowsight.";
      throw new SetupError(`Snowflake returned HTTP ${response.status}. ${guidance}`);
    }
    let data;
    try { data = await response.json(); }
    catch { throw new SetupError("Snowflake returned an unreadable response."); }
    return { status: response.status, data };
  };
  let result = await request("/api/v2/statements", {
    statement: "SELECT AI_COMPLETE(?, ?)",
    warehouse: process.env.SNOWFLAKE_WAREHOUSE,
    role: process.env.SNOWFLAKE_ROLE,
    timeout: 20,
    bindings: {
      "1": { type: "TEXT", value: process.env.SNOWFLAKE_MODEL },
      "2": { type: "TEXT", value: "Say hello in three words." },
    },
  });
  while (result.status === 202) {
    const handle = result.data?.statementHandle;
    if (typeof handle !== "string" || !/^[a-zA-Z0-9-]+$/.test(handle)) {
      throw new SetupError("Snowflake did not return a valid statement handle.");
    }
    await delay(500, undefined, { signal });
    result = await request(`/api/v2/statements/${handle}`);
  }
  const answer = result.data?.data?.[0]?.[0];
  if (typeof answer !== "string" || !answer.trim()) {
    throw new SetupError("SQL completed without an AI response. Check model access in Snowsight.");
  }
  console.log("Snowflake REST authentication and AI test passed. This check did not load policy documents.");
}

main().catch(error => {
  // Never print raw exceptions, environment values, tokens, or response bodies.
  if (error instanceof SetupError) console.error(error.message);
  else if (error?.name === "TimeoutError" || error?.name === "AbortError") {
    console.error("Snowflake check timed out after 20 seconds. Check your network and warehouse, then retry.");
  } else console.error("Snowflake connection failed. Check the account URL and network connection.");
  process.exitCode = 1;
});
