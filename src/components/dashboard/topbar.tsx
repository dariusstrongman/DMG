"use client";

import { Search, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Topbar() {
  return (
    <header className="h-14 px-4 sm:px-6 flex items-center justify-between border-b border-border/60 bg-background/50 backdrop-blur-md">
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

      <form action="/auth/signout" method="POST">
        <Button type="submit" variant="ghost" size="sm" className="gap-2">
          <LogOut className="size-4" />
          Sign out
        </Button>
      </form>
    </header>
  );
}
