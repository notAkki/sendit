import { Brand } from "@/components/sendit/brand";
import { LandingActions } from "@/components/sendit/landing-actions";
import { SavedRoomList } from "@/components/sendit/saved-room-list";
import { ThemeToggle } from "@/components/sendit/theme-toggle";
import { getMyRooms } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { cn } from "@/lib/utils";

export default async function Home() {
  const configured = isSupabaseConfigured();
  const rooms = await getMyRooms();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="bg-background/92 sticky top-0 z-40 shrink-0 border-b backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Brand />
          <ThemeToggle variant="outline" />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div
          className={cn(
            "mx-auto w-full flex-1 items-center py-8",
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

              <SavedRoomList
                key={rooms.map((entry) => `${entry.room.id}:${entry.isArchived}`).join("|")}
                rooms={rooms}
              />
            </section>
          )}

          <LandingActions configured={configured} />
        </div>
      </main>
    </div>
  );
}
