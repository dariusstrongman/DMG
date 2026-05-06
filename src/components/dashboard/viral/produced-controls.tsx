"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Clapperboard, Loader2, ExternalLink, X, Check } from "lucide-react";
import {
  markViralPickProducedAction,
  unmarkViralPickProducedAction,
} from "@/app/dashboard/viral/actions";

type Props = {
  pickId: string;
  producedYtVideoId: string | null;
  producedAt: Date | string | null;
};

export function ProducedControls({ pickId, producedYtVideoId, producedAt }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (producedYtVideoId) {
    return (
      <div className="rounded-md border border-emerald-500/30 bg-emerald-500/[0.06] px-3 py-2 flex items-center gap-2 flex-wrap">
        <Check className="size-3.5 text-emerald-300" />
        <span className="text-xs text-emerald-300 font-mono">Produced</span>
        <Link
          href={`https://youtube.com/watch?v=${producedYtVideoId}`}
          target="_blank"
          className="text-xs underline hover:text-foreground inline-flex items-center gap-1"
        >
          Watch <ExternalLink className="size-3" />
        </Link>
        {producedAt ? (
          <span className="text-[10px] font-mono text-muted-foreground/70 ml-auto">
            {new Date(producedAt).toLocaleDateString()}
          </span>
        ) : null}
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!confirm("Unlink this pitch from the produced video?")) return;
            startTransition(async () => {
              await unmarkViralPickProducedAction(pickId);
            });
          }}
          className="text-[10px] font-mono text-muted-foreground/70 hover:text-rose-300 transition disabled:opacity-50"
        >
          Unlink
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition"
      >
        <Clapperboard className="size-3.5" />
        Mark as produced
      </button>
    );
  }

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await markViralPickProducedAction(formData);
      if (!res.ok) setError(res.error);
      else setOpen(false);
    });
  }

  return (
    <form action={submit} className="flex items-center gap-2 flex-wrap">
      <input type="hidden" name="id" value={pickId} />
      <input
        name="urlOrId"
        type="text"
        required
        placeholder="YouTube URL or video id"
        className="flex-1 min-w-[200px] bg-background border border-border rounded-md px-2 py-1 text-xs font-mono"
      />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-primary text-primary-foreground text-xs disabled:opacity-60"
      >
        {pending ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
        Save
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground"
      >
        <X className="size-3" />
      </button>
      {error ? <p className="w-full text-[10px] text-rose-400 font-mono">{error}</p> : null}
    </form>
  );
}
