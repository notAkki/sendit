import "server-only"

import { getLatestRate } from "@/lib/fx"
import { currencyDigits, money } from "@/lib/money"
import type { RoomLedger } from "@/lib/types"

export type DisplayCurrency = {
  code: string
  rate: string
  effectiveDate: string
  error: string | null
}

export async function resolveDisplayCurrency(
  ledger: RoomLedger,
  requested?: string
): Promise<DisplayCurrency> {
  const currentMember = ledger.members.find(
    (member) => member.id === ledger.currentMemberId
  )
  const normalized = requested?.trim().toUpperCase()
  const code = normalized && /^[A-Z]{3}$/.test(normalized)
    ? normalized
    : currentMember?.preferredCurrency || ledger.room.baseCurrency
  const today = new Date().toISOString().slice(0, 10)

  if (code === ledger.room.baseCurrency) {
    return { code, rate: "1", effectiveDate: today, error: null }
  }

  try {
    const snapshot = await getLatestRate(ledger.room.baseCurrency, code)
    return {
      code,
      rate: snapshot.rate,
      effectiveDate: snapshot.effectiveDate,
      error: null,
    }
  } catch {
    return {
      code: ledger.room.baseCurrency,
      rate: "1",
      effectiveDate: today,
      error: `No current ${code} rate is available. Showing ${ledger.room.baseCurrency} instead.`,
    }
  }
}

export function convertBaseAmount(value: string, display: DisplayCurrency) {
  return money(value).mul(display.rate).toFixed(currencyDigits(display.code))
}
