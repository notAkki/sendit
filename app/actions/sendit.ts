"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { normalizeExpenseSplits } from "@/lib/accounting"
import {
  MAX_RECEIPT_BYTES,
  RECEIPT_BUCKET,
  RECEIPT_TYPES,
  ROOM_CODE_PATTERN,
  normalizeRoomCode,
} from "@/lib/constants"
import { getFxSnapshot } from "@/lib/fx"
import { convertAndAllocate, currencyDigits, money } from "@/lib/money"
import { createClient } from "@/lib/supabase/server"
import type { ActionResult, ExpenseInput, TransferInput } from "@/lib/types"

const currencySchema = z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/)
const uuidSchema = z.string().uuid()
const dateSchema = z.string().date()
const decimalSchema = z.string().trim().refine((value) => {
  try {
    return money(value).isFinite() && !money(value).isNegative()
  } catch {
    return false
  }
}, "Enter a valid amount.")
const positiveDecimalSchema = decimalSchema.refine((value) => money(value).isPositive(), "Enter a positive amount.")

const roomSchema = z.object({
  name: z.string().trim().min(1).max(80),
  creatorName: z.string().trim().min(1).max(60),
  baseCurrency: currencySchema,
  preferredCurrency: currencySchema.optional(),
})

const joinSchema = z.object({
  code: z.string().transform(normalizeRoomCode).pipe(z.string().regex(ROOM_CODE_PATTERN)),
  name: z.string().trim().max(60).default(""),
  memberId: z.string().uuid().optional(),
})

const expenseSchema = z.object({
  id: uuidSchema.optional(),
  roomId: uuidSchema,
  title: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional(),
  expenseDate: dateSchema,
  amount: positiveDecimalSchema,
  currency: currencySchema,
  paidByMemberId: uuidSchema,
  splitMode: z.enum(["equal", "exact", "percentage", "shares"]),
  splits: z.array(z.object({ memberId: uuidSchema, value: decimalSchema.optional() })).min(1),
})

const transferSchema = z.object({
  id: uuidSchema.optional(),
  roomId: uuidSchema,
  fromMemberId: uuidSchema,
  toMemberId: uuidSchema,
  transferDate: dateSchema,
  amount: positiveDecimalSchema,
  currency: currencySchema,
  note: z.string().trim().max(240).optional(),
})

function failure(error: unknown): ActionResult<never> {
  if (error instanceof z.ZodError) {
    return { ok: false, error: "Check the highlighted information.", fieldErrors: error.flatten().fieldErrors }
  }
  if (error instanceof Error) return { ok: false, error: error.message }
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return { ok: false, error: error.message }
  }
  return { ok: false, error: "Something went wrong. Please try again." }
}

async function ensureUser() {
  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  if (!claims?.claims?.sub) {
    const { error } = await supabase.auth.signInAnonymously()
    if (error) throw new Error("Anonymous sign-in is not enabled in Supabase.")
  }
  return supabase
}

async function getRoom(supabase: Awaited<ReturnType<typeof createClient>>, roomId: string) {
  const { data, error } = await supabase.from("rooms").select("*").eq("id", roomId).single()
  if (error || !data) throw new Error("You do not have access to this room.")
  return data
}

function revalidateRoom(code: string) {
  revalidatePath(`/r/${code}`)
  revalidatePath(`/r/${code}/expenses`)
}

export async function createRoomAction(input: unknown): Promise<ActionResult<{ code: string }>> {
  try {
    const values = roomSchema.parse(input)
    const supabase = await ensureUser()
    const { data, error } = await supabase.rpc("create_room", {
      p_name: values.name,
      p_base_currency: values.baseCurrency,
      p_creator_name: values.creatorName,
      p_preferred_currency: values.preferredCurrency || values.baseCurrency,
    })
    if (error) throw error
    return { ok: true, data: { code: String((data as { code: string }).code) } }
  } catch (error) {
    return failure(error)
  }
}

export async function joinRoomAction(input: unknown): Promise<ActionResult<{ code: string }>> {
  try {
    const values = joinSchema.parse(input)
    if (!values.memberId && !values.name) throw new Error("Enter your name or choose a participant.")
    const supabase = await ensureUser()
    const { data, error } = await supabase.rpc("join_room", {
      p_code: values.code,
      p_name: values.name,
      p_member_id: values.memberId || null,
    })
    if (error) throw error
    return { ok: true, data: { code: String((data as { code: string }).code) } }
  } catch (error) {
    return failure(error)
  }
}

export async function addMemberAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const values = z.object({
      roomId: uuidSchema,
      name: z.string().trim().min(1).max(60),
      preferredCurrency: currencySchema,
    }).parse(input)
    const supabase = await createClient()
    const room = await getRoom(supabase, values.roomId)
    const { data, error } = await supabase.rpc("add_room_member", {
      p_room_id: values.roomId,
      p_name: values.name,
      p_preferred_currency: values.preferredCurrency,
    })
    if (error) throw error
    revalidateRoom(room.code)
    return { ok: true, data: { id: String(data) } }
  } catch (error) {
    return failure(error)
  }
}

export async function updateMyProfileAction(input: unknown): Promise<ActionResult> {
  try {
    const values = z.object({
      roomId: uuidSchema,
      name: z.string().trim().min(1).max(60),
      preferredCurrency: currencySchema,
      paymentInfo: z.string().trim().max(500),
    }).parse(input)
    const supabase = await createClient()
    const room = await getRoom(supabase, values.roomId)
    const { error } = await supabase.rpc("update_my_member_profile", {
      p_room_id: values.roomId,
      p_name: values.name,
      p_preferred_currency: values.preferredCurrency,
      p_payment_info: values.paymentInfo,
    })
    if (error) throw error
    revalidateRoom(room.code)
    return { ok: true, data: undefined }
  } catch (error) {
    return failure(error)
  }
}

export async function saveExpenseAction(input: ExpenseInput): Promise<ActionResult<{ id: string }>> {
  try {
    const values = expenseSchema.parse(input)
    const supabase = await createClient()
    const room = await getRoom(supabase, values.roomId)
    const allocations = normalizeExpenseSplits(values)
    const fx = await getFxSnapshot({
      from: values.currency,
      to: room.base_currency,
      date: values.expenseDate,
    })
    const baseAmount = money(values.amount)
      .mul(fx.rate)
      .toFixed(currencyDigits(room.base_currency))
    const baseAllocations = convertAndAllocate(allocations, baseAmount, room.base_currency)
    const baseByMember = new Map(baseAllocations.map((item) => [item.memberId, item.amount]))
    const splits = allocations.map((item) => ({
      memberId: item.memberId,
      amount: item.amount,
      baseAmount: baseByMember.get(item.memberId)!,
    }))
    const { data, error } = await supabase.rpc("save_expense", {
      p_id: values.id || null,
      p_room_id: values.roomId,
      p_title: values.title,
      p_description: values.description || "",
      p_expense_date: values.expenseDate,
      p_amount: money(values.amount).toString(),
      p_currency: values.currency,
      p_base_amount: baseAmount,
      p_paid_by_member_id: values.paidByMemberId,
      p_split_mode: values.splitMode,
      p_fx_rate: fx.rate,
      p_fx_requested_date: fx.requestedDate,
      p_fx_effective_date: fx.effectiveDate,
      p_fx_source: fx.source,
      p_splits: splits,
    })
    if (error) throw error
    revalidateRoom(room.code)
    return { ok: true, data: { id: String(data) } }
  } catch (error) {
    return failure(error)
  }
}

export async function attachReceiptAction(input: unknown): Promise<ActionResult> {
  try {
    const values = z.object({
      roomId: uuidSchema,
      expenseId: uuidSchema,
      path: z.string().min(1).max(500),
      name: z.string().min(1).max(240),
      type: z.enum(RECEIPT_TYPES),
      size: z.number().int().positive().max(MAX_RECEIPT_BYTES),
    }).parse(input)
    if (!values.path.startsWith(`${values.roomId}/${values.expenseId}/`)) {
      throw new Error("Invalid receipt path.")
    }
    const supabase = await createClient()
    const room = await getRoom(supabase, values.roomId)
    const { data: oldPath, error } = await supabase.rpc("attach_expense_receipt", {
      p_room_id: values.roomId,
      p_expense_id: values.expenseId,
      p_path: values.path,
      p_name: values.name,
      p_type: values.type,
      p_size: values.size,
    })
    if (error) throw error
    if (oldPath && oldPath !== values.path) await supabase.storage.from(RECEIPT_BUCKET).remove([String(oldPath)])
    revalidateRoom(room.code)
    return { ok: true, data: undefined }
  } catch (error) {
    return failure(error)
  }
}

export async function deleteExpenseAction(input: unknown): Promise<ActionResult> {
  try {
    const values = z.object({ roomId: uuidSchema, expenseId: uuidSchema }).parse(input)
    const supabase = await createClient()
    const room = await getRoom(supabase, values.roomId)
    const { data: receiptPath, error } = await supabase.rpc("delete_expense", {
      p_room_id: values.roomId,
      p_expense_id: values.expenseId,
    })
    if (error) throw error
    if (receiptPath) await supabase.storage.from(RECEIPT_BUCKET).remove([String(receiptPath)])
    revalidateRoom(room.code)
    return { ok: true, data: undefined }
  } catch (error) {
    return failure(error)
  }
}

export async function saveTransferAction(input: TransferInput): Promise<ActionResult<{ id: string }>> {
  try {
    const values = transferSchema.parse(input)
    if (values.fromMemberId === values.toMemberId) throw new Error("Choose two different people.")
    const supabase = await createClient()
    const room = await getRoom(supabase, values.roomId)
    const fx = await getFxSnapshot({
      from: values.currency,
      to: room.base_currency,
      date: values.transferDate,
    })
    const baseAmount = money(values.amount).mul(fx.rate).toFixed(currencyDigits(room.base_currency))
    const { data, error } = await supabase.rpc("save_transfer", {
      p_id: values.id || null,
      p_room_id: values.roomId,
      p_from_member_id: values.fromMemberId,
      p_to_member_id: values.toMemberId,
      p_transfer_date: values.transferDate,
      p_amount: money(values.amount).toString(),
      p_currency: values.currency,
      p_base_amount: baseAmount,
      p_fx_rate: fx.rate,
      p_fx_requested_date: fx.requestedDate,
      p_fx_effective_date: fx.effectiveDate,
      p_fx_source: fx.source,
      p_note: values.note || "",
    })
    if (error) throw error
    revalidateRoom(room.code)
    return { ok: true, data: { id: String(data) } }
  } catch (error) {
    return failure(error)
  }
}

export async function deleteTransferAction(input: unknown): Promise<ActionResult> {
  try {
    const values = z.object({ roomId: uuidSchema, transferId: uuidSchema }).parse(input)
    const supabase = await createClient()
    const room = await getRoom(supabase, values.roomId)
    const { error } = await supabase.rpc("delete_transfer", {
      p_room_id: values.roomId,
      p_transfer_id: values.transferId,
    })
    if (error) throw error
    revalidateRoom(room.code)
    return { ok: true, data: undefined }
  } catch (error) {
    return failure(error)
  }
}

export async function rotateRoomCodeAction(roomId: string): Promise<ActionResult<{ code: string }>> {
  try {
    uuidSchema.parse(roomId)
    const supabase = await createClient()
    await getRoom(supabase, roomId)
    const { data, error } = await supabase.rpc("rotate_room_code", { p_room_id: roomId })
    if (error) throw error
    return { ok: true, data: { code: String(data) } }
  } catch (error) {
    return failure(error)
  }
}

export async function updateRoomSettingsAction(input: unknown): Promise<ActionResult> {
  try {
    const values = z.object({
      roomId: uuidSchema,
      name: z.string().trim().min(1).max(80),
      baseCurrency: currencySchema,
      displayCurrencies: z.array(currencySchema).max(8),
    }).parse(input)
    const supabase = await createClient()
    const room = await getRoom(supabase, values.roomId)
    const { error } = await supabase.rpc("update_room_settings", {
      p_room_id: values.roomId,
      p_name: values.name,
      p_base_currency: values.baseCurrency,
      p_display_currencies: values.displayCurrencies,
    })
    if (error) throw error
    revalidateRoom(room.code)
    return { ok: true, data: undefined }
  } catch (error) {
    return failure(error)
  }
}

export async function renameMemberAction(input: unknown): Promise<ActionResult> {
  try {
    const values = z.object({ roomId: uuidSchema, memberId: uuidSchema, name: z.string().trim().min(1).max(60) }).parse(input)
    const supabase = await createClient()
    const room = await getRoom(supabase, values.roomId)
    const { error } = await supabase.rpc("rename_room_member", {
      p_room_id: values.roomId,
      p_member_id: values.memberId,
      p_name: values.name,
    })
    if (error) throw error
    revalidateRoom(room.code)
    return { ok: true, data: undefined }
  } catch (error) {
    return failure(error)
  }
}

export async function setMemberArchivedAction(input: unknown): Promise<ActionResult> {
  try {
    const values = z.object({ roomId: uuidSchema, memberId: uuidSchema, archived: z.boolean() }).parse(input)
    const supabase = await createClient()
    const room = await getRoom(supabase, values.roomId)
    const { error } = await supabase.rpc("set_member_archived", {
      p_room_id: values.roomId,
      p_member_id: values.memberId,
      p_archived: values.archived,
    })
    if (error) throw error
    revalidateRoom(room.code)
    return { ok: true, data: undefined }
  } catch (error) {
    return failure(error)
  }
}
