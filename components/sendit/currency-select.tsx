"use client"

import { useMemo } from "react"

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DEFAULT_PINNED_CURRENCIES,
  FRANKFURTER_CURRENCY_CODES,
} from "@/lib/constants"

const currencyNames = new Intl.DisplayNames(["en"], { type: "currency" })

function currencyName(code: string) {
  const name = currencyNames.of(code)
  return name && name !== code ? name : "Currency"
}

function normalizeCurrencies(currencies: readonly string[]) {
  return Array.from(new Set(currencies.map((code) => code.toUpperCase())))
    .filter((code) => /^[A-Z]{3}$/.test(code))
}

export function CurrencySelect({
  value,
  defaultValue,
  onValueChange,
  name,
  id,
  disabled,
  pinnedCurrencies = DEFAULT_PINNED_CURRENCIES,
}: {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  name?: string
  id?: string
  disabled?: boolean
  pinnedCurrencies?: readonly string[]
}) {
  const pinned = useMemo(
    () => normalizeCurrencies(pinnedCurrencies),
    [pinnedCurrencies]
  )
  const pinnedSet = new Set(pinned)
  const allCurrencies = FRANKFURTER_CURRENCY_CODES.filter(
    (code) => !pinnedSet.has(code)
  )
  const items = [...pinned, ...allCurrencies].map((code) => ({
    label: code,
    value: code,
  }))

  return (
    <Select
      items={items}
      value={value}
      defaultValue={defaultValue}
      onValueChange={(next) => next && onValueChange?.(next)}
      name={name}
      disabled={disabled}
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder="Choose currency" />
      </SelectTrigger>
      <SelectContent className="min-w-64" alignItemWithTrigger={false}>
        {pinned.length > 0 && (
          <SelectGroup>
            <SelectLabel>Pinned</SelectLabel>
            {pinned.map((code) => (
              <SelectItem key={`pinned-${code}`} value={code}>
                <span className="w-9 font-mono font-medium">{code}</span>
                <span className="text-muted-foreground">{currencyName(code)}</span>
              </SelectItem>
            ))}
          </SelectGroup>
        )}
        {pinned.length > 0 && <SelectSeparator />}
        <SelectGroup>
          <SelectLabel>All currencies</SelectLabel>
          {allCurrencies.map((code) => (
            <SelectItem key={code} value={code}>
              <span className="w-9 font-mono font-medium">{code}</span>
              <span className="text-muted-foreground">{currencyName(code)}</span>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
