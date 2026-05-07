// POST handler for the personal-channel password form. On success sets
// BOTH the personal-session cookie AND the active-channel cookie to the
// requested slug, so the user lands directly on the personal dashboard.

import { NextResponse } from "next/server";
import {
  checkPersonalPassword,
  createPersonalSessionToken,
  sessionCookieOptions,
  PERSONAL_SESSION_COOKIE,
} from "@/lib/auth";
import { getChannelBySlug } from "@/lib/config";
import { ACTIVE_CHANNEL_COOKIE } from "@/lib/active-channel";

function safeNext(raw: string | null): string {
  if (!raw) return "/dashboard";
  if (!/^\/[^/]/.test(raw)) return "/dashboard";
  return raw;
}

export async function POST(request: Request) {
  const form = await request.formData();
  const password = String(form.get("password") || "");
  const slug = String(form.get("slug") || "");
  const next = safeNext(String(form.get("next") || ""));

  if (!checkPersonalPassword(password)) {
    const url = new URL("/auth/personal", request.url);
    url.searchParams.set("error", "wrong");
    url.searchParams.set("next", next);
    if (slug) url.searchParams.set("slug", slug);
    return NextResponse.redirect(url, { status: 303 });
  }

  const channel = getChannelBySlug(slug);
  const token = await createPersonalSessionToken();
  const response = NextResponse.redirect(new URL(next, request.url), { status: 303 });
  response.cookies.set(PERSONAL_SESSION_COOKIE, token, sessionCookieOptions());
  response.cookies.set(ACTIVE_CHANNEL_COOKIE, channel.slug, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 365 * 24 * 60 * 60,
  });
  return response;
}
