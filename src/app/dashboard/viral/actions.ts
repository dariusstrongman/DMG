"use server";

import { revalidatePath } from "next/cache";
import { generateViralPick } from "@/lib/viral-pick";

export async function generateViralPickAction() {
  try {
    await generateViralPick();
    revalidatePath("/dashboard/viral");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Unknown error" };
  }
}
