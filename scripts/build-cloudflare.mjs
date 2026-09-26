import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const buildScript = fileURLToPath(new URL("./run-framework.mjs", import.meta.url));
const result = spawnSync(process.execPath, [buildScript, "build"], {
  stdio: "inherit",
  env: {
    ...process.env,
    CLOUDFLARE_DIRECT_DEPLOY: "1",
  },
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
