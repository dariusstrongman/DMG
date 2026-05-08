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

// Score every idea that doesn't yet have an aiScore. One-time
// cleanup for ideas created before the scoring field existed; also
// useful if a generation skipped scoring for some reason.
export async function scoreUnscoredIdeasAction() {
  try {
    const { getActiveChannelDbId } = await import("@/lib/active-channel");
    const channelId = await getActiveChannelDbId();
    if (!channelId) return { ok: true as const, scored: 0, total: 0 };
    const targets = await db.videoIdea.findMany({
      where: { channelId, aiScore: null },
      select: { id: true, title: true, hook: true, outline: true, format: true },
      take: 50,
    });
    let scored = 0;
    for (const t of targets) {
      const res = await scoreIdeaForChannel({
        title: t.title,
        hook: t.hook ?? undefined,
        outline: t.outline ?? undefined,
        format: t.format,
      });
      if (res) {
        await db.videoIdea.update({
          where: { id: t.id },
          data: { aiScore: res.score, modelUsed: res.modelUsed },
        });
        scored++;
      }
    }
    revalidatePath("/dashboard/ideas");
    return { ok: true as const, scored, total: targets.length };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Unknown error" };
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
