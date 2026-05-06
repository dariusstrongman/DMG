"use server";

import { revalidatePath } from "next/cache";
import {
  generateIdeas,
  setIdeaStatus,
  deleteIdea,
  createManualIdea,
  scoreIdeaForChannel,
} from "@/lib/ideas";
import { db } from "@/lib/db";

export async function generateIdeasAction(count: number = 5) {
  try {
    const created = await generateIdeas(count);
    revalidatePath("/dashboard/ideas");
    return { ok: true as const, count: created.length };
  } catch (e) {
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}

export async function setStatusAction(
  id: string,
  status: "pending" | "accepted" | "rejected" | "produced"
) {
  try {
    await setIdeaStatus(id, status);
    revalidatePath("/dashboard/ideas");
    return { ok: true as const };
  } catch (e) {
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}

export async function deleteIdeaAction(id: string) {
  try {
    await deleteIdea(id);
    revalidatePath("/dashboard/ideas");
    return { ok: true as const };
  } catch (e) {
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}

export async function createManualIdeaAction(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { ok: false as const, error: "Title is required." };
  const submittedBy = String(formData.get("submittedBy") ?? "").trim();
  if (!submittedBy) return { ok: false as const, error: "Your name is required so we know who added this." };
  const hook = String(formData.get("hook") ?? "").trim();
  const outline = String(formData.get("outline") ?? "").trim();
  const format = String(formData.get("format") ?? "either") as "long" | "short" | "either";
  const tagsRaw = String(formData.get("tags") ?? "");
  const tags = tagsRaw.split(",").map((t) => t.trim()).filter(Boolean);
  try {
    const created = await createManualIdea({ title, submittedBy, hook, outline, format, tags });
    // Score it immediately so the card shows a rating on first render.
    const scored = await scoreIdeaForChannel({ title, hook, outline, format });
    if (scored) {
      await db.videoIdea.update({
        where: { id: created.id },
        data: { aiScore: scored.score, modelUsed: scored.modelUsed },
      });
    }
    revalidatePath("/dashboard/ideas");
    return { ok: true as const, score: scored?.score ?? null };
  } catch (e) {
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}
