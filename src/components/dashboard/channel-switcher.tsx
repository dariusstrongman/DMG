"use client";

import { useTransition } from "react";
import { Tv } from "lucide-react";

type ChannelOpt = { slug: string; brand: string; handle: string; personal: boolean };

export function ChannelSwitcher({
  channels,
  activeSlug,
}: {
  channels: ChannelOpt[];
  activeSlug: string;
}) {
  const [pending, start] = useTransition();
  if (channels.length <= 1) return null;

  function pick(slug: string) {
    if (slug === activeSlug) return;
    start(async () => {
      const fd = new FormData();
      fd.set("slug", slug);
      fd.set("next", window.location.pathname);
      const res = await fetch("/api/channel", { method: "POST", body: fd, redirect: "follow" });
      // The route returns a 303; for personal channels with no session we
      // get redirected to /auth/personal. Either way, the browser ends up
      // somewhere useful — just navigate there.
      if (res.redirected) window.location.href = res.url;
      else window.location.reload();
    });
  }

  return (
    <div className="flex items-center gap-1 rounded-md border border-border/60 bg-secondary/40 p-1">
      <Tv className="size-3.5 text-muted-foreground ml-1" />
      {channels.map((c) => (
        <button
          key={c.slug}
          type="button"
          onClick={() => pick(c.slug)}
          disabled={pending}
          className={`px-2 py-1 rounded text-xs font-mono transition ${
            c.slug === activeSlug
              ? "bg-primary text-primary-foreground"
              : "hover:bg-secondary/80 text-muted-foreground hover:text-foreground"
          }`}
          title={c.handle}
        >
          {c.brand}
        </button>
      ))}
    </div>
  );
}
