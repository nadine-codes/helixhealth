import "./_env";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Client } from "pg";

// Applies supabase/schema.sql via a direct Postgres connection.
// Requires DATABASE_URL (Supabase: Project Settings -> Database -> Connection string).
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "Missing DATABASE_URL. Set it to your Supabase Postgres connection string."
    );
  }
  const sql = readFileSync(resolve(process.cwd(), "supabase/schema.sql"), "utf8");
  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  console.log("Connected. Applying schema...");
  await client.query(sql);
  console.log("Schema applied successfully.");
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
