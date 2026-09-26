import { defineContentScript } from "wxt/utils/define-content-script";
import { request } from "../src/messages";
export default defineContentScript({
  matches: ["https://www.mindyourprompt.us/*", "https://mindyourprompt.us/*"],
  runAt: "document_idle",
  main(ctx) {
    let alive = true;
    const publish = async (reset = false) => {
      try {
        const stats = await request({
          type: reset ? "RESET_LIVE_STATS" : "GET_LIVE_STATS",
        });
        if (alive)
          window.postMessage(
            { source: "mindyourprompt-extension", type: "STATS", stats },
            location.origin,
          );
      } catch {
        if (alive)
          window.postMessage(
            { source: "mindyourprompt-extension", type: "ERROR" },
            location.origin,
          );
      }
    };
    const receive = (event: MessageEvent) => {
      if (
        event.source !== window ||
        event.origin !== location.origin ||
        event.data?.source !== "mindyourprompt-website"
      )
        return;
      if (event.data.type === "GET_STATS") void publish();
      if (event.data.type === "RESET_STATS") void publish(true);
    };
    const changed = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string,
    ) => {
      if (area === "local" && (changes.sentEvents || changes.sentPrompts))
        void publish();
    };
    window.addEventListener("message", receive);
    chrome.storage.onChanged.addListener(changed);
    void publish();
    const clock = setInterval(() => void publish(), 60000); // refresh time-dependent score
    ctx.onInvalidated(() => {
      alive = false;
      clearInterval(clock);
      window.removeEventListener("message", receive);
      chrome.storage.onChanged.removeListener(changed);
    });
  },
});
