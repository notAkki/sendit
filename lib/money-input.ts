import type Decimal from "decimal.js"

import { currencyDigits, money } from "@/lib/money"

type MoneyInputOptions = {
  allowNegative?: boolean
}

export function parseMoneyInput(
  value: string,
  { allowNegative = false }: MoneyInputOptions = {},
): Decimal | null {
  let normalized = value
    .trim()
    .replace(/\u2212/g, "-")
    .replace(/\b[A-Za-z]{3}\b/g, "")
    .replace(/\p{Sc}/gu, "")
    .replace(/[\s,']/g, "")

  const parenthesized = normalized.startsWith("(") && normalized.endsWith(")")
  if (parenthesized) normalized = `-${normalized.slice(1, -1)}`
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) return null

  try {
    const amount = money(normalized)
    if (!amount.isFinite() || (!allowNegative && amount.isNegative())) return null
    return amount
  } catch {
    return null
  }
}

export function normalizeMoneyInput(
  value: string,
  currency: string,
  options: MoneyInputOptions & { showPositiveSign?: boolean } = {},
) {
  const amount = parseMoneyInput(value, options)
  if (!amount) return null
  const formatted = amount.toFixed(currencyDigits(currency))
  return options.showPositiveSign && amount.isPositive() ? `+${formatted}` : formatted
}

export function extractMoneyInputPair(text: string, currency: string) {
  const delimited = text
    .trim()
    .split(/\t|\r?\n|\s{2,}|[;|]/)
    .map((value) => value.trim())
    .filter(Boolean)

  const candidates = delimited.length >= 2
    ? delimited
    : text.match(/(?:[+-]\s*)?(?:\p{Sc}\s*)?(?:[+-]\s*)?(?:\d+(?:,\d{3})*(?:\.\d*)?|\.\d+)/gu) || []
  if (candidates.length < 2) return null

  const cost = normalizeMoneyInput(candidates[0], currency)
  const net = normalizeMoneyInput(candidates[1], currency, {
    allowNegative: true,
    showPositiveSign: true,
  })
  return cost && net ? { cost, net } : null
}
