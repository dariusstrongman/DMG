"use client";

import { useState, useTransition } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { generateDigestAction } from "@/app/dashboard/ai/actions";

export function GenerateDigestButton({ label = "Generate weekly digest" }: { label?: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function trigger() {
    setError(null);
    startTransition(async () => {
      const res = await generateDigestAction();
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={trigger}
        disabled={pending}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-60"
      >
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
        {pending ? "Thinking..." : label}
      </button>
      {error ? (
        <span className="text-xs text-rose-400 font-mono max-w-md truncate" title={error}>
          {error}
        </span>
      ) : null}
    </div>
  );
}
