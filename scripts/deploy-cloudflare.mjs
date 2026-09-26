import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const wrangler = fileURLToPath(
  new URL("../node_modules/wrangler/bin/wrangler.js", import.meta.url),
);
const config = "dist/server/wrangler.json";

function runWrangler(args) {
  const result = spawnSync(process.execPath, [wrangler, ...args], {
    stdio: "inherit",
    env: {
      ...process.env,
      CI: process.env.CI ?? "true",
      WRANGLER_SEND_METRICS: process.env.WRANGLER_SEND_METRICS ?? "false",
    },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

runWrangler([
  "d1",
  "migrations",
  "apply",
  "DB",
  "--remote",
  "--config",
  config,
]);
runWrangler(["deploy", "--config", config]);
