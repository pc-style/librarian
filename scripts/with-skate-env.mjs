#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const helper = "/Users/pcstyle/.agents/skills/skate/scripts/skate-env.py";
const envKeys = [
  "PARALLEL_API_KEY",
  "PIONEER_API_KEY",
  "PIONEER_MODEL_ID",
  "PIONEER_CONTEXT_WINDOW_TOKENS",
  "VERCEL_CONNECT_GITHUB_CONNECTOR",
];

const env = { ...process.env };

if (existsSync(helper)) {
  for (const key of envKeys) {
    if (env[key]) continue;

    const result = spawnSync("python3", [helper, "get", key, "--raw"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });

    if (result.status !== 0) continue;

    const value = result.stdout.trim();
    if (value) env[key] = value;
  }
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: bun scripts/with-skate-env.mjs <command> [...args]");
  process.exit(1);
}

const child = spawn(args[0], args.slice(1), {
  env,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
