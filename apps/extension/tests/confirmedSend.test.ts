import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { observeSentPrompt } from "../src/confirmedSend";
import { request } from "../src/messages";
vi.mock("../src/messages", () => ({
  request: vi.fn().mockResolvedValue(undefined),
}));
let cancel = () => {};
beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  vi.mocked(request).mockResolvedValue(undefined);
  document.body.innerHTML = "<textarea></textarea>";
});
afterEach(() => {
  cancel();
  vi.useRealTimers();
});
const editor = () => document.querySelector("textarea")!;
it.each(["chatgpt", "claude", "gemini"] as const)(
  "records %s only once after a new user message appears",
  async (site) => {
    editor().value = "private@example.com";
    cancel = observeSentPrompt(editor(), editor().value, site, []);
    await vi.advanceTimersByTimeAsync(600);
    expect(request).not.toHaveBeenCalled();
    editor().value = "";
    await vi.advanceTimersByTimeAsync(600);
    expect(request).not.toHaveBeenCalled();
    const bubble = document.createElement(
      site === "gemini" ? "user-query" : "div",
    );
    if (site === "chatgpt")
      bubble.setAttribute("data-message-author-role", "user");
    if (site === "claude") bubble.setAttribute("data-testid", "user-message");
    bubble.textContent = "private@example.com";
    document.body.append(bubble);
    await vi.advanceTimersByTimeAsync(600);
    expect(request).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(vi.mocked(request).mock.calls)).not.toContain(
      "private@example.com",
    );
    bubble.append(" ");
    await vi.advanceTimersByTimeAsync(600);
    expect(request).toHaveBeenCalledTimes(1);
  },
);
it("does not count an old identical message remounted by the app", async () => {
  const old = document.createElement("div");
  old.setAttribute("data-message-author-role", "user");
  old.textContent = "same";
  document.body.append(old);
  editor().value = "same";
  cancel = observeSentPrompt(editor(), "same", "chatgpt", []);
  old.replaceWith(old.cloneNode(true));
  await vi.advanceTimersByTimeAsync(600);
  expect(request).not.toHaveBeenCalled();
});
it("cancels tracking when the user revises an unsent draft", async () => {
  editor().value = "draft";
  cancel = observeSentPrompt(editor(), "draft", "chatgpt", []);
  editor().value = "revised";
  await vi.advanceTimersByTimeAsync(600);
  const el = document.createElement("div");
  el.setAttribute("data-message-author-role", "user");
  el.textContent = "draft";
  document.body.append(el);
  await vi.advanceTimersByTimeAsync(600);
  expect(request).not.toHaveBeenCalled();
});
