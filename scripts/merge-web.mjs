#!/usr/bin/env node
/**
 * Merge the Astro static build (web/dist) into the eve Vercel Build Output
 * static directory (.vercel/output/static).
 *
 * Why: eve writes the Vercel Build Output at .vercel/output and mounts its API
 * under /eve/v1/*. The build output config.json begins with a "filesystem"
 * handle, so any static file present in .vercel/output/static is served by the
 * CDN before the function routes are considered. Copying the Astro output
 * there lets the static frontend own "/" and its own slugs while eve keeps the
 * API.
 *
 * Run after `eve build` and `astro build`.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const webDist = resolve(root, "web/dist");
const staticDir = resolve(root, ".vercel/output/static");

if (!existsSync(webDist)) {
  console.error(`[merge-web] web/dist not found. Run "astro build" in web/ first.`);
  process.exit(1);
}

if (!existsSync(resolve(root, ".vercel/output/config.json"))) {
  console.error(
    `[merge-web] .vercel/output/config.json not found. Run "eve build" first.`,
  );
  process.exit(1);
}

// Ensure the static dir exists, then mirror web/dist into it.
mkdirSync(staticDir, { recursive: true });

for (const entry of readdirSync(webDist, { withFileTypes: true })) {
  const src = resolve(webDist, entry.name);
  const dest = resolve(staticDir, entry.name);
  // force: overwrite; recursive: copy trees.
  cpSync(src, dest, { recursive: true, force: true });
}

console.log(`[merge-web] merged web/dist -> .vercel/output/static`);
for (const entry of readdirSync(staticDir, { withFileTypes: true })) {
  console.log(`  ${entry.isDirectory() ? "d" : "f"} ${entry.name}`);
}

// Patch the Vercel Build Output config so "/" serves the static Starlight
// homepage instead of eve's Nitro "/index" function. eve's build emits both a
// function (functions/index.func) and a route { src: "/", dest: "/index" }
// that take "/" before the filesystem handler can resolve it to /index.html.
// We (1) remove that root route so the filesystem handler owns "/" and
// (2) delete the index.func directory so no function shadows /index.html.
// The filesystem handler then serves /index.html for "/" exactly the way it
// already serves /install/index.html for /install/.
const configPath = resolve(root, ".vercel/output/config.json");
const config = JSON.parse(readFileSync(configPath, "utf8"));
let patched = false;
if (Array.isArray(config.routes)) {
  const before = config.routes.length;
  config.routes = config.routes.filter(
    (r) => !(r.src === "/" && r.dest === "/index"),
  );
  patched = config.routes.length !== before;
}
if (patched) {
  writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");
  console.log(`[merge-web] removed eve root route {"/" -> "/index"}`);
} else {
  console.warn(
    `[merge-web] warning: no {"/" -> "/index"} route found; "/" may not serve the static homepage.`,
  );
}

// Remove eve's root function so it cannot shadow /index.html. The eve API
// surface lives under /eve/v1/* via the __server catch-all, so dropping the
// standalone index.func does not affect any API route.
const indexFunc = resolve(root, ".vercel/output/functions/index.func");
if (existsSync(indexFunc)) {
  rmSync(indexFunc, { recursive: true, force: true });
  console.log(`[merge-web] removed functions/index.func`);
}
