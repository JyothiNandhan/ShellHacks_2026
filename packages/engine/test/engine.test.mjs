import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_SETTINGS, EXPLANATIONS, SEVERITY_WEIGHT,
  detectFast, detectFull, PlaceholderMapper, redactText, maskValue, computeScore,
} from "@promptshield/engine";
import { extractText } from "@promptshield/engine/files";
import { createNerRunner } from "@promptshield/engine/ner";

test("email offsets remain correct with emoji, case, punctuation, and repeated values", () => {
  const text = "🔒 Demo.User@example.com, then demo.user@example.com.";
  const { findings, topics } = detectFast(text);
  assert.equal(findings.length, 2);
  assert.deepEqual(topics, []);
  for (const f of findings) {
    assert.equal(text.slice(f.start, f.end), f.value);
    assert.equal(f.id, `EMAIL:${f.start}:${f.end}`);
    assert.equal(f.key, "demo.user@example.com");
  }
  assert.ok(findings[0].end <= findings[1].start);
  assert.equal(redactText(text, findings, new PlaceholderMapper()), "🔒 person_1@example.com, then person_1@example.com.");
});

test("allowlisted emails are returned but left intact; disabled types are absent", () => {
  const text = "Demo@example.com and other@example.org";
  const { findings } = detectFast(text, { allowlist: [" demo@EXAMPLE.com "] });
  assert.equal(findings[0].allowlisted, true);
  assert.equal(redactText(text, findings, new PlaceholderMapper()), "Demo@example.com and person_1@example.org");
  assert.deepEqual(detectFast(text, { enabledTypes: [] }), { findings: [], topics: [] });
});

test("placeholder storage round trip retains identities, counters, and independent types", () => {
  const first = detectFast("one@example.com").findings[0];
  const mapper = new PlaceholderMapper();
  assert.equal(mapper.placeholderFor(first), "person_1@example.com");
  const restored = new PlaceholderMapper(JSON.parse(JSON.stringify(mapper.toJSON())));
  assert.equal(restored.placeholderFor(first), "person_1@example.com");
  assert.equal(restored.placeholderFor(detectFast("two@Example.org").findings[0]), "person_2@Example.org");
  assert.equal(restored.placeholderFor({ ...first, type: "PERSON", key: "one", value: "One" }), "PERSON_1");
  assert.equal(restored.placeholderFor({ ...first, type: "CREDIT_CARD", key: "1234", value: "1234" }), "CARD_1");
  const snapshot = restored.toJSON();
  snapshot["EMAIL|one@example.com"] = "changed";
  assert.equal(restored.placeholderFor(first), "person_1@example.com");
});

test("invalid or overlapping spans fail before storing any placeholders", () => {
  const text = "demo@example.com";
  const f = detectFast(text).findings[0];
  const mapper = new PlaceholderMapper();
  assert.throws(() => redactText(text, [f, f], mapper), /non-overlapping/);
  assert.throws(() => redactText(text, [{ ...f, value: "wrong" }], mapper), /matching/);
  assert.deepEqual(mapper.toJSON(), {});
});

test("plain text extraction distinguishes readable, empty, unsupported, and unreadable files", async () => {
  assert.deepEqual(await extractText(new File(["demo@example.com"], "demo.TXT")), { status: "ok", text: "demo@example.com" });
  assert.equal((await extractText(new File([" \n"], "empty.txt"))).status, "empty");
  assert.equal((await extractText(new File(["image"], "photo.png"))).status, "unsupported");
  assert.equal((await extractText({ name: "broken.txt", text: async () => { throw new Error("private details"); } })).status, "error");
});

test("public defaults and display helpers are available", () => {
  assert.equal(DEFAULT_SETTINGS.enabledTypes.length, 13);
  assert.equal(DEFAULT_SETTINGS.enabledTypes.includes("ORGANIZATION"), false);
  assert.equal(Object.keys(EXPLANATIONS).length, 17);
  assert.deepEqual(SEVERITY_WEIGHT, { high: 10, medium: 5, low: 2 });
  assert.equal(maskValue("PASSWORD", "synthetic-secret"), "••••");
  assert.equal(maskValue("EMAIL", "demo@example.com"), "••••@example.com");
});

test("initial NER/full-detection/scoring stubs are importable (not feature validation)", async () => {
  const progress = [];
  const runner = await createNerRunner({ onProgress: p => progress.push(p.status) });
  assert.deepEqual(await runner("Demo Person"), []);
  assert.match(progress[0], /stub/);
  assert.deepEqual(await detectFull("demo@example.com", undefined, runner), detectFast("demo@example.com"));
  assert.deepEqual(computeScore([]), { score: 100, daily: [] });
});
