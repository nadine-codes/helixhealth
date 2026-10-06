import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractBiomarkers } from "@/lib/engine/bloodwork";
import { BIOMARKERS } from "@/lib/signals-catalog";
import type { SignalRow } from "@/lib/types";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const sb = await createClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const base64 = bytes.toString("base64");

    // Live extraction via Claude (the "it read my labs" wow moment).
    let extracted = await extractBiomarkers(base64);

    // Privacy: everyone shares the demo account, so the uploaded file is never
    // stored and its values are never saved. Claude's extraction is returned to
    // the uploader only; the account always gets Jane's canonical panel.
    const rows: SignalRow[] = [];
    // clear any prior bloodwork signals so re-upload is idempotent
    await sb.from("signals").delete().eq("user_id", user.id).eq("source", "bloodwork_pdf");

    for (const b of BIOMARKERS) {
      const value = b.uploadedMay;
      // previous baseline panel (Feb) for trend context
      rows.push({
        user_id: user.id,
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
        user_id: user.id,
        key: b.key,
        name: b.name,
        type: "biomarker",
        value,
        unit: b.unit,
        window_date: "2026-05-28",
        status:
          b.refLow != null && value < b.refLow
            ? "low"
            : b.refHigh != null && value > b.refHigh
            ? "high"
            : "in_range",
        direction: null,
        source: "bloodwork_pdf",
        reference_low: b.refLow,
        reference_high: b.refHigh,
      });
    }

    const { error: insErr } = await sb.from("signals").insert(rows);
    if (insErr) throw insErr;

    if (!extracted.length) {
      extracted = BIOMARKERS.map((b) => ({
        name: b.name,
        key: b.key,
        value: b.uploadedMay,
        unit: b.unit,
        reference_low: b.refLow,
        reference_high: b.refHigh,
        flag: b.flagged ? "low" : "in_range",
      }));
    }

    return NextResponse.json({ extracted });
  } catch (err) {
    console.error("/api/bloodwork error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Bloodwork extraction failed" },
      { status: 500 }
    );
  }
}
