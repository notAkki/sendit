import "server-only"

import { cache } from "react"

import { normalizeRoomCode } from "@/lib/constants"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { createClient } from "@/lib/supabase/server"
import type { Expense, Member, Room, RoomLedger, Transfer } from "@/lib/types"

type JoinPreview = {
  roomId: string
  name: string
  baseCurrency: string
  members: Array<{ id: string; name: string; preferredCurrency: string }>
}

export type JoinedRoomSummary = {
  room: Room
  member: Member
  joinedAt: string
  participantIndex: number
}

export type RoomAccess =
  | { state: "unconfigured" }
  | { state: "missing" }
  | { state: "join"; code: string; preview: JoinPreview }
  | { state: "joined"; ledger: RoomLedger }

function mapRoom(row: Record<string, unknown>): Room {
  return {
    id: String(row.id),
    code: String(row.code),
    name: String(row.name),
    baseCurrency: String(row.base_currency),
    displayCurrencies: (row.display_currencies as string[]) || [],
    creatorMemberId: String(row.creator_member_id),
    createdAt: String(row.created_at),
  }
}

function mapMember(row: Record<string, unknown>): Member {
  return {
    id: String(row.id),
    roomId: String(row.room_id),
    name: String(row.name),
    preferredCurrency: String(row.preferred_currency),
    paymentInfo: row.payment_info ? String(row.payment_info) : null,
    isArchived: Boolean(row.is_archived),
    mergedInto: row.merged_into ? String(row.merged_into) : null,
    createdAt: String(row.created_at),
  }
}

function mapExpense(row: Record<string, unknown>): Expense {
  const splits = (row.expense_splits as Array<Record<string, unknown>>) || []
  return {
    id: String(row.id),
    roomId: String(row.room_id),
    title: String(row.title),
    description: row.description ? String(row.description) : null,
    expenseDate: String(row.expense_date),
    amount: String(row.amount),
    currency: String(row.currency),
    baseAmount: String(row.base_amount),
    paidByMemberId: String(row.paid_by_member_id),
    splitMode: row.split_mode as Expense["splitMode"],
    fxRate: String(row.fx_rate),
    fxRequestedDate: String(row.fx_requested_date),
    fxEffectiveDate: String(row.fx_effective_date),
    fxSource: row.fx_source as Expense["fxSource"],
    receiptPath: row.receipt_path ? String(row.receipt_path) : null,
    receiptName: row.receipt_name ? String(row.receipt_name) : null,
    receiptType: row.receipt_type ? String(row.receipt_type) : null,
    receiptSize: row.receipt_size ? Number(row.receipt_size) : null,
    createdByMemberId: String(row.created_by_member_id),
    updatedByMemberId: String(row.updated_by_member_id),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    splits: splits.map((split) => ({
      id: String(split.id),
      expenseId: String(split.expense_id),
      memberId: String(split.member_id),
      amount: String(split.amount),
      baseAmount: String(split.base_amount),
    })),
  }
}

function mapTransfer(row: Record<string, unknown>): Transfer {
  return {
    id: String(row.id),
    roomId: String(row.room_id),
    fromMemberId: String(row.from_member_id),
    toMemberId: String(row.to_member_id),
    transferDate: String(row.transfer_date),
    amount: String(row.amount),
    currency: String(row.currency),
    baseAmount: String(row.base_amount),
    fxRate: String(row.fx_rate),
    fxRequestedDate: String(row.fx_requested_date),
    fxEffectiveDate: String(row.fx_effective_date),
    fxSource: row.fx_source as Transfer["fxSource"],
    note: row.note ? String(row.note) : null,
    createdByMemberId: String(row.created_by_member_id),
    updatedByMemberId: String(row.updated_by_member_id),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

async function loadRoomAccess(codeInput: string): Promise<RoomAccess> {
  if (!isSupabaseConfigured()) return { state: "unconfigured" }
  const code = normalizeRoomCode(codeInput)
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub

  if (userId) {
    const { data: roomRow } = await supabase
      .from("rooms")
      .select("*")
      .eq("code", code)
      .maybeSingle()

    if (roomRow) {
      const room = mapRoom(roomRow)
      const [identityResult, membersResult, expensesResult, transfersResult] = await Promise.all([
        supabase
          .from("member_identities")
          .select("member_id")
          .eq("room_id", room.id)
          .eq("user_id", userId)
          .maybeSingle(),
        supabase.from("room_members").select("*").eq("room_id", room.id).order("created_at"),
        supabase
          .from("expenses")
          .select("*, expense_splits(*)")
          .eq("room_id", room.id)
          .order("expense_date", { ascending: false })
          .order("created_at", { ascending: false }),
        supabase
          .from("transfers")
          .select("*")
          .eq("room_id", room.id)
          .order("transfer_date", { ascending: false })
          .order("created_at", { ascending: false }),
      ])

      if (identityResult.data) {
        return {
          state: "joined",
          ledger: {
            room,
            currentMemberId: String(identityResult.data.member_id),
            members: (membersResult.data || []).map(mapMember),
            expenses: (expensesResult.data || []).map(mapExpense),
            transfers: (transfersResult.data || []).map(mapTransfer),
          },
        }
      }
    }
  }

  const { data: preview, error } = await supabase.rpc("get_room_join_preview", { p_code: code })
  if (error || !preview) return { state: "missing" }
  return { state: "join", code, preview: preview as JoinPreview }
}

export const getRoomAccess = cache(loadRoomAccess)

export async function getJoinedLedger(code: string) {
  const access = await getRoomAccess(code)
  return access.state === "joined" ? access.ledger : null
}

async function loadMyRooms(): Promise<JoinedRoomSummary[]> {
  if (!isSupabaseConfigured()) return []

  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) return []

  const { data: identities, error: identitiesError } = await supabase
    .from("member_identities")
    .select("room_id, member_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (identitiesError || !identities?.length) return []

  const roomIds = identities.map((identity) => String(identity.room_id))
  const [roomsResult, membersResult] = await Promise.all([
    supabase.from("rooms").select("*").in("id", roomIds),
    supabase
      .from("room_members")
      .select("*")
      .in("room_id", roomIds)
      .order("created_at"),
  ])

  if (roomsResult.error || membersResult.error) return []

  const roomsById = new Map(
    (roomsResult.data || []).map((row) => {
      const room = mapRoom(row)
      return [room.id, room]
    }),
  )
  const membersByRoom = new Map<string, Member[]>()

  for (const row of membersResult.data || []) {
    const member = mapMember(row)
    const roomMembers = membersByRoom.get(member.roomId) || []
    roomMembers.push(member)
    membersByRoom.set(member.roomId, roomMembers)
  }

  return identities.flatMap((identity) => {
    const roomId = String(identity.room_id)
    const memberId = String(identity.member_id)
    const room = roomsById.get(roomId)
    const roomMembers = membersByRoom.get(roomId) || []
    const member = roomMembers.find((candidate) => candidate.id === memberId)
    if (!room || !member) return []

    const participantIndex = roomMembers
      .filter((candidate) => !candidate.mergedInto)
      .findIndex((candidate) => candidate.id === memberId)

    return [{
      room,
      member,
      joinedAt: String(identity.created_at),
      participantIndex,
    }]
  })
}

export const getMyRooms = cache(loadMyRooms)
