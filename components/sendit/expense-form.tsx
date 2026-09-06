"use client"

import { startTransition, useId, useState } from "react"
import { useRouter } from "next/navigation"
import Decimal from "decimal.js"
import { Pencil, Plus } from "lucide-react"
import { toast } from "sonner"

import { attachReceiptAction, saveExpenseAction } from "@/app/actions/sendit"
import { CurrencySelect } from "@/components/sendit/currency-select"
import { MemberAvatar } from "@/components/sendit/member-avatar"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { MAX_RECEIPT_BYTES, RECEIPT_BUCKET, RECEIPT_TYPES } from "@/lib/constants"
import { createParticipantColorMap } from "@/lib/participant-colors"
import { createClient } from "@/lib/supabase/client"
import type { Expense, Member, Room, SplitMode } from "@/lib/types"

function today() {
  const date = new Date()
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}

async function compressReceipt(file: File) {
  if (!file.type.startsWith("image/") || file.type === "image/webp" || file.size < 2_000_000) return file
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement("canvas")
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const context = canvas.getContext("2d")
    if (!context) return file
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.82))
    return blob && blob.size < file.size
      ? new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" })
      : file
  } catch {
    return file
  }
}

export function ExpenseForm({ room, members, expense, compactTrigger = false }: {
  room: Room
  members: Member[]
  expense?: Expense
  compactTrigger?: boolean
}) {
  const router = useRouter()
  const uid = useId().replace(/:/g, "")
  const formId = `expense-form-${uid}`
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [currency, setCurrency] = useState(expense?.currency || room.baseCurrency)
  const [mode, setMode] = useState<SplitMode>(expense?.splitMode || "equal")
  const initialIds = expense?.splits.map((split) => split.memberId) || members.filter((member) => !member.isArchived && !member.mergedInto).map((member) => member.id)
  const [selected, setSelected] = useState<string[]>(initialIds)
  const [values, setValues] = useState<Record<string, string>>(() => {
    if (!expense || expense.splitMode === "equal") return {}
    if (expense.splitMode === "percentage") {
      let assigned = new Decimal(0)
      return Object.fromEntries(expense.splits.map((split, index) => {
        const value = index === expense.splits.length - 1
          ? new Decimal(100).minus(assigned)
          : new Decimal(split.amount).div(expense.amount).mul(100).toDecimalPlaces(6)
        assigned = assigned.plus(value)
        return [split.memberId, value.toString()]
      }))
    }
    return Object.fromEntries(expense.splits.map((split) => [split.memberId, split.amount]))
  })
  const relevantIds = new Set([...(expense?.splits.map((split) => split.memberId) || []), expense?.paidByMemberId || ""])
  const formMembers = members.filter((member) => (!member.isArchived && !member.mergedInto) || relevantIds.has(member.id))
  const participantColors = createParticipantColorMap(members)

  function toggleMember(memberId: string, checked: boolean) {
    setSelected((current) => checked ? [...current, memberId] : current.filter((id) => id !== memberId))
  }

  async function uploadReceipt(roomId: string, expenseId: string, original: File) {
    const file = await compressReceipt(original)
    if (!RECEIPT_TYPES.includes(file.type as (typeof RECEIPT_TYPES)[number])) throw new Error("Use a JPEG, PNG, WebP, or PDF receipt.")
    if (file.size > MAX_RECEIPT_BYTES) throw new Error("Receipt must be 10 MB or smaller.")
    const displayName = file.name.slice(0, 240)
    const safeName = displayName.replace(/[^a-zA-Z0-9._-]+/g, "-")
    const path = `${roomId}/${expenseId}/${crypto.randomUUID()}-${safeName}`
    const supabase = createClient()
    const { error } = await supabase.storage.from(RECEIPT_BUCKET).upload(path, file, { contentType: file.type, upsert: false })
    if (error) throw error
    const attached = await attachReceiptAction({ roomId, expenseId, path, name: displayName, type: file.type, size: file.size })
    if (!attached.ok) {
      await supabase.storage.from(RECEIPT_BUCKET).remove([path])
      throw new Error(attached.error)
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant={expense ? "ghost" : "default"}
            size={expense ? "icon-sm" : "default"}
            aria-label={!expense && compactTrigger ? "Add expense" : undefined}
          />
        }
      >
        {expense ? (
          <><Pencil /><span className="sr-only">Edit {expense.title}</span></>
        ) : (
          <>
            <Plus data-icon="inline-start" />
            {compactTrigger ? <span className="hidden sm:inline">Add expense</span> : <span>Add expense</span>}
          </>
        )}
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader className="border-b">
          <SheetTitle>{expense ? "Edit expense" : "Add an expense"}</SheetTitle>
        </SheetHeader>
        <form id={formId} className="flex flex-col gap-6 px-4 pb-6" onSubmit={(event) => {
          event.preventDefault()
          if (selected.length === 0) {
            toast.error("Choose at least one participant.")
            return
          }
          const form = event.currentTarget
          const data = new FormData(form)
          const receipt = data.get("receipt") as File
          setPending(true)
          startTransition(async () => {
            const result = await saveExpenseAction({
              id: expense?.id,
              roomId: room.id,
              title: String(data.get("title") || ""),
              description: String(data.get("description") || ""),
              expenseDate: String(data.get("expenseDate") || ""),
              amount: String(data.get("amount") || ""),
              currency,
              paidByMemberId: String(data.get("paidByMemberId") || ""),
              splitMode: mode,
              splits: selected.map((memberId) => ({ memberId, value: mode === "equal" ? undefined : values[memberId] })),
            })
            if (!result.ok) {
              setPending(false)
              toast.error(result.error)
              return
            }
            try {
              if (receipt?.size) await uploadReceipt(room.id, result.data.id, receipt)
              toast.success(expense ? "Expense updated" : "Expense added")
              setOpen(false)
              router.refresh()
            } catch (error) {
              toast.error(error instanceof Error ? `Expense saved, but receipt failed: ${error.message}` : "Expense saved, but receipt failed.")
            } finally {
              setPending(false)
            }
          })
        }}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`expense-title-${uid}`}>Title</FieldLabel>
              <Input id={`expense-title-${uid}`} name="title" defaultValue={expense?.title} placeholder="Dinner by the harbor" required autoFocus />
            </Field>
            <Field>
              <FieldLabel htmlFor={`expense-description-${uid}`}>Description <span className="text-muted-foreground font-normal">optional</span></FieldLabel>
              <Textarea id={`expense-description-${uid}`} name="description" defaultValue={expense?.description || ""} placeholder="Anything the group should remember" />
            </Field>
            <FieldGroup className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor={`expense-date-${uid}`}>Date</FieldLabel>
                <Input id={`expense-date-${uid}`} name="expenseDate" type="date" defaultValue={expense?.expenseDate || today()} required />
              </Field>
              <Field>
                <FieldLabel htmlFor={`expense-payer-${uid}`}>Paid by</FieldLabel>
                <NativeSelect id={`expense-payer-${uid}`} name="paidByMemberId" defaultValue={expense?.paidByMemberId || formMembers[0]?.id} required>
                  {formMembers.map((member) => <NativeSelectOption value={member.id} key={member.id}>{member.name}</NativeSelectOption>)}
                </NativeSelect>
              </Field>
              <Field>
                <FieldLabel htmlFor={`expense-amount-${uid}`}>Amount</FieldLabel>
                <Input id={`expense-amount-${uid}`} name="amount" inputMode="decimal" placeholder="0.00" defaultValue={expense?.amount} required />
              </Field>
              <Field>
                <FieldLabel htmlFor={`expense-currency-${uid}`}>Currency</FieldLabel>
                <CurrencySelect
                  id={`expense-currency-${uid}`}
                  value={currency}
                  onValueChange={setCurrency}
                  pinnedCurrencies={room.displayCurrencies}
                />
              </Field>
            </FieldGroup>
          </FieldGroup>

          <FieldSet>
            <FieldLegend variant="label">Split method</FieldLegend>
            <ToggleGroup value={[mode]} onValueChange={(next) => next[0] && setMode(next[0] as SplitMode)} variant="outline" spacing={0} className="grid w-full grid-cols-4">
              <ToggleGroupItem value="equal">Equal</ToggleGroupItem>
              <ToggleGroupItem value="exact">Exact</ToggleGroupItem>
              <ToggleGroupItem value="percentage">Percent</ToggleGroupItem>
              <ToggleGroupItem value="shares">Shares</ToggleGroupItem>
            </ToggleGroup>
            <FieldDescription>
              {mode === "equal" && "The final cent is distributed deterministically."}
              {mode === "exact" && `Amounts must add up to the ${currency} total.`}
              {mode === "percentage" && "Percentages must total exactly 100%."}
              {mode === "shares" && "Use weights such as 1, 1, and 2 for a double portion."}
            </FieldDescription>
          </FieldSet>

          <FieldSet>
            <FieldLegend variant="label">Shared by</FieldLegend>
            <div className="divide-y rounded-lg border">
              {formMembers.map((member) => {
                const checked = selected.includes(member.id)
                return (
                  <div key={member.id} className="flex min-h-13 items-center gap-3 px-3 py-2">
                    <Checkbox id={`split-${uid}-${member.id}`} checked={checked} onCheckedChange={(next) => toggleMember(member.id, next === true)} />
                    <FieldLabel htmlFor={`split-${uid}-${member.id}`} className="flex min-w-0 flex-1 items-center gap-2">
                      <MemberAvatar
                        name={member.name}
                        size="sm"
                        color={participantColors.get(member.id)}
                      />
                      <span className="truncate">{member.name}</span>
                    </FieldLabel>
                    {checked && mode !== "equal" && (
                      <InputGroup className="w-28">
                        <InputGroupInput
                          aria-label={`${member.name} ${mode}`}
                          inputMode="decimal"
                          value={values[member.id] || ""}
                          onChange={(event) => setValues((current) => ({ ...current, [member.id]: event.target.value }))}
                          placeholder="0"
                          required
                        />
                        <InputGroupAddon align="inline-end">{mode === "percentage" ? "%" : mode === "shares" ? "×" : currency}</InputGroupAddon>
                      </InputGroup>
                    )}
                  </div>
                )
              })}
            </div>
          </FieldSet>

          <Field>
            <FieldLabel htmlFor={`receipt-${uid}`}>Receipt <span className="text-muted-foreground font-normal">optional</span></FieldLabel>
            <Input id={`receipt-${uid}`} name="receipt" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" />
            <FieldDescription>Images or PDF · 10 MB max</FieldDescription>
          </Field>
        </form>
        <SheetFooter className="border-t">
          <Button type="submit" form={formId} size="lg" disabled={pending}>
            {pending && <Spinner data-icon="inline-start" />}
            {expense ? "Save changes" : "Add expense"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
