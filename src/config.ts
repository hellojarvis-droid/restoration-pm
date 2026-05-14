import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { HouseSigmaConfig } from "./housesigma/types.js";

function loadDotEnv(file: string): boolean {
  if (!existsSync(file)) return false;
  const text = readFileSync(file, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const k = trimmed.slice(0, eq).trim();
    let v = trimmed.slice(eq + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (process.env[k] === undefined) process.env[k] = v;
  }
  return true;
}

// Look for `.env` in (highest priority first):
//   1. $HOUSESIGMA_ENV_FILE (explicit override)
//   2. process.cwd()/.env
//   3. <dirname of this module>/../.env      (i.e. repo root when running from dist/)
//   4. <dirname of this module>/../../.env   (when running from dist/something/)
//   5. ~/.config/housesigma-mcp/.env
//   6. ~/.housesigma-mcp/.env
// First hit wins; we don't merge.
function discoverDotEnv(): string | null {
  const candidates: string[] = [];
  if (process.env.HOUSESIGMA_ENV_FILE) {
    candidates.push(process.env.HOUSESIGMA_ENV_FILE);
  }
  candidates.push(resolve(process.cwd(), ".env"));

  try {
    const here = dirname(fileURLToPath(import.meta.url));
    candidates.push(resolve(here, "../.env"));
    candidates.push(resolve(here, "../../.env"));
  } catch {
    // import.meta.url not available; skip
  }

  const home = homedir();
  candidates.push(resolve(home, ".config", "housesigma-mcp", ".env"));
  candidates.push(resolve(home, ".housesigma-mcp", ".env"));

  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return null;
}

export function loadConfig(): HouseSigmaConfig {
  const envFile = discoverDotEnv();
  if (envFile) {
    loadDotEnv(envFile);
    if (process.env.HOUSESIGMA_DEBUG === "1") {
      process.stderr.write(`[housesigma-mcp] loaded env from ${envFile}\n`);
    }
  }

  // Resolve session file: if relative, anchor next to the env file (or the
  // user-config dir) so it survives across cwd changes.
  let sessionFile = process.env.HOUSESIGMA_SESSION_FILE ?? ".housesigma-session.json";
  if (!sessionFile.startsWith("/") && !sessionFile.startsWith("~")) {
    const anchor = envFile ? dirname(envFile) : resolve(homedir(), ".housesigma-mcp");
    sessionFile = resolve(anchor, sessionFile);
  } else if (sessionFile.startsWith("~/")) {
    sessionFile = resolve(homedir(), sessionFile.slice(2));
  }

  return {
    baseUrl: process.env.HOUSESIGMA_BASE_URL ?? "https://housesigma.com",
    email: process.env.HOUSESIGMA_EMAIL || undefined,
    password: process.env.HOUSESIGMA_PASSWORD || undefined,
    token: process.env.HOUSESIGMA_TOKEN || undefined,
    sessionFile,
    debug: process.env.HOUSESIGMA_DEBUG === "1",
  };
}
