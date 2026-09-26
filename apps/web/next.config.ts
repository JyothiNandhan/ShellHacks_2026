import type { NextConfig } from "next";
import { readFileSync } from "node:fs";
import path from "node:path";
const engineManifest = JSON.parse(
  readFileSync(
    path.resolve(process.cwd(), "../../packages/engine/package.json"),
    "utf8",
  ),
);
const config: NextConfig = {
  transpilePackages: ["@promptshield/engine"],
  env: {
    NEXT_PUBLIC_ENGINE_READY: String(!engineManifest.promptshieldTemporaryStub),
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};
export default config;
