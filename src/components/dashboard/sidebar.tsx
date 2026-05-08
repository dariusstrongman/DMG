"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Video,
  Sparkles,
  Users,
  Bell,
  Settings,
  TrendingUp,
  Lightbulb,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Item = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
};

const PRIMARY: Item[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/videos", label: "Videos", icon: Video },
  { href: "/dashboard/ideas", label: "Ideas", icon: Lightbulb, badge: "AI" },
  { href: "/dashboard/analytics", label: "Analytics", icon: TrendingUp },
  { href: "/dashboard/ai", label: "AI Insights", icon: Sparkles },
  { href: "/dashboard/competitors", label: "Competitors", icon: Users },
  { href: "/dashboard/automations", label: "Automations", icon: Bell },
];

const SECONDARY: Item[] = [
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const path = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close drawer when navigating.
  useEffect(() => {
    setMobileOpen(false);
  }, [path]);

  // Lock body scroll while drawer is open.
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [mobileOpen]);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 shrink-0 border-r border-border/60 bg-background/50 backdrop-blur-md flex-col">
        <Brand />
        <nav className="flex-1 px-3 py-4 space-y-1">
          {PRIMARY.map((item) => (
            <SidebarItem key={item.href} item={item} active={isActive(path, item.href)} />
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-border/60 space-y-1">
          {SECONDARY.map((item) => (
            <SidebarItem key={item.href} item={item} active={isActive(path, item.href)} />
          ))}
        </div>
      </aside>

      {/* Mobile floating menu button */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
        className="lg:hidden fixed top-3 left-3 z-40 size-10 rounded-md bg-secondary/90 backdrop-blur border border-border grid place-items-center text-foreground hover:bg-secondary transition"
      >
        <Menu className="size-5" />
      </button>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <aside
            className="absolute inset-y-0 left-0 w-72 max-w-[85%] bg-background border-r border-border flex flex-col animate-rise"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border/60">
              <Brand />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="size-10 grid place-items-center text-muted-foreground hover:text-foreground mr-2"
              >
                <X className="size-5" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {PRIMARY.map((item) => (
                <SidebarItem key={item.href} item={item} active={isActive(path, item.href)} />
              ))}
            </nav>
            <div className="px-3 py-4 border-t border-border/60 space-y-1">
              {SECONDARY.map((item) => (
                <SidebarItem key={item.href} item={item} active={isActive(path, item.href)} />
              ))}
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}

function Brand() {
  return (
    <div className="px-5 py-5">
      <Link href="/dashboard" className="flex items-center gap-2.5">
        <div className="size-8 rounded-lg bg-gradient-to-br from-primary to-accent grid place-items-center text-sm font-bold text-primary-foreground">
          D
        </div>
        <div>
          <p className="text-sm font-semibold leading-none">DMG Analytics</p>
          <p className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground mt-1">
            by Stromation
          </p>
        </div>
      </Link>
    </div>
  );
}

function isActive(path: string, href: string) {
  if (href === "/dashboard") return path === "/dashboard";
  return path.startsWith(href);
}

function SidebarItem({ item, active }: { item: Item; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition group",
        active
          ? "bg-secondary/80 text-foreground"
          : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
      )}
    >
      <Icon
        className={cn(
          "size-4 transition",
          active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
        )}
      />
      <span className="flex-1">{item.label}</span>
      {item.badge && (
        <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/15 text-primary">
          {item.badge}
        </span>
      )}
    </Link>
  );
}
