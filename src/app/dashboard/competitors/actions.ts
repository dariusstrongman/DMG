"use server";

import { revalidatePath } from "next/cache";
import { addCompetitor, removeCompetitor } from "@/lib/competitors";

export async function addCompetitorAction(formData: FormData) {
  const handle = String(formData.get("handle") ?? "").trim();
  if (!handle) return { ok: false as const, error: "Handle is required." };
  try {
    await addCompetitor(handle);
    revalidatePath("/dashboard/competitors");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function removeCompetitorAction(id: string) {
  try {
    await removeCompetitor(id);
    revalidatePath("/dashboard/competitors");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Unknown error" };
  }
}
