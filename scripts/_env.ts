import { config } from "dotenv";
import { resolve } from "node:path";

// Load .env.local for standalone scripts (Next.js does this automatically for the app).
config({ path: resolve(process.cwd(), ".env.local") });

export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}
