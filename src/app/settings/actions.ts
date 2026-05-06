"use server";

import { revalidatePath } from "next/cache";
import { updateSettings } from "@/lib/settings";

export async function saveSettingsAction(formData: FormData) {
  const goalRaw = String(formData.get("subscriberGoal") ?? "").trim();
  const goal = parseInt(goalRaw, 10);
  if (!Number.isFinite(goal) || goal < 1) {
    return { ok: false as const, error: "Subscriber goal must be a positive integer." };
  }

  const deadlineRaw = String(formData.get("subscriberGoalDeadline") ?? "").trim();
  const deadline = deadlineRaw === "" ? null : deadlineRaw;
  if (deadline && !/^\d{4}-\d{2}-\d{2}$/.test(deadline)) {
    return { ok: false as const, error: "Deadline must be yyyy-mm-dd." };
  }

  const tz = String(formData.get("channelTimezone") ?? "").trim();
  if (!tz) {
    return { ok: false as const, error: "Timezone required." };
  }
  // Validate IANA timezone by attempting to format with it.
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
  } catch {
    return { ok: false as const, error: `"${tz}" isn't a valid IANA timezone.` };
  }

  try {
    await updateSettings({
      subscriberGoal: goal,
      subscriberGoalDeadline: deadline,
      channelTimezone: tz,
    });
    revalidatePath("/settings");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/analytics");
    revalidatePath("/dashboard/viral");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Unknown error" };
  }
}
