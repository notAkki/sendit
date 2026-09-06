"use client"

import { startTransition, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRightIcon, PlusIcon } from "lucide-react"
import { toast } from "sonner"

import { createRoomAction } from "@/app/actions/sendit"
import { CurrencySelect } from "@/components/sendit/currency-select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ROOM_CODE_PATTERN, normalizeRoomCode } from "@/lib/constants"

export function LandingActions({ configured }: { configured: boolean }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [roomCode, setRoomCode] = useState("")

  function createRoom(form: HTMLFormElement) {
    const data = new FormData(form)
    setPending(true)
    startTransition(async () => {
      const result = await createRoomAction({
        name: data.get("name"),
        creatorName: data.get("creatorName"),
        baseCurrency: data.get("baseCurrency"),
      })
      setPending(false)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      router.push(`/r/${result.data.code}`)
    })
  }

  function joinRoom() {
    if (!ROOM_CODE_PATTERN.test(roomCode)) {
      toast.error("Enter the full room code.")
      return
    }
    router.push(`/r/${roomCode}`)
  }

  return (
    <div className="flex w-full flex-col gap-4">
      {!configured && (
        <Alert>
          <AlertTitle>Supabase is not connected</AlertTitle>
          <AlertDescription>Add the project URL and publishable key to `.env.local`.</AlertDescription>
        </Alert>
      )}
      <Card>
        <Tabs defaultValue="create">
          <CardHeader>
            <CardTitle>Create or join a room</CardTitle>
            <CardDescription>Shared trip expenses, private by room code.</CardDescription>
            <TabsList className="mt-3 w-full">
              <TabsTrigger value="create" className="flex-1">Create</TabsTrigger>
              <TabsTrigger value="join" className="flex-1">Join</TabsTrigger>
            </TabsList>
          </CardHeader>
          <CardContent>
            <TabsContent value="create">
              <form onSubmit={(event) => {
                event.preventDefault()
                createRoom(event.currentTarget)
              }}>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="room-name">Trip name</FieldLabel>
                    <Input id="room-name" name="name" placeholder="Lisbon" autoComplete="off" required autoFocus />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="creator-name">Your name</FieldLabel>
                    <Input id="creator-name" name="creatorName" placeholder="Alex" autoComplete="name" required />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="base-currency">Accounting currency</FieldLabel>
                    <CurrencySelect id="base-currency" name="baseCurrency" defaultValue="USD" />
                    <FieldDescription>
                      Used to keep balances consistent. Expenses and final settlement estimates can use any currency.
                    </FieldDescription>
                  </Field>
                  <Button type="submit" size="lg" className="w-full" disabled={!configured || pending}>
                    {pending ? <Spinner data-icon="inline-start" /> : <PlusIcon data-icon="inline-start" />}
                    Create room
                  </Button>
                </FieldGroup>
              </form>
            </TabsContent>
            <TabsContent value="join">
              <form onSubmit={(event) => {
                event.preventDefault()
                joinRoom()
              }}>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="room-code">Room code</FieldLabel>
                    <Input
                      id="room-code"
                      name="code"
                      value={roomCode}
                      onChange={(event) => setRoomCode(normalizeRoomCode(event.target.value))}
                      placeholder="7K3M-9Q2R"
                      autoComplete="off"
                      required
                      autoFocus
                    />
                    <FieldDescription>You’ll choose or add your name on the next screen.</FieldDescription>
                  </Field>
                  <Button type="submit" size="lg" className="w-full" disabled={!configured}>
                    Join room
                    <ArrowRightIcon data-icon="inline-end" />
                  </Button>
                </FieldGroup>
              </form>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  )
}
