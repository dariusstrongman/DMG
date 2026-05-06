"use client";

import { useState, useTransition } from "react";
import { Plus, Loader2 } from "lucide-react";
import { addCompetitorAction } from "@/app/dashboard/competitors/actions";

export function AddCompetitorForm() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await addCompetitorAction(formData);
      if (!res.ok) setError(res.error);
      else setOpen(false);
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
      >
        <Plus className="size-3.5" />
        Add competitor
      </button>
    );
  }

  return (
    <form action={submit} className="rounded-xl border border-border bg-secondary/30 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-mono uppercase tracking-widest text-muted-foreground">Track a channel</h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      </div>
      <input
        name="handle"
        required
        placeholder="@theirhandle"
        className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm font-mono"
      />
      {error ? <p className="text-xs text-rose-400 font-mono">{error}</p> : null}
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-60"
        >
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
          Add
        </button>
        <p className="text-xs text-muted-foreground">
          Paste a YouTube handle. We&apos;ll snapshot stats hourly.
        </p>
      </div>
    </form>
  );
}
