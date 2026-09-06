"use client"

import { useCallback, useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Search } from "lucide-react"

import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"

type FilterMember = { id: string; name: string }

export function ExpenseFilters({
  members,
  initial,
}: {
  members: FilterMember[]
  initial: { query: string; payer: string; beneficiary: string }
}) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(initial.query)

  const update = useCallback((key: string, value: string) => {
    const next = new URLSearchParams(searchParams.toString())
    next.delete("from")
    next.delete("to")
    next.delete("currency")
    if (value) next.set(key, value)
    else next.delete(key)
    const suffix = next.size ? `?${next.toString()}` : ""
    router.replace(`${pathname}${suffix}#expenses`, { scroll: false })
  }, [pathname, router, searchParams])

  useEffect(() => {
    if (query === initial.query) return
    const timeout = window.setTimeout(() => update("q", query), 250)
    return () => window.clearTimeout(timeout)
  }, [initial.query, query, update])

  return (
    <form aria-label="Filter expenses" onSubmit={(event) => event.preventDefault()}>
      <FieldGroup className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(2,1fr)]">
        <Field>
          <FieldLabel htmlFor="expense-search" className="sr-only">Search expenses</FieldLabel>
          <InputGroup>
            <InputGroupInput
              id="expense-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search expenses"
              autoComplete="off"
            />
            <InputGroupAddon><Search /></InputGroupAddon>
          </InputGroup>
        </Field>
        <Field>
          <FieldLabel htmlFor="expense-payer-filter" className="sr-only">Filter by payer</FieldLabel>
          <NativeSelect
            id="expense-payer-filter"
            value={initial.payer}
            onChange={(event) => update("payer", event.target.value)}
          >
            <NativeSelectOption value="">All payers</NativeSelectOption>
            {members.map((member) => <NativeSelectOption key={member.id} value={member.id}>{member.name}</NativeSelectOption>)}
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor="expense-beneficiary-filter" className="sr-only">Filter by participant</FieldLabel>
          <NativeSelect
            id="expense-beneficiary-filter"
            value={initial.beneficiary}
            onChange={(event) => update("beneficiary", event.target.value)}
          >
            <NativeSelectOption value="">All participants</NativeSelectOption>
            {members.map((member) => <NativeSelectOption key={member.id} value={member.id}>{member.name}</NativeSelectOption>)}
          </NativeSelect>
        </Field>
      </FieldGroup>
    </form>
  )
}
