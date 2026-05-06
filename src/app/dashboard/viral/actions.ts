"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

// Pull a YT video id out of a URL or accept a bare id.
function extractVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const m = trimmed.match(/(?:v=|\/shorts\/|youtu\.be\/|\/v\/|\/embed\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

export async function markViralPickProducedAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const urlOrId = String(formData.get("urlOrId") ?? "");
  if (!id) return { ok: false as const, error: "Missing pick id." };
  const ytId = extractVideoId(urlOrId);
  if (!ytId) return { ok: false as const, error: "Couldn't find a YouTube video id in that input." };
  try {
    await db.viralPick.update({
      where: { id },
      data: { producedYtVideoId: ytId, producedAt: new Date() },
    });
    revalidatePath("/dashboard/viral");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function unmarkViralPickProducedAction(id: string) {
  try {
    await db.viralPick.update({
      where: { id },
      data: { producedYtVideoId: null, producedAt: null },
    });
    revalidatePath("/dashboard/viral");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Unknown error" };
  }
}
