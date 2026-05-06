"use client";

import { useState, useTransition } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { generateIdeasAction } from "@/app/dashboard/ideas/actions";

export function GenerateButton({ defaultCount = 5 }: { defaultCount?: number }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(defaultCount);

  function trigger() {
    setError(null);
    startTransition(async () => {
      const res = await generateIdeasAction(count);
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={count}
        onChange={(e) => setCount(Number(e.target.value))}
        disabled={pending}
        className="text-xs font-mono bg-secondary border border-border rounded px-2 py-1.5"
      >
        <option value={3}>3</option>
        <option value={5}>5</option>
        <option value={8}>8</option>
        <option value={10}>10</option>
      </select>
      <button
        type="button"
        onClick={trigger}
        disabled={pending}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-60 transition"
      >
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
        {pending ? "Thinking..." : "Generate ideas"}
      </button>
      {error ? (
        <span className="text-xs text-rose-400 font-mono max-w-md truncate" title={error}>
          {error}
        </span>
      ) : null}
    </div>
  );
}
