// Kicks off TikTok OAuth. Generates a CSRF state cookie and redirects
// to TikTok's consent screen.

import { NextResponse } from "next/server";
import { buildAuthorizeUrl } from "@/lib/tiktok";

export const dynamic = "force-dynamic";

function randomState(): string {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function GET() {
  let url: string;
  let state: string;
  try {
    state = randomState();
    url = buildAuthorizeUrl(state);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "tiktok config missing" },
      { status: 500 },
    );
  }

  const res = NextResponse.redirect(url, { status: 303 });
  res.cookies.set("dmg_tt_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 minutes
  });
  return res;
}
