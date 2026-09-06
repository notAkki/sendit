"use client"

import { startTransition, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Copy, Link2, MoreHorizontal, RotateCw, Settings, SlidersHorizontal, UserPlus, Users, WalletCards } from "lucide-react"
import { toast } from "sonner"

import {
  addMemberAction,
  renameMemberAction,
  rotateRoomCodeAction,
  setMemberArchivedAction,
  updateMyProfileAction,
  updateRoomSettingsAction,
} from "@/app/actions/sendit"
import { CurrencySelect } from "@/components/sendit/currency-select"
import { MemberAvatar } from "@/components/sendit/member-avatar"
import { PinnedCurrencyEditor } from "@/components/sendit/pinned-currency-editor"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { createParticipantColorMap } from "@/lib/participant-colors"
import type { RoomLedger } from "@/lib/types"

export function RoomManager({ ledger }: { ledger: RoomLedger }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [copied, setCopied] = useState(false)
  const [addingParticipant, setAddingParticipant] = useState(false)
  const [managedMemberId, setManagedMemberId] = useState<string | null>(null)
  const isCreator = ledger.currentMemberId === ledger.room.creatorMemberId
  const activeMembers = ledger.members.filter((member) => !member.mergedInto)
  const participantColors = createParticipantColorMap(ledger.members)
  const currentMember = activeMembers.find((member) => member.id === ledger.currentMemberId)
  const managedMember = activeMembers.find((member) => member.id === managedMemberId)
  const hasRecords = ledger.expenses.length > 0 || ledger.transfers.length > 0

  function run(
    action: () => Promise<{ ok: boolean; error?: string; data?: unknown }>,
    success: string,
    onSuccess?: () => void,
  ) {
    setPending(true)
    startTransition(async () => {
      const result = await action()
      setPending(false)
      if (!result.ok) {
        toast.error(result.error || "Something went wrong.")
        return
      }
      toast.success(success)
      onSuccess?.()
      router.refresh()
    })
  }

  async function copyInvite() {
    await navigator.clipboard.writeText(`${window.location.origin}/r/${ledger.room.code}`)
    setCopied(true)
    toast.success("Invite link copied")
    window.setTimeout(() => setCopied(false), 1400)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="outline" size="icon" />}>
        <Settings />
        <span className="sr-only">Settings</span>
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader className="border-b pr-12">
          <SheetTitle className="flex items-center gap-2">
            <Settings className="size-4" />
            Settings
          </SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-10 p-4">
          {currentMember && (
            <section>
              <div className="mb-3 flex items-center gap-2">
                <WalletCards className="size-4" />
                <p className="text-sm font-medium">Your profile</p>
              </div>
              <form onSubmit={(event) => {
                event.preventDefault()
                const data = new FormData(event.currentTarget)
                run(() => updateMyProfileAction({
                  roomId: ledger.room.id,
                  name: data.get("name"),
                  preferredCurrency: data.get("preferredCurrency"),
                  paymentInfo: data.get("paymentInfo"),
                }), "Your details were saved")
              }}>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="profile-name">Name</FieldLabel>
                    <Input
                      id="profile-name"
                      name="name"
                      defaultValue={currentMember.name}
                      maxLength={60}
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="profile-currency">Preferred currency</FieldLabel>
                    <CurrencySelect
                      id="profile-currency"
                      name="preferredCurrency"
                      defaultValue={currentMember.preferredCurrency}
                      pinnedCurrencies={ledger.room.displayCurrencies}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="profile-payment">Payment information <span className="text-muted-foreground font-normal">optional</span></FieldLabel>
                    <Textarea
                      id="profile-payment"
                      name="paymentInfo"
                      defaultValue={currentMember.paymentInfo || ""}
                      placeholder={"e-Transfer: alex@example.com\nZelle: +1 555 123 4567"}
                      maxLength={500}
                    />
                  </Field>
                  <Button type="submit" variant="outline" disabled={pending}>Save my details</Button>
                </FieldGroup>
              </form>
            </section>
          )}

          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Users className="size-4" />
                <p className="text-sm font-medium">Participants</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAddingParticipant((value) => !value)}
              >
                <UserPlus data-icon="inline-start" />
                {addingParticipant ? "Cancel" : "Add participant"}
              </Button>
            </div>
            {addingParticipant && (
              <form
                className="mb-4"
                onSubmit={(event) => {
                  event.preventDefault()
                  const form = event.currentTarget
                  const data = new FormData(form)
                  run(
                    () => addMemberAction({
                      roomId: ledger.room.id,
                      name: data.get("name"),
                      preferredCurrency: data.get("preferredCurrency"),
                    }),
                    "Participant added",
                    () => {
                      form.reset()
                      setAddingParticipant(false)
                    },
                  )
                }}
              >
                <FieldGroup className="gap-3">
                  <Field>
                    <FieldLabel htmlFor="new-participant-name">Name</FieldLabel>
                    <Input
                      id="new-participant-name"
                      name="name"
                      placeholder="Jamie"
                      maxLength={60}
                      autoComplete="off"
                      autoFocus
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="new-participant-currency">
                      Preferred currency
                    </FieldLabel>
                    <CurrencySelect
                      id="new-participant-currency"
                      name="preferredCurrency"
                      defaultValue={currentMember?.preferredCurrency || ledger.room.baseCurrency}
                      pinnedCurrencies={ledger.room.displayCurrencies}
                    />
                  </Field>
                  <Button type="submit" disabled={pending}>
                    <UserPlus data-icon="inline-start" />
                    Add participant
                  </Button>
                </FieldGroup>
              </form>
            )}
            <div className="divide-y">
              {activeMembers.map((member) => (
                <div key={member.id} className="flex min-h-14 items-center gap-3 py-2">
                  <MemberAvatar
                    name={member.name}
                    color={participantColors.get(member.id)}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{member.name}</p>
                    <p className="text-muted-foreground text-xs">{member.preferredCurrency}{member.isArchived ? " · archived" : ""}</p>
                    {member.paymentInfo && <p className="text-muted-foreground truncate text-xs">{member.paymentInfo.replace(/\s+/g, " ")}</p>}
                  </div>
                  {member.id === ledger.room.creatorMemberId && <Badge variant="secondary">Creator</Badge>}
                  {isCreator && member.id !== ledger.room.creatorMemberId && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setManagedMemberId(member.id)}
                    >
                      <MoreHorizontal />
                      <span className="sr-only">Manage {member.name}</span>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center gap-2">
              <Link2 className="size-4" />
              <p className="text-sm font-medium">Invite link</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={copyInvite}>
                {copied ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
                Copy link
              </Button>
              {isCreator && (
                <Button variant="outline" size="sm" onClick={() => run(async () => {
                  const result = await rotateRoomCodeAction(ledger.room.id)
                  if (result.ok) {
                    setOpen(false)
                    router.replace(`/r/${result.data.code}`)
                  }
                  return result
                }, "Invite link reset")} disabled={pending}>
                  <RotateCw data-icon="inline-start" /> Reset invite link
                </Button>
              )}
            </div>
          </section>

          {isCreator && (
            <section>
              <div className="mb-3 flex items-center gap-2">
                <SlidersHorizontal className="size-4" />
                <p className="text-sm font-medium">Trip settings</p>
              </div>
                <form onSubmit={(event) => {
                  event.preventDefault()
                  const data = new FormData(event.currentTarget)
                  run(() => updateRoomSettingsAction({
                    roomId: ledger.room.id,
                    name: data.get("name"),
                    baseCurrency: data.get("baseCurrency"),
                    displayCurrencies: String(data.get("displayCurrencies") || "").split(",").map((item) => item.trim().toUpperCase()).filter(Boolean),
                  }), "Trip settings saved")
                }}>
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="settings-name">Trip name</FieldLabel>
                      <Input id="settings-name" name="name" defaultValue={ledger.room.name} required />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="settings-base">Base currency</FieldLabel>
                      <CurrencySelect
                        id="settings-base"
                        name="baseCurrency"
                        defaultValue={ledger.room.baseCurrency}
                        disabled={hasRecords}
                        pinnedCurrencies={ledger.room.displayCurrencies}
                      />
                      {hasRecords && <input type="hidden" name="baseCurrency" value={ledger.room.baseCurrency} />}
                    </Field>
                    <Field>
                      <FieldLabel>Pinned currencies</FieldLabel>
                      <PinnedCurrencyEditor
                        name="displayCurrencies"
                        baseCurrency={ledger.room.baseCurrency}
                        defaultValue={ledger.room.displayCurrencies}
                      />
                    </Field>
                    <Button type="submit" variant="outline" disabled={pending}>Save settings</Button>
                  </FieldGroup>
                </form>
            </section>
          )}
        </div>

        <Dialog
          open={Boolean(managedMember)}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) setManagedMemberId(null)
          }}
        >
          {managedMember && (
            <DialogContent forceOverlay>
              <DialogHeader>
                <DialogTitle>Manage {managedMember.name}</DialogTitle>
                <DialogDescription>
                  Rename this participant or hide them from new expense forms.
                </DialogDescription>
              </DialogHeader>
              <form
                id={`rename-${managedMember.id}`}
                onSubmit={(event) => {
                  event.preventDefault()
                  const data = new FormData(event.currentTarget)
                  run(
                    () => renameMemberAction({
                      roomId: ledger.room.id,
                      memberId: managedMember.id,
                      name: data.get("name"),
                    }),
                    "Participant renamed",
                  )
                }}
              >
                <Input
                  name="name"
                  defaultValue={managedMember.name}
                  aria-label="Participant name"
                  required
                />
              </form>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>
                  Close
                </DialogClose>
                <DialogClose
                  render={<Button variant="outline" />}
                  onClick={() => run(
                    () => setMemberArchivedAction({
                      roomId: ledger.room.id,
                      memberId: managedMember.id,
                      archived: !managedMember.isArchived,
                    }),
                    managedMember.isArchived ? "Participant restored" : "Participant archived",
                  )}
                >
                  {managedMember.isArchived ? "Restore" : "Archive"}
                </DialogClose>
                <DialogClose
                  render={<Button type="submit" form={`rename-${managedMember.id}`} />}
                >
                  Rename
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          )}
        </Dialog>
      </SheetContent>
    </Sheet>
  )
}
