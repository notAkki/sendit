"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { CurrencySelect } from "@/components/sendit/currency-select"
import type { Room } from "@/lib/types"

export function RoomCurrencySwitcher({
  room,
  preferredCurrency,
}: {
  room: Room
  preferredCurrency: string
}) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const requested = searchParams.get("display")?.toUpperCase()
  const selected = requested && /^[A-Z]{3}$/.test(requested)
    ? requested
    : preferredCurrency

  return (
    <div className="w-24 shrink-0">
      <label htmlFor="room-display-currency" className="sr-only">Display currency</label>
      <CurrencySelect
        id="room-display-currency"
        value={selected}
        pinnedCurrencies={room.displayCurrencies}
        onValueChange={(currency) => {
          const next = new URLSearchParams(searchParams.toString())
          next.set("display", currency)
          router.replace(`${pathname}?${next.toString()}`, { scroll: false })
        }}
      />
    </div>
  )
}
