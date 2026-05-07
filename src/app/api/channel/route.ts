// Sets the active-channel cookie. Personal channels require the
// personal-session cookie (granted at /auth/personal). On missing/wrong
// auth for a personal channel we redirect to a login page instead of
// silently switching, so the user knows why nothing happened.

import { NextResponse } from "next/server";
import {
  PERSONAL_SESSION_COOKIE,
  verifyPersonalSessionToken,
} from "@/lib/auth";
import { getChannelBySlug } from "@/lib/config";
import { ACTIVE_CHANNEL_COOKIE } from "@/lib/active-channel";

export async function POST(request: Request) {
  const form = await request.formData();
  const slug = String(form.get("slug") || "");
  const next = String(form.get("next") || "/dashboard");
  const channel = getChannelBySlug(slug);

  if (channel.personal) {
    const tok = request.headers.get("cookie")?.match(
      new RegExp(`(?:^|;\\s*)${PERSONAL_SESSION_COOKIE}=([^;]+)`),
    )?.[1] ?? null;
    const ok = await verifyPersonalSessionToken(tok);
    if (!ok) {
      const url = new URL("/auth/personal", request.url);
      url.searchParams.set("next", next);
      url.searchParams.set("slug", channel.slug);
      return NextResponse.redirect(url, { status: 303 });
    }
  }

  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  const response = NextResponse.redirect(new URL(safeNext, request.url), { status: 303 });
  response.cookies.set(ACTIVE_CHANNEL_COOKIE, channel.slug, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 365 * 24 * 60 * 60,
  });
  return response;
}
