"use client"

import { startTransition, useId, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, HandCoins, Pencil } from "lucide-react"
import { toast } from "sonner"

import { saveTransferAction } from "@/app/actions/sendit"
import { CurrencySelect } from "@/components/sendit/currency-select"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import type { Member, Room, Transfer } from "@/lib/types"

function today() {
  const date = new Date()
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}

export function TransferForm({ room, members, transfer, fromMemberId, toMemberId, amount, currency, label = "Record payment" }: {
  room: Room
  members: Member[]
  transfer?: Transfer
  fromMemberId?: string
  toMemberId?: string
  amount?: string
  currency?: string
  label?: string
}) {
  const router = useRouter()
  const uid = useId().replace(/:/g, "")
  const formId = `transfer-form-${uid}`
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [selectedCurrency, setSelectedCurrency] = useState(transfer?.currency || currency || room.baseCurrency)
  const formMembers = members.filter((member) => !member.mergedInto && (!member.isArchived || member.id === transfer?.fromMemberId || member.id === transfer?.toMemberId))

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant={transfer ? "ghost" : "outline"} size={transfer ? "icon-sm" : "default"} />}>
        {transfer ? <><Pencil /><span className="sr-only">Edit payment</span></> : <><HandCoins data-icon="inline-start" />{label}</>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{transfer ? "Edit payment" : "Record a payment"}</DialogTitle>
          <DialogDescription>This adjusts balances but does not move any money.</DialogDescription>
        </DialogHeader>
        <form id={formId} onSubmit={(event) => {
          event.preventDefault()
          const data = new FormData(event.currentTarget)
          setPending(true)
          startTransition(async () => {
            const result = await saveTransferAction({
              id: transfer?.id,
              roomId: room.id,
              fromMemberId: String(data.get("fromMemberId") || ""),
              toMemberId: String(data.get("toMemberId") || ""),
              transferDate: String(data.get("transferDate") || ""),
              amount: String(data.get("amount") || ""),
              currency: selectedCurrency,
              note: String(data.get("note") || ""),
            })
            setPending(false)
            if (!result.ok) {
              toast.error(result.error)
              return
            }
            toast.success(transfer ? "Payment updated" : "Payment recorded")
            setOpen(false)
            router.refresh()
          })
        }}>
          <FieldGroup>
            <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
              <Field>
                <FieldLabel htmlFor={`from-${uid}`}>From</FieldLabel>
                <NativeSelect id={`from-${uid}`} name="fromMemberId" defaultValue={transfer?.fromMemberId || fromMemberId || formMembers[0]?.id} required>
                  {formMembers.map((member) => <NativeSelectOption key={member.id} value={member.id}>{member.name}</NativeSelectOption>)}
                </NativeSelect>
              </Field>
              <ArrowRight className="text-muted-foreground mb-2 size-4" />
              <Field>
                <FieldLabel htmlFor={`to-${uid}`}>To</FieldLabel>
                <NativeSelect id={`to-${uid}`} name="toMemberId" defaultValue={transfer?.toMemberId || toMemberId || formMembers[1]?.id} required>
                  {formMembers.map((member) => <NativeSelectOption key={member.id} value={member.id}>{member.name}</NativeSelectOption>)}
                </NativeSelect>
              </Field>
            </div>
            <div className="grid grid-cols-[1fr_8rem] gap-3">
              <Field>
                <FieldLabel htmlFor={`transfer-amount-${uid}`}>Amount</FieldLabel>
                <Input id={`transfer-amount-${uid}`} name="amount" inputMode="decimal" defaultValue={transfer?.amount || amount} placeholder="0.00" required />
              </Field>
              <Field>
                <FieldLabel htmlFor={`transfer-currency-${uid}`}>Currency</FieldLabel>
                <CurrencySelect
                  id={`transfer-currency-${uid}`}
                  value={selectedCurrency}
                  onValueChange={setSelectedCurrency}
                  pinnedCurrencies={room.displayCurrencies}
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor={`transfer-date-${uid}`}>Date paid</FieldLabel>
              <Input id={`transfer-date-${uid}`} name="transferDate" type="date" defaultValue={transfer?.transferDate || today()} required />
            </Field>
            <Field>
              <FieldLabel htmlFor={`transfer-note-${uid}`}>Note <span className="text-muted-foreground font-normal">optional</span></FieldLabel>
              <Textarea id={`transfer-note-${uid}`} name="note" defaultValue={transfer?.note || ""} placeholder="Bank transfer, cash, Venmo…" />
            </Field>
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button type="submit" form={formId} disabled={pending}>
            {pending && <Spinner data-icon="inline-start" />}
            {transfer ? "Save changes" : "Record payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
