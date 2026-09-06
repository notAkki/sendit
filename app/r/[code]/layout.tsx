import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, CloudOff, SearchX } from "lucide-react"

import { Brand } from "@/components/sendit/brand"
import { JoinRoom } from "@/components/sendit/join-room"
import { RoomRealtime } from "@/components/sendit/room-realtime"
import { RoomShell } from "@/components/sendit/room-shell"
import { ThemeToggle } from "@/components/sendit/theme-toggle"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { buttonVariants } from "@/components/ui/button"
import { getRoomAccess } from "@/lib/data"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: {
  params: Promise<{ code: string }>
}): Promise<Metadata> {
  const { code } = await params
  const access = await getRoomAccess(code)
  const roomName = access.state === "join"
    ? access.preview.name
    : access.state === "joined"
      ? access.ledger.room.name
      : null

  return {
    title: roomName ? `Sendit・${roomName}` : "Sendit",
  }
}

export default async function RoomLayout({ children, params }: {
  children: React.ReactNode
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const access = await getRoomAccess(code)

  if (access.state === "join") return <JoinRoom code={access.code} preview={access.preview} />

  if (access.state === "unconfigured" || access.state === "missing") {
    const unconfigured = access.state === "unconfigured"
    return (
      <main className="min-h-screen">
        <div className="mx-auto max-w-3xl px-5 sm:px-8">
          <header className="flex h-20 items-center justify-between border-b">
            <Brand />
            <ThemeToggle />
          </header>
          <section className="flex min-h-[65vh] flex-col items-center justify-center text-center">
            {unconfigured ? <CloudOff className="text-muted-foreground mb-5 size-10" /> : <SearchX className="text-muted-foreground mb-5 size-10" />}
            <h1 className="text-3xl font-semibold">{unconfigured ? "Connect Supabase" : "Room not found"}</h1>
            <p className="text-muted-foreground mt-3 max-w-md">
              {unconfigured
                ? "Sendit needs the two Supabase values in .env.local and the included database migration applied."
                : "This code may be mistyped or the creator may have rotated it. Ask a friend for the latest invite."}
            </p>
            {unconfigured && (
              <Alert className="mt-6 max-w-lg text-left">
                <AlertTitle>Local setup</AlertTitle>
                <AlertDescription>Copy .env.example to .env.local, enable anonymous sign-ins, then run the migration in Supabase.</AlertDescription>
              </Alert>
            )}
            <Link href="/" className={cn(buttonVariants(), "mt-7")}>
              <ArrowLeft data-icon="inline-start" /> Back home
            </Link>
          </section>
        </div>
      </main>
    )
  }

  return (
    <RoomShell ledger={access.ledger}>
      <RoomRealtime roomId={access.ledger.room.id} />
      {children}
    </RoomShell>
  )
}
