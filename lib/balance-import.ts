import { currencyDigits, fromMinor, money, toMinor } from "@/lib/money"

export type BalanceImportEntry = {
  memberId: string
  cost: string
  net: string
}

export type BalanceImportExpense = {
  paidByMemberId: string
  amount: string
  splits: Array<{ memberId: string; amount: string }>
}

export type BalanceImportPlan = {
  entries: Array<BalanceImportEntry & { paid: string }>
  expenses: BalanceImportExpense[]
  total: string
}

function minorAmount(value: string, currency: string) {
  const amount = money(value)
  if (!amount.isFinite() || amount.isNegative()) {
    throw new Error("Cost amounts must be zero or greater.")
  }

  const digits = currencyDigits(currency)
  if (amount.decimalPlaces() > digits) {
    throw new Error(`Use no more than ${digits} decimal places for ${currency}.`)
  }
  const rounded = toMinor(amount, currency)
  return BigInt(rounded.toFixed(0))
}

function signedMinorAmount(value: string, currency: string) {
  const amount = money(value)
  if (!amount.isFinite()) throw new Error("Enter a valid net balance.")

  const digits = currencyDigits(currency)
  if (amount.decimalPlaces() > digits) {
    throw new Error(`Use no more than ${digits} decimal places for ${currency}.`)
  }
  return BigInt(toMinor(amount, currency).toFixed(0))
}

export function buildBalanceImportPlan(
  input: BalanceImportEntry[],
  currency: string,
): BalanceImportPlan {
  const seenMemberIds = new Set<string>()
  const rows = input.map((entry) => {
    if (seenMemberIds.has(entry.memberId)) {
      throw new Error("Each participant can only appear once.")
    }
    seenMemberIds.add(entry.memberId)

    return {
      memberId: entry.memberId,
      costMinor: minorAmount(entry.cost || "0", currency),
      netMinor: signedMinorAmount(entry.net || "0", currency),
    }
  }).map((entry) => ({
    ...entry,
    paidMinor: entry.costMinor + entry.netMinor,
  })).filter((entry) => entry.costMinor !== 0n || entry.netMinor !== 0n)

  if (rows.length === 0) throw new Error("Enter at least one cost or net balance.")
  if (rows.some((entry) => entry.paidMinor < 0n)) {
    throw new Error("A participant's Cost + Net cannot produce a negative Paid amount.")
  }

  const totalPaid = rows.reduce((total, entry) => total + entry.paidMinor, 0n)
  const totalCost = rows.reduce((total, entry) => total + entry.costMinor, 0n)
  if (totalPaid !== totalCost) {
    throw new Error("The net balances must add up to zero before importing.")
  }
  if (totalPaid <= 0n) throw new Error("The imported total must be greater than zero.")

  const remainingCosts = rows.map((entry) => ({
    memberId: entry.memberId,
    amount: entry.costMinor,
  }))
  const expenses: BalanceImportExpense[] = []

  for (const payer of rows) {
    let remainingPaid = payer.paidMinor
    const splits: BalanceImportExpense["splits"] = []

    for (const beneficiary of remainingCosts) {
      if (remainingPaid === 0n) break
      if (beneficiary.amount === 0n) continue

      const allocated = remainingPaid < beneficiary.amount
        ? remainingPaid
        : beneficiary.amount
      splits.push({
        memberId: beneficiary.memberId,
        amount: fromMinor(allocated, currency),
      })
      remainingPaid -= allocated
      beneficiary.amount -= allocated
    }

    if (remainingPaid !== 0n) {
      throw new Error("The import could not be allocated. Check the Cost and Net values.")
    }
    if (payer.paidMinor > 0n) {
      expenses.push({
        paidByMemberId: payer.memberId,
        amount: fromMinor(payer.paidMinor, currency),
        splits,
      })
    }
  }

  if (remainingCosts.some((entry) => entry.amount !== 0n)) {
    throw new Error("The import could not be allocated. Check the Cost and Net values.")
  }

  return {
    entries: rows.map((entry) => ({
      memberId: entry.memberId,
      paid: fromMinor(entry.paidMinor, currency),
      cost: fromMinor(entry.costMinor, currency),
      net: fromMinor(entry.netMinor, currency),
    })),
    expenses,
    total: fromMinor(totalPaid, currency),
  }
}
