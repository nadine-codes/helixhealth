"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function enterDemo() {
  const sb = await createClient();
  const { error } = await sb.auth.signInWithPassword({
    email: process.env.DEMO_EMAIL!,
    password: process.env.DEMO_PASSWORD!,
  });
  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }
  redirect("/dashboard");
}

export async function sendMagicLink(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) redirect("/login?error=Enter%20an%20email");
  const sb = await createClient();
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/dashboard`,
    },
  });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  redirect("/login?sent=1");
}

export async function signOut() {
  const sb = await createClient();
  await sb.auth.signOut();
  redirect("/login");
}
