"use client";

import { useState, useTransition } from "react";
import { Loader2, Save, Check } from "lucide-react";
import { saveSettingsAction } from "@/app/settings/actions";
import { COMMON_TIMEZONES } from "@/lib/settings";

export function DashboardSettingsForm({
  initial,
}: {
  initial: { subscriberGoal: number; subscriberGoalDeadline: string | null; channelTimezone: string };
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function submit(formData: FormData) {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await saveSettingsAction(formData);
      if (!res.ok) setError(res.error);
      else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    });
  }

  return (
    <form action={submit} className="space-y-5">
      <Field
        label="Subscriber goal"
        hint="Target shown on the Goal Tracker. Bump this when you cross it."
      >
        <input
          name="subscriberGoal"
          type="number"
          min={1}
          step={100}
          defaultValue={initial.subscriberGoal}
          required
          className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm font-mono"
        />
      </Field>

      <Field
        label="Goal deadline"
        hint="Optional yyyy-mm-dd. If set, the Goal Tracker shows on-pace / behind framing."
      >
        <input
          name="subscriberGoalDeadline"
          type="date"
          defaultValue={initial.subscriberGoalDeadline ?? ""}
          className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm font-mono"
        />
      </Field>

      <Field
        label="Channel timezone"
        hint="Used for posting-time analysis and the Viral Pick. Pick or paste an IANA string."
      >
        <input
          name="channelTimezone"
          type="text"
          defaultValue={initial.channelTimezone}
          required
          list="tz-list"
          className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm font-mono"
        />
        <datalist id="tz-list">
          {COMMON_TIMEZONES.map((tz) => (
            <option key={tz} value={tz} />
          ))}
        </datalist>
      </Field>

      {error ? <p className="text-xs text-rose-400 font-mono">{error}</p> : null}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-60"
        >
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : saved ? <Check className="size-3.5" /> : <Save className="size-3.5" />}
          {pending ? "Saving..." : saved ? "Saved" : "Save settings"}
        </button>
      </div>
    </form>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div>
        <label className="text-sm font-medium">{label}</label>
        {hint ? <p className="text-xs text-muted-foreground mt-0.5">{hint}</p> : null}
      </div>
      {children}
    </div>
  );
}
