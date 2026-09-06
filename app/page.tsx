import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Brand } from "@/components/sendit/brand";
import { LandingActions } from "@/components/sendit/landing-actions";
import { MemberAvatar } from "@/components/sendit/member-avatar";
import { ThemeToggle } from "@/components/sendit/theme-toggle";
import { getMyRooms } from "@/lib/data";
import { participantColor } from "@/lib/participant-colors";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { cn } from "@/lib/utils";

export default async function Home() {
  const configured = isSupabaseConfigured();
  const rooms = await getMyRooms();

  return (
    <div className="min-h-screen">
      <header className="bg-background/92 sticky top-0 z-40 border-b backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Brand />
          <ThemeToggle variant="outline" />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div
          className={cn(
            "mx-auto min-h-[calc(100vh-8rem)] items-center py-8",
            rooms.length
              ? "grid max-w-5xl gap-12 px-2 sm:px-8 lg:grid-cols-[1fr_26rem] lg:px-9"
              : "flex max-w-[26rem]",
          )}
        >
          {rooms.length > 0 && (
            <section aria-labelledby="your-rooms-title">
              <h1 id="your-rooms-title" className="text-2xl font-semibold tracking-tight">
                Your rooms
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Saved on this device
              </p>

              <div className="mt-6 divide-y border-y">
                {rooms.map((entry) => (
                  <Link
                    key={entry.room.id}
                    href={`/r/${entry.room.code}`}
                    className="hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:ring-ring flex items-center gap-3 px-2 py-4 outline-none focus-visible:ring-2"
                  >
                    <MemberAvatar
                      name={entry.member.name}
                      color={
                        entry.participantIndex >= 0
                          ? participantColor(entry.participantIndex)
                          : undefined
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{entry.room.name}</p>
                      <p className="text-muted-foreground truncate text-sm">
                        {entry.member.name} · {entry.room.baseCurrency}
                      </p>
                    </div>
                    <ArrowRight className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
                  </Link>
                ))}
              </div>
            </section>
          )}

          <LandingActions configured={configured} />
        </div>
      </main>
    </div>
  );
}
