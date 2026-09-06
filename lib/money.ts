import Decimal from "decimal.js"

Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP })

export function currencyDigits(currency: string) {
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency,
    }).resolvedOptions().maximumFractionDigits ?? 2
  } catch {
    return 2
  }
}

export function money(value: Decimal.Value) {
  return new Decimal(value || 0)
}

export function toMinor(value: Decimal.Value, currency: string) {
  return money(value)
    .mul(new Decimal(10).pow(currencyDigits(currency)))
    .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
}

export function fromMinor(value: Decimal.Value, currency: string) {
  return money(value)
    .div(new Decimal(10).pow(currencyDigits(currency)))
    .toFixed(currencyDigits(currency))
}

export function formatMoney(
  value: Decimal.Value,
  currency: string,
  options?: { sign?: boolean; compact?: boolean },
) {
  const amount = money(value).toNumber()
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    notation: options?.compact ? "compact" : "standard",
    signDisplay: options?.sign ? "exceptZero" : "auto",
    maximumFractionDigits: options?.compact ? 1 : undefined,
  }).format(amount)
}

export function allocateWeighted(
  total: Decimal.Value,
  currency: string,
  entries: Array<{ memberId: string; weight: Decimal.Value }>,
) {
  if (entries.length === 0) throw new Error("Choose at least one participant.")

  const totalMinor = toMinor(total, currency)
  const normalized = entries.map((entry) => ({
    memberId: entry.memberId,
    weight: money(entry.weight),
  }))
  const weightTotal = normalized.reduce((sum, entry) => sum.plus(entry.weight), money(0))

  if (weightTotal.lte(0) || normalized.some((entry) => entry.weight.lt(0))) {
    throw new Error("Split values must be positive.")
  }

  const provisional = normalized.map((entry) => {
    const exact = totalMinor.mul(entry.weight).div(weightTotal)
    const floor = exact.floor()
    return { ...entry, exact, minor: floor, remainder: exact.minus(floor) }
  })

  let remaining = totalMinor.minus(
    provisional.reduce((sum, entry) => sum.plus(entry.minor), money(0)),
  ).toNumber()

  provisional
    .sort((a, b) => {
      const byRemainder = b.remainder.comparedTo(a.remainder)
      return byRemainder || a.memberId.localeCompare(b.memberId)
    })
    .forEach((entry) => {
      if (remaining > 0) {
        entry.minor = entry.minor.plus(1)
        remaining -= 1
      }
    })

  return provisional
    .sort((a, b) => a.memberId.localeCompare(b.memberId))
    .map((entry) => ({
      memberId: entry.memberId,
      amount: fromMinor(entry.minor, currency),
    }))
}

export function convertAndAllocate(
  allocations: Array<{ memberId: string; amount: string }>,
  baseTotal: string,
  baseCurrency: string,
) {
  return allocateWeighted(
    baseTotal,
    baseCurrency,
    allocations.map((allocation) => ({
      memberId: allocation.memberId,
      weight: allocation.amount,
    })),
  )
}
