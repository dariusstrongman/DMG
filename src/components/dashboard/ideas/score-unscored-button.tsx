"use client";

import { useState, useTransition } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { scoreUnscoredIdeasAction } from "@/app/dashboard/ideas/actions";

export function ScoreUnscoredButton({ count }: { count: number }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (count === 0) return null;

  function trigger() {
    setError(null);
    startTransition(async () => {
      const res = await scoreUnscoredIdeasAction();
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/[0.04] px-3 py-2 flex items-center gap-2 flex-wrap">
      <Sparkles className="size-3.5 text-yellow-300 shrink-0" />
      <span className="text-xs text-foreground/90">
        {count} idea{count === 1 ? "" : "s"} without a score yet.
      </span>
      <button
        type="button"
        onClick={trigger}
        disabled={pending}
        className="ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-60"
      >
        {pending ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}
        {pending ? "Scoring..." : "Score them"}
      </button>
      {error ? <p className="w-full text-[10px] text-rose-400 font-mono">{error}</p> : null}
    </div>
  );
}
