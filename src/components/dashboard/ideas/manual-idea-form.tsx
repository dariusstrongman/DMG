"use client";

import { useState, useTransition } from "react";
import { Plus, Loader2 } from "lucide-react";
import { createManualIdeaAction } from "@/app/dashboard/ideas/actions";

export function ManualIdeaForm() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await createManualIdeaAction(formData);
      if (!res.ok) {
        setError(res.error);
      } else {
        setOpen(false);
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition"
      >
        <Plus className="size-3.5" />
        Add manually
      </button>
    );
  }

  return (
    <form
      action={submit}
      className="rounded-xl border border-border bg-secondary/30 p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-mono uppercase tracking-widest text-muted-foreground">Add idea</h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      </div>
      <input
        name="submittedBy"
        required
        placeholder="Your name (so we know who added this)"
        className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm"
      />
      <input
        name="title"
        required
        placeholder="Title"
        className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm"
      />
      <input
        name="hook"
        placeholder="Hook (first 5 seconds, spoken)"
        className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm"
      />
      <textarea
        name="outline"
        placeholder="Outline (3-5 beats, one per line)"
        rows={4}
        className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm font-mono"
      />
      <div className="flex flex-wrap gap-2 items-center">
        <select
          name="format"
          defaultValue="either"
          className="text-xs font-mono bg-background border border-border rounded px-2 py-1.5"
        >
          <option value="either">Long or Short</option>
          <option value="long">Long</option>
          <option value="short">Short</option>
        </select>
        <input
          name="tags"
          placeholder="tags, comma, separated"
          className="flex-1 bg-background border border-border rounded-md px-3 py-1.5 text-xs font-mono"
        />
      </div>
      {error ? <p className="text-xs text-rose-400 font-mono">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-60"
      >
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
        {pending ? "Saving + AI scoring..." : "Save"}
      </button>
    </form>
  );
}
