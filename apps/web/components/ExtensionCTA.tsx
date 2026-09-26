import { existsSync } from "node:fs";
import path from "node:path";
import { ArrowUpRight, Puzzle } from "lucide-react";
export default function ExtensionCTA() {
  const available = existsSync(
    path.join(process.cwd(), "public/download/promptshield-extension.zip"),
  );
  return (
    <section className="extension-card" id="extension">
      <div>
        <span className="eyebrow">
          <Puzzle size={15} /> LOOK FORWARD
        </span>
        <h2>
          Make your next prompt
          <br />a little more private.
        </h2>
        <p>
          The Chrome extension catches sensitive details before you paste or
          send them.
        </p>
      </div>
      <div>
        {available ? (
          <a
            className="button primary"
            href="/download/promptshield-extension.zip"
            download
          >
            Download extension ZIP <ArrowUpRight size={17} />
          </a>
        ) : (
          <span className="button unavailable">
            Chrome extension · coming soon
          </span>
        )}
        <ol className="install-steps">
          <li>Download and unzip the extension.</li>
          <li>Open chrome://extensions and enable Developer mode.</li>
          <li>Choose “Load unpacked” and select the folder containing manifest.json.</li>
          <li>Reload your ChatGPT, Claude, or Gemini tab to activate it.</li>
        </ol>
        {available && (
          <p className="micro">
            Version 0.4.0 · Chrome 116 or newer · Manual installation · Appears as Mind your Prompt!
            in Chrome. Updating? Replace your unpacked folder with this download, reload the extension, and refresh your chatbot and this website.
          </p>
        )}
      </div>
    </section>
  );
}
