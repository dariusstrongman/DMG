import { NextResponse } from "next/server";
import { getActiveChannelDbId } from "@/lib/active-channel";
import { disconnectTiktok } from "@/lib/tiktok-account";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const channelId = await getActiveChannelDbId();
  if (channelId) await disconnectTiktok(channelId);
  return NextResponse.redirect(new URL("/dashboard/tiktok", request.url), { status: 303 });
}
