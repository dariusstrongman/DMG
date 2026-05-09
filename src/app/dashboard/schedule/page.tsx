import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarClock } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 60;

type ScheduleItem = {
  id: string;
  scheduledAt: string;
  account: {
    id: string;
    username: string;
    profileImageUrl: string;
  };
  draft: {
    target: { targetType: "tiktok" | "instagram" | string };
    content: {
      text: string;
      platform: string;
      mediaUrls: string[];
    };
    accountId: string;
  };
};

type ScheduleResponse = {
  items: ScheduleItem[];
  count: number;
  cursor?: string | null;
};

async function fetchAllSchedules(): Promise<ScheduleItem[]> {
  const key = process.env.BLOTATO_API_KEY;
  if (!key) return [];

  const all: ScheduleItem[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 10; page++) {
    const url = new URL("https://backend.blotato.com/v2/schedules");
    url.searchParams.set("limit", "100");
    if (cursor) url.searchParams.set("cursor", cursor);

    const res = await fetch(url, {
      headers: { "blotato-api-key": key },
      cache: "no-store",
    });
    if (!res.ok) break;
    const data = (await res.json()) as ScheduleResponse;
    all.push(...(data.items ?? []));
    if (!data.cursor || (data.items?.length ?? 0) < 100) break;
    cursor = data.cursor;
  }
  return all;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Chicago",
  });
}

function dayKey(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "America/Chicago",
  });
}

function PlatformBadge({ platform }: { platform: string }) {
  const isTT = platform === "tiktok";
  return (
    <span
      className={
        "text-[10px] uppercase tracking-wider font-mono px-2 py-0.5 rounded " +
        (isTT
          ? "bg-foreground/10 text-foreground"
          : "bg-pink-500/15 text-pink-400")
      }
    >
      {isTT ? "TikTok" : platform === "instagram" ? "Instagram" : platform}
    </span>
  );
}

export default async function SchedulePage() {
  const items = await fetchAllSchedules();
  items.sort(
    (a, b) =>
      new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
  );

  // Group by day for visual scan.
  const groups = new Map<string, ScheduleItem[]>();
  for (const it of items) {
    const k = dayKey(it.scheduledAt);
    const arr = groups.get(k) ?? [];
    arr.push(it);
    groups.set(k, arr);
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <div className="flex items-center gap-2.5 mb-1">
          <CalendarClock className="size-5 text-primary" />
          <h1 className="text-2xl font-semibold tracking-tight">Schedule</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {items.length} post{items.length === 1 ? "" : "s"} queued on Blotato across TikTok and Instagram. All times in Central.
        </p>
      </div>

      {!process.env.BLOTATO_API_KEY ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            <p>
              <code className="font-mono">BLOTATO_API_KEY</code> is not set in this environment. Add it to Vercel and redeploy.
            </p>
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Nothing scheduled right now.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Array.from(groups.entries()).map(([day, posts]) => (
            <section key={day} className="space-y-2">
              <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground px-1">
                {day}
              </h2>
              <Card>
                <CardContent className="p-0 divide-y divide-border/60">
                  {posts.map((p) => (
                    <ScheduleRow key={p.id} item={p} />
                  ))}
                </CardContent>
              </Card>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function ScheduleRow({ item }: { item: ScheduleItem }) {
  const platform = item.draft.target.targetType;
  const text = item.draft.content.text ?? "";
  const thumb = item.draft.content.mediaUrls?.[0];
  const handle = item.account.username || item.draft.accountId;
  return (
    <div className="flex items-start gap-4 p-4">
      {thumb ? (
        <video
          src={thumb}
          className="w-16 h-28 sm:w-20 sm:h-32 rounded-md object-cover bg-secondary shrink-0"
          muted
          playsInline
          preload="metadata"
        />
      ) : (
        <div className="w-16 h-28 sm:w-20 sm:h-32 rounded-md bg-secondary shrink-0" />
      )}
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <PlatformBadge platform={platform} />
          <span className="text-xs text-muted-foreground">@{handle}</span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs text-foreground/80 font-mono">
            {formatDate(item.scheduledAt)}
          </span>
        </div>
        <p className="text-sm text-foreground/90 line-clamp-3 whitespace-pre-wrap">
          {text}
        </p>
      </div>
      {item.account.profileImageUrl ? (
        <Image
          src={item.account.profileImageUrl}
          alt={handle}
          width={28}
          height={28}
          className="rounded-full shrink-0 hidden sm:block"
          unoptimized
        />
      ) : null}
    </div>
  );
}
