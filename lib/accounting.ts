import Decimal from "decimal.js"

import { allocateWeighted, currencyDigits, fromMinor, money, toMinor } from "@/lib/money"
import type {
  ExpenseInput,
  MemberBalance,
  RoomLedger,
  SettlementSuggestion,
  SplitEntryInput,
} from "@/lib/types"

export function normalizeExpenseSplits(input: ExpenseInput) {
  const amount = money(input.amount)
  if (!amount.isPositive()) throw new Error("Amount must be greater than zero.")
  if (input.splits.length === 0) throw new Error("Choose at least one participant.")

  const unique = new Map<string, SplitEntryInput>()
  for (const split of input.splits) unique.set(split.memberId, split)
  const splits = [...unique.values()]

  if (input.splitMode === "equal") {
    return allocateWeighted(
      amount,
      input.currency,
      splits.map((split) => ({ memberId: split.memberId, weight: 1 })),
    )
  }

  if (input.splitMode === "exact") {
    const exact = splits.map((split) => ({
      memberId: split.memberId,
      amount: money(split.value || 0).toFixed(currencyDigits(input.currency)),
    }))
    const sum = exact.reduce((total, split) => total.plus(split.amount), money(0))
    if (!sum.eq(amount)) throw new Error("Exact split amounts must equal the expense total.")
    if (exact.some((split) => money(split.amount).isNegative())) {
      throw new Error("Exact split amounts cannot be negative.")
    }
    return exact
  }

  const weighted = splits.map((split) => ({
    memberId: split.memberId,
    weight: split.value || 0,
  }))
  if (input.splitMode === "percentage") {
    const total = weighted.reduce((sum, split) => sum.plus(split.weight), money(0))
    if (!total.eq(100)) throw new Error("Percentages must total 100%.")
  }
  return allocateWeighted(amount, input.currency, weighted)
}

export function computeBalances(ledger: RoomLedger): MemberBalance[] {
  const rows = new Map(
    ledger.members.map((member) => [
      member.id,
      {
        member,
        paid: money(0),
        owed: money(0),
        sent: money(0),
        received: money(0),
      },
    ]),
  )

  for (const expense of ledger.expenses) {
    const payer = rows.get(expense.paidByMemberId)
    if (payer) payer.paid = payer.paid.plus(expense.baseAmount)
    for (const split of expense.splits) {
      const member = rows.get(split.memberId)
      if (member) member.owed = member.owed.plus(split.baseAmount)
    }
  }

  for (const transfer of ledger.transfers) {
    const sender = rows.get(transfer.fromMemberId)
    const receiver = rows.get(transfer.toMemberId)
    if (sender) sender.sent = sender.sent.plus(transfer.baseAmount)
    if (receiver) receiver.received = receiver.received.plus(transfer.baseAmount)
  }

  const digits = currencyDigits(ledger.room.baseCurrency)
  return [...rows.values()].map((row) => ({
    member: row.member,
    paid: row.paid.toFixed(digits),
    owed: row.owed.toFixed(digits),
    sent: row.sent.toFixed(digits),
    received: row.received.toFixed(digits),
    net: row.paid.minus(row.owed).plus(row.sent).minus(row.received).toFixed(digits),
  }))
}

type WorkingBalance = { memberId: string; amount: bigint }
type WorkingTransfer = { fromMemberId: string; toMemberId: string; amount: bigint }

function absolute(value: bigint) {
  return value < 0n ? -value : value
}

function exactSettlements(initial: WorkingBalance[]) {
  let best: WorkingTransfer[] | null = null
  const balances = initial.map((entry) => ({ ...entry }))
  const memo = new Map<string, number>()

  function search(current: WorkingTransfer[]) {
    if (best && current.length >= best.length) return
    const state = balances.map((entry) => entry.amount.toString()).join(",")
    const seenAt = memo.get(state)
    if (seenAt !== undefined && seenAt <= current.length) return
    memo.set(state, current.length)
    const first = balances.findIndex((entry) => entry.amount !== 0n)
    if (first === -1) {
      best = current.map((entry) => ({ ...entry }))
      return
    }

    const seen = new Set<string>()
    for (let index = first + 1; index < balances.length; index += 1) {
      const left = balances[first]
      const right = balances[index]
      if ((left.amount < 0n) === (right.amount < 0n) || right.amount === 0n) continue
      const key = right.amount.toString()
      if (seen.has(key)) continue
      seen.add(key)

      const amount = absolute(left.amount) < absolute(right.amount)
        ? absolute(left.amount)
        : absolute(right.amount)
      const transfer = left.amount < 0n
        ? { fromMemberId: left.memberId, toMemberId: right.memberId, amount }
        : { fromMemberId: right.memberId, toMemberId: left.memberId, amount }

      const leftWasDebtor = left.amount < 0n
      if (leftWasDebtor) {
        left.amount += amount
        right.amount -= amount
      } else {
        left.amount -= amount
        right.amount += amount
      }
      current.push(transfer)
      search(current)
      current.pop()
      if (leftWasDebtor) {
        left.amount -= amount
        right.amount += amount
      } else {
        left.amount += amount
        right.amount -= amount
      }

      if (absolute(left.amount) === amount && absolute(right.amount) === amount) break
    }
  }

  search([])
  return best || []
}

function greedySettlements(initial: WorkingBalance[]) {
  const debtors = initial
    .filter((entry) => entry.amount < 0n)
    .map((entry) => ({ ...entry, amount: -entry.amount }))
  const creditors = initial
    .filter((entry) => entry.amount > 0n)
    .map((entry) => ({ ...entry }))
  const result: WorkingTransfer[] = []

  while (debtors.length && creditors.length) {
    debtors.sort((a, b) => (a.amount > b.amount ? -1 : a.amount < b.amount ? 1 : a.memberId.localeCompare(b.memberId)))
    creditors.sort((a, b) => (a.amount > b.amount ? -1 : a.amount < b.amount ? 1 : a.memberId.localeCompare(b.memberId)))
    const debtor = debtors[0]
    const creditor = creditors[0]
    const amount = debtor.amount < creditor.amount ? debtor.amount : creditor.amount
    result.push({ fromMemberId: debtor.memberId, toMemberId: creditor.memberId, amount })
    debtor.amount -= amount
    creditor.amount -= amount
    if (debtor.amount === 0n) debtors.shift()
    if (creditor.amount === 0n) creditors.shift()
  }
  return result
}

export function computeSettlements(ledger: RoomLedger): {
  suggestions: SettlementSuggestion[]
  exact: boolean
} {
  const balances = computeBalances(ledger)
    .map((balance) => ({
      memberId: balance.member.id,
      amount: BigInt(toMinor(balance.net, ledger.room.baseCurrency).toFixed(0)),
    }))
    .filter((balance) => balance.amount !== 0n)

  const exact = balances.length <= 12
  const transfers = exact ? exactSettlements(balances) : greedySettlements(balances)
  return {
    exact,
    suggestions: transfers.map((transfer) => ({
      fromMemberId: transfer.fromMemberId,
      toMemberId: transfer.toMemberId,
      baseAmount: fromMinor(transfer.amount.toString(), ledger.room.baseCurrency),
    })),
  }
}

export function totalSpend(ledger: RoomLedger) {
  return ledger.expenses
    .reduce((sum, expense) => sum.plus(expense.baseAmount), new Decimal(0))
    .toFixed(currencyDigits(ledger.room.baseCurrency))
}
