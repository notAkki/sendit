"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"

export function RoomRealtime({ roomId }: { roomId: string }) {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    let timeout: ReturnType<typeof setTimeout> | undefined
    let disposed = false
    let channel: ReturnType<typeof supabase.channel> | undefined
    const refresh = () => {
      clearTimeout(timeout)
      timeout = setTimeout(() => router.refresh(), 180)
    }
    void (async () => {
      await supabase.realtime.setAuth()
      if (disposed) return
      channel = supabase
        .channel(`room:${roomId}`, { config: { private: true } })
        .on("broadcast", { event: "*" }, refresh)
        .subscribe()
    })()

    return () => {
      disposed = true
      clearTimeout(timeout)
      if (channel) void supabase.removeChannel(channel)
    }
  }, [roomId, router])

  return null
}
