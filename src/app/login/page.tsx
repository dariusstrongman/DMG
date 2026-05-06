import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

type SearchParams = Promise<{ next?: string; error?: string }>;

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const next = sp.next || "/dashboard";
  const error = sp.error;

  return (
    <Suspense fallback={null}>
      <LoginShell next={next} error={error} />
    </Suspense>
  );
}

function LoginShell({ next, error }: { next: string; error?: string }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-6 py-5 flex items-center">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="size-4" />
          Back
        </Link>
      </header>

      <main className="flex-1 grid place-items-center px-4 py-12">
        <div className="w-full max-w-md animate-rise">
          <div className="glass-strong rounded-2xl p-8 sm:p-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="size-10 rounded-lg bg-gradient-to-br from-primary to-accent grid place-items-center font-semibold text-primary-foreground">
                D
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono">
                  Stromation
                </p>
                <h1 className="text-base font-semibold">DMG Analytics</h1>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-accent mb-3">
              <Lock className="size-3.5" />
              Private dashboard
            </div>
            <h2 className="text-3xl font-semibold tracking-tight mb-2">
              Enter shared password
            </h2>
            <p className="text-muted-foreground mb-8">
              For DMG channel team members only.
            </p>

            {error && (
              <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 mb-6 text-sm">
                <AlertTriangle className="size-4 text-destructive mt-0.5 shrink-0" />
                <span className="text-foreground/90">
                  {error === "wrong"
                    ? "That password is wrong. Try again."
                    : "Couldn't sign you in. Try again."}
                </span>
              </div>
            )}

            <form action="/auth/login" method="POST" className="space-y-4">
              <input type="hidden" name="next" value={next} />
              <div>
                <label htmlFor="password" className="sr-only">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  autoFocus
                  required
                  placeholder="Password"
                  className="w-full h-12 px-4 rounded-md bg-secondary/40 border border-border text-base placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 focus:bg-secondary/70 transition"
                />
              </div>
              <Button type="submit" size="lg" className="w-full">
                Continue
              </Button>
            </form>

            <p className="text-xs text-muted-foreground mt-6 text-center">
              Don't have it? Ask whoever set up the dashboard.
            </p>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Built by{" "}
            <a
              href="https://stromation.com"
              className="text-foreground/80 hover:text-foreground"
            >
              Stromation
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
