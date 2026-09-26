import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import JSZip from "jszip";
import {
  parseExport,
  parseConversations,
  INVALID_EXPORT,
} from "../lib/report/parseExport";
import { buildReport, messageKey } from "../lib/report/buildReport";
import { detectFast } from "@promptshield/engine";
import type { DetectionResult, ParsedMessage } from "../lib/report/types";
const conv = (id = "chat-one") => ({
  conversation_id: id,
  title: "Private email alex@example.com",
  create_time: 1700000000,
  mapping: {
    root: { id: "root", message: null },
    user: {
      id: "user",
      message: {
        id: "user",
        author: { role: "user" },
        content: {
          content_type: "multimodal_text",
          parts: [
            "Hello alex@example.com",
            { image: "ignored" },
            "Second line",
          ],
        },
      },
    },
    assistant: {
      id: "assistant",
      message: {
        id: "assistant",
        author: { role: "assistant" },
        content: {
          content_type: "text",
          parts: ["assistant-only@example.com"],
        },
      },
    },
    system: {
      message: {
        id: "system",
        author: { role: "system" },
        content: { content_type: "text", parts: ["hidden@example.com"] },
      },
    },
  },
});
test("parser handles multipart text, role filtering, timestamp fallback and duplicate nodes", () => {
  const parsed = parseConversations([conv(), conv()]);
  assert.equal(parsed.conversationCount, 1);
  assert.equal(parsed.messages.length, 2);
  assert.equal(parsed.messages[0].text, "Hello alex@example.com\nSecond line");
  assert.equal(parsed.messages[0].createdAt, 1700000000000);
});
test("ZIP parser concatenates nested and numbered conversation files", async () => {
  const zip = new JSZip();
  zip.file("export/conversations.json", JSON.stringify([conv()]));
  zip.file("conversations-1.json", JSON.stringify([conv("chat-two")]));
  zip.file("chat.html", "ignored");
  const parsed = await parseExport(
    new File([await zip.generateAsync({ type: "arraybuffer" })], "export.zip"),
  );
  assert.equal(parsed.conversationCount, 2);
  assert.equal(parsed.messages.length, 4);
});
test("rejects unrelated ZIP, invalid JSON, empty mappings and wrong shapes with a friendly error", async () => {
  const zip = new JSZip();
  zip.file("other.json", "[]");
  for (const file of [
    new File([await zip.generateAsync({ type: "arraybuffer" })], "other.zip"),
    new File(["{"], "conversations.json"),
    new File(["{}"], "conversations.json"),
    new File(["[]"], "conversations.json"),
  ])
    await assert.rejects(parseExport(file), { message: INVALID_EXPORT });
  assert.throws(() => parseConversations([null, { id: "x", mapping: {} }]), {
    message: INVALID_EXPORT,
  });
});
test("report excludes assistant findings, masks values and hides potentially sensitive titles", () => {
  const parsed = parseConversations([conv()]);
  const results = new Map(
    parsed.messages.map((m) => [messageKey(m), detectFast(m.text)]),
  );
  const report = buildReport(parsed.messages, 1, results, false);
  assert.equal(report.messageCount, 1);
  assert.equal(report.countsByType.EMAIL, 1);
  assert.equal(report.topRepeated.length, 1);
  assert.equal(
    report.riskiestConversations[0].url,
    "https://chatgpt.com/c/chat-one",
  );
  assert.equal(report.riskiestConversations[0].riskScore, 5);
  assert.doesNotMatch(
    JSON.stringify(report),
    /alex@example.com|assistant-only@example.com|Private email/,
  );
});
test("counts unique conversations per type and repeated key, sums risks, fills zero months", () => {
  const messages: ParsedMessage[] = [
    {
      conversationId: "a",
      conversationTitle: "hidden",
      messageId: "1",
      role: "user",
      createdAt: Date.UTC(2026, 0, 1),
      text: "x@example.com x@example.com",
    },
    {
      conversationId: "a",
      conversationTitle: "hidden",
      messageId: "2",
      role: "user",
      createdAt: Date.UTC(2026, 2, 1),
      text: "x@example.com",
    },
    {
      conversationId: "b",
      conversationTitle: "hidden",
      messageId: "3",
      role: "user",
      createdAt: Date.UTC(2026, 2, 1),
      text: "x@example.com",
    },
  ];
  const results = new Map<string, DetectionResult>(
    messages.map((m) => [messageKey(m), detectFast(m.text)]),
  );
  const report = buildReport(messages, 2, results, true);
  assert.equal(report.countsByType.EMAIL, 2);
  assert.equal(report.topRepeated[0].conversationCount, 2);
  assert.equal(report.riskiestConversations[0].riskScore, 15);
  assert.equal(report.timeline[1].conversationsWithFindings, 0);
  assert.equal(
    report.privacyScore,
    Math.round(100 - Math.min(100, 12 * Math.log2(101))),
  );
});
test("real engine finds every planted category in the 220-conversation fixture", async () => {
  const bytes = await readFile(
    new URL("../../../fixtures/fake-export/fake-export.zip", import.meta.url),
  );
  const parsed = await parseExport(new File([bytes], "fake-export.zip"));
  assert.equal(parsed.conversationCount, 220);
  const results = new Map(
    parsed.messages
      .filter((m) => m.role === "user")
      .map((m) => [messageKey(m), detectFast(m.text)]),
  );
  const report = buildReport(parsed.messages, 220, results, false);
  const manifest = JSON.parse(
    await readFile(
      new URL("../../../fixtures/fake-export/manifest.json", import.meta.url),
      "utf8",
    ),
  );
  for (const [category, expected] of Object.entries(manifest.expectedCounts)) {
    assert.equal(
      report.countsByType[category as keyof typeof report.countsByType] ?? 0,
      expected,
      `${category} conversation count`,
    );
  }
  assert.equal(report.aiNameDetection, false);
  assert.ok(report.messageCount >= 440 && report.messageCount <= 1760);
  assert.ok(
    report.riskiestConversations.every((c) =>
      c.url.startsWith("https://chatgpt.com/c/"),
    ),
  );
});

test("separate uploaded exports produce their own counts without sample carryover", async () => {
  const scan = async (items: ReturnType<typeof conv>[]) => {
    const parsed = await parseExport(new File([JSON.stringify(items)], "my-export.json"));
    const results = new Map(parsed.messages.filter(m => m.role === "user").map(m => [messageKey(m), detectFast(m.text)]));
    return buildReport(parsed.messages, parsed.conversationCount, results, false);
  };
  const first = await scan([conv("one"), conv("two")]);
  assert.equal(first.conversationCount, 2);
  assert.equal(first.countsByType.EMAIL, 2);
  const clean = conv("clean");
  clean.mapping.user.message.content.parts = ["explain recursion with a short example"];
  const second = await scan([clean]);
  assert.equal(second.conversationCount, 1);
  assert.equal(second.messageCount, 1);
  assert.equal(second.countsByType.EMAIL ?? 0, 0);
  assert.equal(second.conversationsWithFindings, 0);
});
