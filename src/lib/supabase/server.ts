import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Session-bound server client (RLS enforced via the user's cookie session).
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // called from a Server Component; safe to ignore, middleware refreshes
          }
        },
      },
    }
  );
}
