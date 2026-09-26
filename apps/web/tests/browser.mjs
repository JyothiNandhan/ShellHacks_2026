import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const output = "/tmp/promptshield-browser";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
});
const page = await context.newPage();
const errors = [];
const requests = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("request", (request) =>
  requests.push({
    url: request.url(),
    method: request.method(),
    body: request.postData(),
    type: request.resourceType(),
  }),
);
try {
  await page.goto("http://localhost:3000/");
  await page.getByRole("heading", { name: /You’ve told AI/ }).waitFor();
  await page.screenshot({ path: `${output}/landing.png`, fullPage: true });
  await page
    .getByRole("link", { name: "Scan my AI history", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Drop your ChatGPT export" })
    .waitFor();
  await page.screenshot({ path: `${output}/scan.png`, fullPage: true });
  const started = Date.now();
  await page.getByRole("button", { name: /Try with sample data/ }).click();
  await page
    .getByRole("button", { name: /Skip to report/ })
    .waitFor({ timeout: 60000 });
  await page.getByRole("button", { name: "Pause story" }).click();
  await page.screenshot({ path: `${output}/story.png`, fullPage: true });
  const elapsed = Date.now() - started;
  await page.getByRole("button", { name: /Skip to report/ }).click();
  await page
    .getByRole("heading", { name: "Clean up your riskiest chats." })
    .waitFor();
  await page
    .getByText("SAMPLE — Local mock cards are shown below.", { exact: false })
    .waitFor();
  assert.equal(await page.locator("tbody tr").count(), 10);
  await page.getByRole("checkbox").first().check();
  await page.getByText("1 of 10 cleaned", { exact: false }).waitFor();
  await page.getByRole("button", { name: "Replay recap" }).click();
  await page.getByRole("button", { name: /Skip to report/ }).click();
  assert.equal(await page.getByRole("checkbox").first().isChecked(), true);
  assert.equal(
    await page
      .locator("tbody a")
      .first()
      .getAttribute("href")
      .then((u) => u.startsWith("https://chatgpt.com/c/")),
    true,
  );
  assert.doesNotMatch(
    await page.locator("body").innerText(),
    /alex\.rivera@example\.com|742 Evergreen/,
  );
  await page.screenshot({ path: `${output}/report.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: `${output}/mobile-report.png`,
    fullPage: true,
  });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    true,
    "No horizontal page overflow",
  );
  await page.getByRole("button", { name: /Clear report & start over/ }).click();
  await page
    .getByRole("heading", { name: "Drop your ChatGPT export" })
    .waitFor();
  await page.screenshot({ path: `${output}/mobile-scan.png`, fullPage: true });
  // The development gate must never silently audit a real export using the stub.
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "private.json",
      mimeType: "application/json",
      buffer: Buffer.from("[]"),
    });
  await page
    .getByRole("alert")
    .filter({ hasText: /waiting for Person 1/ })
    .waitFor();
  assert.deepEqual(errors, []);
  assert.ok(
    requests.every((r) => r.method === "GET" && !r.body),
    "No uploads or request bodies",
  );
  assert.ok(
    requests.every((r) => new URL(r.url).origin === "http://localhost:3000"),
    "No third-party traffic in stub mode",
  );
  assert.ok(
    requests
      .filter((r) => r.type === "fetch")
      .every(
        (r) =>
          ["/sample/fake-export.zip", "/api/tool-safety"].includes(
            new URL(r.url).pathname,
          ) ||
          (["/", "/scan"].includes(new URL(r.url).pathname) &&
            new URL(r.url).searchParams.has("_rsc")),
      ),
    "Fetch traffic is limited to sample, fixed policy query, and Next.js navigation",
  );
  console.log(
    JSON.stringify(
      {
        sampleToStoryMs: elapsed,
        rows: 10,
        cleanupPersisted: true,
        masked: true,
        mobileOverflow: false,
        pageErrors: errors,
        fetchRequests: requests.filter((r) => r.type === "fetch"),
        screenshots: output,
      },
      null,
      2,
    ),
  );
} catch (error) {
  await page.screenshot({ path: `${output}/failure.png`, fullPage: true });
  console.error(
    JSON.stringify(
      { errors, requests, body: await page.locator("body").innerText() },
      null,
      2,
    ),
  );
  throw error;
} finally {
  await browser.close();
}
