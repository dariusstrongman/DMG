import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/settings");

  const meta = (user.user_metadata || {}) as {
    full_name?: string;
    name?: string;
    avatar_url?: string;
    picture?: string;
  };

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          user={{
            email: user.email,
            displayName: meta.full_name || meta.name || user.email,
            avatarUrl: meta.avatar_url || meta.picture || null
          }}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
          <div className="max-w-3xl mx-auto space-y-6 animate-rise">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
              <p className="text-muted-foreground mt-1">Profile, channels, billing, notifications.</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Profile</CardTitle>
                <CardDescription>Loaded from your Google account.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Row label="Email" value={user.email || "—"} />
                <Row label="Name" value={meta.full_name || meta.name || "—"} />
                <Row label="User ID" value={user.id} mono />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Connected channels</CardTitle>
                <CardDescription>None yet. Connect from the dashboard.</CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>Pass 3 — Discord webhook, email digests.</CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-destructive">Danger zone</CardTitle>
                <CardDescription>Sign out of this session.</CardDescription>
              </CardHeader>
              <CardContent>
                <form action="/auth/signout" method="POST">
                  <Button variant="destructive" type="submit">Sign out</Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-border/40 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? "font-mono text-xs" : ""}>{value}</span>
    </div>
  );
}
