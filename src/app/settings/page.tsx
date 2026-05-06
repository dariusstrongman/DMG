import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
          <div className="max-w-3xl mx-auto space-y-6 animate-rise">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
              <p className="text-muted-foreground mt-1">Connected channels and notifications.</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Access</CardTitle>
                <CardDescription>
                  This dashboard is shared by password. Anyone with the password can view stats.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>To rotate the password, update <code className="text-foreground font-mono">DMG_PASSWORD</code> in Vercel env vars and redeploy. All existing sessions will continue to work until they expire (30 days). To force everyone out, also rotate <code className="text-foreground font-mono">DMG_AUTH_SECRET</code>.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Connected channels</CardTitle>
                <CardDescription>None yet. Connect from the dashboard (Pass 2).</CardDescription>
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
                <CardTitle>Sign out</CardTitle>
                <CardDescription>Clears your session cookie on this device.</CardDescription>
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
