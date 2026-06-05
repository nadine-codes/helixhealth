import "./_env";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { BIOMARKERS, LAB_UPLOAD_DATE, GLP1_START } from "@/lib/signals-catalog";
import type { SignalRow } from "@/lib/types";

export function admin(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

const DEMO_EMAIL = process.env.DEMO_EMAIL || "jane@helix.demo";
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "HelixDemo!2026";

// Find-or-create the seeded demo user (Jane Doe). Returns the user id.
export async function ensureDemoUser(sb: SupabaseClient): Promise<string> {
  // Paginate listUsers to find by email.
  let page = 1;
  for (;;) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => u.email === DEMO_EMAIL);
    if (found) return found.id;
    if (data.users.length < 200) break;
    page++;
  }
  const { data, error } = await sb.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { name: "Jane Doe" },
  });
  if (error) throw error;
  return data.user.id;
}

// Insert the Feb (in-range) + May (ferritin low) lab panels as biomarker signals.
export async function insertBiomarkerPanels(sb: SupabaseClient, userId: string) {
  // Avoid duplicates.
  await sb
    .from("signals")
    .delete()
    .eq("user_id", userId)
    .eq("source", "bloodwork_pdf");

  const rows: SignalRow[] = [];
  for (const b of BIOMARKERS) {
    rows.push({
      user_id: userId,
      key: b.key,
      name: b.name,
      type: "biomarker",
      value: b.baselineFeb,
      unit: b.unit,
      window_date: "2026-02-10",
      status: null,
      direction: null,
      source: "bloodwork_pdf",
      reference_low: b.refLow,
      reference_high: b.refHigh,
    });
    rows.push({
      user_id: userId,
      key: b.key,
      name: b.name,
      type: "biomarker",
      value: b.uploadedMay,
      unit: b.unit,
      window_date: LAB_UPLOAD_DATE,
      status: b.flagged ? "low" : "in_range",
      direction: null,
      source: "bloodwork_pdf",
      reference_low: b.refLow,
      reference_high: b.refHigh,
    });
  }
  const { error } = await sb.from("signals").insert(rows);
  if (error) throw error;
}

export async function logGlp1(sb: SupabaseClient, userId: string) {
  await sb
    .from("interventions")
    .delete()
    .eq("user_id", userId)
    .eq("key", "glp1");
  const { error } = await sb.from("interventions").insert({
    user_id: userId,
    key: "glp1",
    name: "Semaglutide (GLP-1)",
    started: GLP1_START,
    notes: "Started ~4 weeks ago to lose ~10 lbs.",
  });
  if (error) throw error;
}

export async function removeBiomarkers(sb: SupabaseClient, userId: string) {
  await sb
    .from("signals")
    .delete()
    .eq("user_id", userId)
    .eq("source", "bloodwork_pdf");
}

export async function removeGlp1(sb: SupabaseClient, userId: string) {
  await sb.from("interventions").delete().eq("user_id", userId).eq("key", "glp1");
}

export { DEMO_EMAIL, DEMO_PASSWORD };
