export type SplitMode = "equal" | "exact" | "percentage" | "shares"
export type FxSource = "frankfurter" | "manual" | "identity"

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> }

export type Member = {
  id: string
  roomId: string
  name: string
  preferredCurrency: string
  paymentInfo: string | null
  isArchived: boolean
  mergedInto: string | null
  createdAt: string
}

export type Room = {
  id: string
  code: string
  name: string
  baseCurrency: string
  displayCurrencies: string[]
  creatorMemberId: string
  createdAt: string
}

export type ExpenseSplit = {
  id: string
  expenseId: string
  memberId: string
  amount: string
  baseAmount: string
}

export type Expense = {
  id: string
  roomId: string
  title: string
  description: string | null
  expenseDate: string
  amount: string
  currency: string
  baseAmount: string
  paidByMemberId: string
  splitMode: SplitMode
  fxRate: string
  fxRequestedDate: string
  fxEffectiveDate: string
  fxSource: FxSource
  receiptPath: string | null
  receiptName: string | null
  receiptType: string | null
  receiptSize: number | null
  createdByMemberId: string
  updatedByMemberId: string
  createdAt: string
  updatedAt: string
  splits: ExpenseSplit[]
}

export type Transfer = {
  id: string
  roomId: string
  fromMemberId: string
  toMemberId: string
  transferDate: string
  amount: string
  currency: string
  baseAmount: string
  fxRate: string
  fxRequestedDate: string
  fxEffectiveDate: string
  fxSource: FxSource
  note: string | null
  createdByMemberId: string
  updatedByMemberId: string
  createdAt: string
  updatedAt: string
}

export type RoomLedger = {
  room: Room
  currentMemberId: string
  members: Member[]
  expenses: Expense[]
  transfers: Transfer[]
}

export type SplitEntryInput = {
  memberId: string
  value?: string
}

export type ExpenseInput = {
  id?: string
  roomId: string
  title: string
  description?: string
  expenseDate: string
  amount: string
  currency: string
  paidByMemberId: string
  splitMode: SplitMode
  splits: SplitEntryInput[]
}

export type TransferInput = {
  id?: string
  roomId: string
  fromMemberId: string
  toMemberId: string
  transferDate: string
  amount: string
  currency: string
  note?: string
}

export type FxSnapshot = {
  rate: string
  requestedDate: string
  effectiveDate: string
  source: FxSource
}

export type MemberBalance = {
  member: Member
  paid: string
  owed: string
  sent: string
  received: string
  net: string
}

export type SettlementSuggestion = {
  fromMemberId: string
  toMemberId: string
  baseAmount: string
}
