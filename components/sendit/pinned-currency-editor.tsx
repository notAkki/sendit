"use client"

import { useState } from "react"
import { Plus, X } from "lucide-react"

import { CurrencySelect } from "@/components/sendit/currency-select"
import { Button } from "@/components/ui/button"
import { DEFAULT_PINNED_CURRENCIES } from "@/lib/constants"

export function PinnedCurrencyEditor({
  name,
  baseCurrency,
  defaultValue,
}: {
  name: string
  baseCurrency: string
  defaultValue: readonly string[]
}) {
  const initial = Array.from(new Set([baseCurrency, ...defaultValue]))
  const [currencies, setCurrencies] = useState(initial)
  const firstSuggestion = DEFAULT_PINNED_CURRENCIES.find(
    (code) => !initial.includes(code)
  ) || "GBP"
  const [candidate, setCandidate] = useState(firstSuggestion)

  function addCurrency() {
    if (currencies.includes(candidate) || currencies.length >= 8) return
    setCurrencies((current) => [...current, candidate])
  }

  return (
    <div className="flex flex-col gap-2">
      <input type="hidden" name={name} value={currencies.join(",")} />
      <div className="flex gap-2">
        <div className="min-w-0 flex-1">
          <CurrencySelect
            value={candidate}
            onValueChange={setCandidate}
            pinnedCurrencies={currencies}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={addCurrency}
          disabled={currencies.includes(candidate) || currencies.length >= 8}
        >
          <Plus data-icon="inline-start" />
          Pin
        </Button>
      </div>
      <div className="flex min-h-7 flex-wrap gap-1.5">
        {currencies.map((code) => (
          <Button
            key={code}
            type="button"
            variant="secondary"
            size="xs"
            disabled={code === baseCurrency}
            onClick={() => setCurrencies((current) => current.filter((item) => item !== code))}
            aria-label={code === baseCurrency ? `${code} is the base currency` : `Unpin ${code}`}
          >
            {code}
            {code !== baseCurrency && <X data-icon="inline-end" />}
          </Button>
        ))}
      </div>
    </div>
  )
}
