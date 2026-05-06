import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getSettings } from "@/lib/settings";
import { DashboardSettingsForm } from "@/components/settings/dashboard-settings-form";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getSettings();

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
          <div className="max-w-3xl mx-auto space-y-6 animate-rise">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
              <p className="text-muted-foreground mt-1">Tune the dashboard without redeploying.</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Dashboard</CardTitle>
                <CardDescription>
                  Goal, deadline, and timezone. Used by the Goal Tracker, posting-time analysis, and the weekly Viral Pick.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DashboardSettingsForm initial={settings} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Access</CardTitle>
                <CardDescription>
                  This dashboard is shared by password. Anyone with the password can view stats.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  To rotate the password, update <code className="text-foreground font-mono">DMG_PASSWORD</code> in Vercel env vars and redeploy. Existing sessions stay valid for 30 days. To force everyone out, also rotate <code className="text-foreground font-mono">DMG_AUTH_SECRET</code>.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sign out</CardTitle>
                <CardDescription>Clears your session cookie on this device.</CardDescription>
              </CardHeader>
              <CardContent>
                <form action="/auth/signout" method="POST">
                  <Button variant="destructive" type="submit">
                    Sign out
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
