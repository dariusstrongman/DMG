"use server";

import { revalidatePath } from "next/cache";
import { generateWeeklyDigest } from "@/lib/ai-digest";

export async function generateDigestAction() {
  try {
    await generateWeeklyDigest();
    revalidatePath("/dashboard/ai");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Unknown error" };
  }
}
