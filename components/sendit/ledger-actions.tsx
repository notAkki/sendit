"use client"

import { startTransition, useState } from "react"
import { useRouter } from "next/navigation"
import { Paperclip, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { deleteExpenseAction, deleteTransferAction } from "@/app/actions/sendit"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { RECEIPT_BUCKET } from "@/lib/constants"
import { createClient } from "@/lib/supabase/client"
import type { Expense } from "@/lib/types"

export function DeleteRecord({ roomId, id, kind, title }: { roomId: string; id: string; kind: "expense" | "transfer"; title: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant="ghost" size="icon-sm" />}>
        <Trash2 /><span className="sr-only">Delete {title}</span>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {title}?</AlertDialogTitle>
          <AlertDialogDescription>This removes it from everyone’s balances. This cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={pending} onClick={() => {
            setPending(true)
            startTransition(async () => {
              const result = kind === "expense"
                ? await deleteExpenseAction({ roomId, expenseId: id })
                : await deleteTransferAction({ roomId, transferId: id })
              setPending(false)
              if (!result.ok) {
                toast.error(result.error)
                return
              }
              setOpen(false)
              toast.success(kind === "expense" ? "Expense deleted" : "Payment deleted")
              router.refresh()
            })
          }}>
            {pending && <Spinner data-icon="inline-start" />} Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function ReceiptButton({ expense }: { expense: Expense }) {
  const [pending, setPending] = useState(false)
  if (!expense.receiptPath) return null

  return (
    <Button variant="ghost" size="icon-sm" disabled={pending} onClick={async () => {
      const preview = window.open("about:blank", "_blank")
      if (preview) preview.opener = null
      setPending(true)
      const supabase = createClient()
      const { data, error } = await supabase.storage.from(RECEIPT_BUCKET).createSignedUrl(expense.receiptPath!, 90)
      setPending(false)
      if (error || !data?.signedUrl) {
        preview?.close()
        toast.error("Could not open this receipt.")
        return
      }
      if (preview) preview.location.href = data.signedUrl
      else window.open(data.signedUrl, "_blank", "noopener,noreferrer")
    }}>
      {pending ? <Spinner /> : <Paperclip />}
      <span className="sr-only">Open receipt for {expense.title}</span>
    </Button>
  )
}
