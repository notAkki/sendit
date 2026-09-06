"use client"

import { startTransition, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Users } from "lucide-react"
import { toast } from "sonner"

import { joinRoomAction } from "@/app/actions/sendit"
import { Brand } from "@/components/sendit/brand"
import { MemberAvatar } from "@/components/sendit/member-avatar"
import { ThemeToggle } from "@/components/sendit/theme-toggle"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Spinner } from "@/components/ui/spinner"
import { createParticipantColorMap } from "@/lib/participant-colors"
import { cn } from "@/lib/utils"

type JoinPreview = {
  name: string
  baseCurrency: string
  members: Array<{ id: string; name: string; preferredCurrency: string }>
}

export function JoinRoom({ code, preview }: { code: string; preview: JoinPreview }) {
  const router = useRouter()
  const [choice, setChoice] = useState("new")
  const [pending, setPending] = useState(false)
  const participantColors = createParticipantColorMap(preview.members)

  return (
    <div className="min-h-screen">
      <header className="bg-background/92 sticky top-0 z-40 border-b backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Brand />
          <ThemeToggle variant="outline" />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="mx-auto grid min-h-[calc(100vh-8rem)] max-w-5xl items-center gap-12 px-2 py-8 sm:px-8 lg:grid-cols-[1fr_26rem] lg:px-9">
          <section>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              You’re joining {preview.name}
            </h1>
            <p className="text-muted-foreground mt-4 max-w-xl text-lg">
              Claim your name if your friends already added you, or make a new participant. One participant can be used on several devices.
            </p>
            <div className="mt-8 flex items-center gap-3">
              <div className="flex">
                {preview.members.slice(0, 5).map((member, index) => (
                  <MemberAvatar
                    key={member.id}
                    name={member.name}
                    color={participantColors.get(member.id)}
                    className={cn("ring-2 ring-background", index > 0 && "-ml-2")}
                  />
                ))}
              </div>
              <span className="text-muted-foreground text-sm">
                <Users className="mr-1 inline size-4" aria-hidden="true" />
                {preview.members.length} {preview.members.length === 1 ? "person" : "people"} · {preview.baseCurrency}
              </span>
            </div>
          </section>

          <Card>
            <CardHeader>
              <CardTitle>Who are you?</CardTitle>
              <CardDescription>This connects this device to your place in the room.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={(event) => {
                event.preventDefault()
                const data = new FormData(event.currentTarget)
                setPending(true)
                startTransition(async () => {
                  const result = await joinRoomAction({
                    code,
                    memberId: choice === "new" ? undefined : choice,
                    name: choice === "new" ? data.get("name") : "",
                  })
                  setPending(false)
                  if (!result.ok) {
                    toast.error(result.error)
                    return
                  }
                  router.replace(`/r/${result.data.code}`)
                  router.refresh()
                })
              }}>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="participant-choice">Participant</FieldLabel>
                    <NativeSelect id="participant-choice" value={choice} onChange={(event) => setChoice(event.target.value)}>
                      <NativeSelectOption value="new">Not listed — add me</NativeSelectOption>
                      {preview.members.map((member) => (
                        <NativeSelectOption value={member.id} key={member.id}>
                          {member.name}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                    <FieldDescription>Only claim a participant that represents you.</FieldDescription>
                  </Field>
                  {choice === "new" && (
                    <Field>
                      <FieldLabel htmlFor="new-participant-name">Your name</FieldLabel>
                      <Input id="new-participant-name" name="name" autoComplete="name" placeholder="Taylor" required />
                    </Field>
                  )}
                  <Button type="submit" size="lg" disabled={pending}>
                    {pending ? <Spinner data-icon="inline-start" /> : <ArrowRight data-icon="inline-end" />}
                    Enter room
                  </Button>
                </FieldGroup>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
