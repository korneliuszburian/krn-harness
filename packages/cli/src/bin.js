#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const srcDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(srcDir, "../../..");
const tsxLoader = path.join(repoRoot, "node_modules/tsx/dist/esm/index.mjs");
const entrypoint = path.join(srcDir, "index.ts");

const result = spawnSync(
  process.execPath,
  ["--import", tsxLoader, entrypoint, ...process.argv.slice(2)],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      KRN_HARNESS_BIN_WRAPPER: fileURLToPath(import.meta.url),
      KRN_HARNESS_SOURCE_ROOT: repoRoot,
    },
    stdio: "inherit",
  },
);

if (result.error) {
  throw result.error;
}

if (result.signal) {
  process.kill(process.pid, result.signal);
} else {
  process.exitCode = result.status ?? 1;
}
