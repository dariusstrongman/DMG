import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";

export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  // Middleware should already gate this, but defense in depth.
  if (!user) redirect("/login?next=/dashboard");

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
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
