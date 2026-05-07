// Personal-channel password gate. Same look as /login. Lands here when
// the user clicks a personal channel in the switcher without an active
// personal session.

import Link from "next/link";
import { ArrowLeft, Lock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getChannelBySlug } from "@/lib/config";

type SearchParams = Promise<{ next?: string; slug?: string; error?: string }>;

export default async function PersonalLoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const next = sp.next || "/dashboard";
  const slug = sp.slug || "";
  const error = sp.error;
  const channel = getChannelBySlug(slug);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-6 py-5 flex items-center">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="size-4" />
          Back to dashboard
        </Link>
      </header>

      <main className="flex-1 grid place-items-center px-4 py-12">
        <div className="w-full max-w-md animate-rise">
          <div className="glass-strong rounded-2xl p-8 sm:p-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="size-10 rounded-lg bg-gradient-to-br from-primary to-accent grid place-items-center font-semibold text-primary-foreground">
                <Lock className="size-5" />
              </div>
              <div>
                <h1 className="text-lg font-semibold">Personal channel</h1>
                <p className="text-xs text-muted-foreground font-mono">{channel.brand}</p>
              </div>
            </div>

            {error ? (
              <div className="mb-4 flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertTriangle className="size-4" />
                Wrong password.
              </div>
            ) : null}

            <form action="/api/auth/personal" method="post" className="space-y-4">
              <input type="hidden" name="next" value={next} />
              <input type="hidden" name="slug" value={slug} />
              <div>
                <label htmlFor="password" className="block text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoFocus
                  required
                  className="w-full rounded-md border border-border bg-secondary/40 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <Button type="submit" className="w-full">
                Unlock
              </Button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
