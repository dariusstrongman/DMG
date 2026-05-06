"use client";

import { Search, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Topbar({ user }: { user: { email?: string | null; avatarUrl?: string | null; displayName?: string | null } }) {
  const initials = (user.displayName || user.email || "?")
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();

  return (
    <header className="h-14 px-4 sm:px-6 flex items-center justify-between border-b border-border/60 bg-background/50 backdrop-blur-md">
      {/* Search */}
      <div className="flex-1 max-w-xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search videos, channels, competitors…  (⌘K)"
            className="w-full h-9 pl-10 pr-3 rounded-md bg-secondary/40 border border-border/60 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 focus:bg-secondary/70 transition"
            disabled
            title="Coming in Pass 2"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="relative" disabled title="Coming in Pass 2">
          <Bell className="size-4" />
        </Button>
        <form action="/auth/signout" method="POST">
          <button
            type="submit"
            className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-secondary/40 border border-border/60 hover:bg-secondary/70 transition text-sm"
            title="Sign out"
          >
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarUrl}
                alt=""
                className="size-7 rounded-full"
              />
            ) : (
              <span className="size-7 rounded-full bg-gradient-to-br from-primary to-accent grid place-items-center text-xs font-semibold text-primary-foreground">
                {initials}
              </span>
            )}
            <span className="hidden sm:inline text-muted-foreground">
              {user.displayName || user.email}
            </span>
          </button>
        </form>
      </div>
    </header>
  );
}
