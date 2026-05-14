import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import type { HouseSigmaConfig } from "./housesigma/types.js";

function loadDotEnv(file: string): void {
  if (!existsSync(file)) return;
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
}

export function loadConfig(): HouseSigmaConfig {
  loadDotEnv(resolve(process.cwd(), ".env"));

  return {
    baseUrl: process.env.HOUSESIGMA_BASE_URL ?? "https://housesigma.com",
    email: process.env.HOUSESIGMA_EMAIL || undefined,
    password: process.env.HOUSESIGMA_PASSWORD || undefined,
    token: process.env.HOUSESIGMA_TOKEN || undefined,
    sessionFile: process.env.HOUSESIGMA_SESSION_FILE || ".housesigma-session.json",
    debug: process.env.HOUSESIGMA_DEBUG === "1",
  };
}
