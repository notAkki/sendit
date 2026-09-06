import "server-only"

import { z } from "zod"

import { money } from "@/lib/money"
import type { FxSnapshot } from "@/lib/types"

const frankfurterRateSchema = z.object({
  date: z.string(),
  base: z.string(),
  quote: z.string(),
})

export async function getFxSnapshot({
  from,
  to,
  date,
}: {
  from: string
  to: string
  date: string
}): Promise<FxSnapshot> {
  if (from === to) {
    return { rate: "1", requestedDate: date, effectiveDate: date, source: "identity" }
  }

  const url = new URL(`https://api.frankfurter.dev/v2/rate/${from}/${to}`)
  url.searchParams.set("date", date)
  const isToday = date === new Date().toISOString().slice(0, 10)
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: isToday ? 3_600 : false },
  })
  if (!response.ok) {
    throw new Error(`Frankfurter does not have a ${from} to ${to} rate for this date.`)
  }
  const raw = await response.text()
  let payload: unknown
  try {
    payload = JSON.parse(raw)
  } catch {
    throw new Error("The exchange-rate service returned an unexpected response.")
  }
  const parsed = frankfurterRateSchema.safeParse(payload)
  const rateMatch = raw.match(/"rate"\s*:\s*(-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)/)
  if (!parsed.success || !rateMatch || !money(rateMatch[1]).isPositive()) {
    throw new Error("The exchange-rate service returned an unexpected response.")
  }
  return {
    rate: money(rateMatch[1]).toSignificantDigits(18).toString(),
    requestedDate: date,
    effectiveDate: parsed.data.date,
    source: "frankfurter",
  }
}

export async function getLatestRate(from: string, to: string) {
  const today = new Date().toISOString().slice(0, 10)
  return getFxSnapshot({ from, to, date: today })
}
