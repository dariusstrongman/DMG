"use client";

import { useState, useTransition } from "react";
import { Flame, Loader2 } from "lucide-react";
import { generateViralPickAction } from "@/app/dashboard/viral/actions";

export function GenerateViralPickButton({
  label,
  small,
}: {
  label: string;
  small?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function trigger() {
    setError(null);
    startTransition(async () => {
      const res = await generateViralPickAction();
      if (!res.ok) setError(res.error);
    });
  }

  const sizing = small ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm";

  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={trigger}
        disabled={pending}
        className={`inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-60 transition ${sizing}`}
      >
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Flame className="size-3.5" />}
        {pending ? "Synthesizing..." : label}
      </button>
      {error ? (
        <span className="text-xs text-rose-400 font-mono max-w-md truncate" title={error}>
          {error}
        </span>
      ) : null}
    </div>
  );
}
