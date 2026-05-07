import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { ChannelSwitcher } from "@/components/dashboard/channel-switcher";
import { getActiveChannel, listAvailableChannels } from "@/lib/active-channel";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Auth is enforced by src/middleware.ts. By the time this layout
  // renders, the request already has a valid signed session cookie.
  const [active, channels] = await Promise.all([
    getActiveChannel(),
    listAvailableChannels(),
  ]);

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          slot={
            <ChannelSwitcher
              channels={channels.map((c) => ({
                slug: c.slug,
                brand: c.brand,
                handle: c.handle,
                personal: c.personal,
              }))}
              activeSlug={active.slug}
            />
          }
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
