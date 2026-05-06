// OAuth callback handler — Supabase redirects here with ?code=... after
// the Google sign-in flow. Exchange the code for a session, then bounce
// to the requested destination (?next=) or /dashboard.

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, url.origin));
    }
  }

  // Fallback: send back to login with error.
  return NextResponse.redirect(
    new URL("/login?error=oauth_callback_failed", url.origin)
  );
}
