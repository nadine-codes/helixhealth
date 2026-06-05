import "./_env";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import dns from "node:dns/promises";
import { Client } from "pg";

function projectRef(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const m = url.match(/https:\/\/([a-z0-9]+)\.supabase\.co/i);
  if (!m) throw new Error("Could not parse project ref from NEXT_PUBLIC_SUPABASE_URL");
  return m[1];
}

const REGIONS = [
  "us-east-1",
  "us-east-2",
  "us-west-1",
  "us-west-2",
  "eu-west-1",
  "eu-west-2",
  "eu-west-3",
  "eu-central-1",
  "eu-central-2",
  "eu-north-1",
  "ap-southeast-1",
  "ap-southeast-2",
  "ap-northeast-1",
  "ap-northeast-2",
  "ap-south-1",
  "sa-east-1",
  "ca-central-1",
];

// Build candidate connection strings (direct first, then pooler across regions).
function candidates(ref: string, password: string): { label: string; url: string }[] {
  const enc = encodeURIComponent(password);
  const out: { label: string; url: string }[] = [];
  if (process.env.DATABASE_URL) {
    out.push({ label: "DATABASE_URL", url: process.env.DATABASE_URL });
  }
  out.push({
    label: "direct",
    url: `postgresql://postgres:${enc}@db.${ref}.supabase.co:5432/postgres`,
  });
  for (const prefix of ["aws-0", "aws-1"]) {
    for (const region of REGIONS) {
      const host = `${prefix}-${region}.pooler.supabase.com`;
      // session-mode pooler (port 5432) supports DDL
      out.push({
        label: `${prefix}/${region}`,
        url: `postgresql://postgres.${ref}:${enc}@${host}:5432/postgres`,
      });
    }
  }
  return out;
}

async function resolves(url: string): Promise<boolean> {
  const host = new URL(url).hostname;
  try {
    await dns.lookup(host);
    return true;
  } catch {
    return false;
  }
}

async function tryConnect(url: string): Promise<Client | null> {
  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
  });
  try {
    await client.connect();
    return client;
  } catch (e) {
    try {
      await client.end();
    } catch {}
    const msg = e instanceof Error ? e.message : String(e);
    // auth failure means host is right but creds wrong, so surface it
    if (/password|authentication|SASL/i.test(msg)) {
      throw new Error(`Reached Postgres but auth failed: ${msg}`);
    }
    return null;
  }
}

async function main() {
  const ref = projectRef();
  const password = process.env.SUPABASE_DB_PASSWORD;
  if (!password && !process.env.DATABASE_URL) {
    throw new Error("Set SUPABASE_DB_PASSWORD or DATABASE_URL.");
  }
  const sql = readFileSync(resolve(process.cwd(), "supabase/schema.sql"), "utf8");

  let client: Client | null = null;
  for (const c of candidates(ref, password ?? "")) {
    if (!(await resolves(c.url))) continue;
    process.stdout.write(`Trying ${c.label}… `);
    client = await tryConnect(c.url);
    if (client) {
      console.log("connected.");
      break;
    }
    console.log("no.");
  }
  if (!client) {
    throw new Error(
      "Could not reach Postgres on any candidate host. Provide DATABASE_URL from the Supabase dashboard (Connection string -> URI)."
    );
  }

  console.log("Applying schema…");
  await client.query(sql);
  console.log("Schema applied successfully.");
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
