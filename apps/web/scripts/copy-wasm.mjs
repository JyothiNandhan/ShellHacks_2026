import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Keep these files paired with the installed Transformers.js/ONNX runtime.
const require = createRequire(import.meta.url);
// The package does not export package.json; its Node entry is in dist/.
const source = dirname(require.resolve("@huggingface/transformers"));
const destination = fileURLToPath(
  new URL("../public/promptshield-wasm/", import.meta.url),
);
mkdirSync(destination, { recursive: true });
for (const filename of [
  "ort-wasm-simd-threaded.jsep.mjs",
  "ort-wasm-simd-threaded.jsep.wasm",
]) {
  copyFileSync(join(source, filename), join(destination, filename));
}
console.log("Copied local ONNX runtime assets to public/promptshield-wasm/");
