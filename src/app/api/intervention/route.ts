import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const sb = await createClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { key, name, started, notes } = body ?? {};
    if (!key || !name || !started) {
      return NextResponse.json(
        { error: "key, name and started are required" },
        { status: 400 }
      );
    }

    // idempotent: replace any existing intervention with the same key
    await sb.from("interventions").delete().eq("user_id", user.id).eq("key", key);
    const { error } = await sb.from("interventions").insert({
      user_id: user.id,
      key,
      name,
      started,
      notes: notes ?? null,
    });
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("/api/intervention error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to log intervention" },
      { status: 500 }
    );
  }
}
