// POST handler for the login form: validate password, set signed cookie,
// redirect to ?next or /dashboard. On wrong password, bounce back to
// /login?error=wrong (no info leak about whether password is set, etc).

import { NextResponse } from "next/server";
import { checkPassword, createSessionToken, sessionCookieOptions, SESSION_COOKIE } from "@/lib/auth";

function safeNext(raw: string | null): string {
  if (!raw) return "/dashboard";
  // Only allow same-origin paths starting with /, no protocol-relative.
  if (!/^\/[^/]/.test(raw)) return "/dashboard";
  return raw;
}

export async function POST(request: Request) {
  const form = await request.formData();
  const password = String(form.get("password") || "");
  const next = safeNext(String(form.get("next") || ""));

  if (!checkPassword(password)) {
    const url = new URL("/login", request.url);
    url.searchParams.set("error", "wrong");
    if (next !== "/dashboard") url.searchParams.set("next", next);
    return NextResponse.redirect(url, { status: 303 });
  }

  const token = await createSessionToken();
  const response = NextResponse.redirect(new URL(next, request.url), { status: 303 });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return response;
}
