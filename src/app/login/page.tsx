"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

function LoginContent() {
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";
  const errorParam = params.get("error");
  const [busy, setBusy] = useState(false);

  async function signInWithGoogle() {
    setBusy(true);
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: { access_type: "offline", prompt: "consent" }
      }
    });
    if (error) {
      setBusy(false);
      console.error(error);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="px-6 py-5 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="size-4" />
          Back
        </Link>
        <span className="text-sm text-muted-foreground">
          New here?{" "}
          <button
            onClick={signInWithGoogle}
            className="text-foreground hover:text-primary transition underline-offset-4 hover:underline"
          >
            Create account
          </button>
        </span>
      </header>

      {/* Centered card */}
      <main className="flex-1 grid place-items-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md"
        >
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

            <h2 className="text-3xl font-semibold tracking-tight mb-2">
              Sign in to your dashboard
            </h2>
            <p className="text-muted-foreground mb-8">
              Continue with Google. We'll only request the YouTube scopes when you
              connect a channel.
            </p>

            {errorParam && (
              <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 mb-6 text-sm">
                <AlertTriangle className="size-4 text-destructive mt-0.5 shrink-0" />
                <span className="text-foreground/90">
                  Something went wrong with the OAuth callback. Try again — if
                  it keeps failing, check your Supabase Auth provider config.
                </span>
              </div>
            )}

            <Button
              size="lg"
              className="w-full"
              onClick={signInWithGoogle}
              disabled={busy}
            >
              {busy ? (
                "Redirecting…"
              ) : (
                <>
                  <GoogleIcon className="size-4" />
                  Continue with Google
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground mt-8 text-center leading-relaxed">
              By signing in you agree to our{" "}
              <Link href="/terms" className="underline underline-offset-4 hover:text-foreground">
                Terms
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="underline underline-offset-4 hover:text-foreground">
                Privacy Policy
              </Link>
              .
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
        </motion.div>
      </main>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#FFC107"
        d="M21.8 10.2H12v3.8h5.6c-.5 2.5-2.6 4.3-5.6 4.3-3.4 0-6.1-2.7-6.1-6.1S8.6 6.1 12 6.1c1.5 0 2.9.6 4 1.5l2.8-2.8C16.9 3.1 14.6 2 12 2 6.5 2 2 6.5 2 12s4.5 10 10 10c5.8 0 9.6-4.1 9.6-9.8 0-.7-.1-1.4-.2-2z"
      />
      <path
        fill="#FF3D00"
        d="M3.2 7.3l3.2 2.4C7.4 7.8 9.5 6.1 12 6.1c1.5 0 2.9.6 4 1.5l2.8-2.8C16.9 3.1 14.6 2 12 2 8.1 2 4.7 4.1 3.2 7.3z"
      />
      <path
        fill="#4CAF50"
        d="M12 22c2.6 0 5-1 6.7-2.6l-3.1-2.6c-.9.6-2.1 1-3.6 1-2.9 0-5.4-1.9-6.3-4.5L2.4 15.9C3.9 19.5 7.6 22 12 22z"
      />
      <path
        fill="#1976D2"
        d="M21.8 10.2H12v3.8h5.6c-.3 1.4-1 2.5-2.1 3.3v.1l3.1 2.5c-.2.2 3.3-2.4 3.3-7.5 0-.7-.1-1.5-.1-2.2z"
      />
    </svg>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
