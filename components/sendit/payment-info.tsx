"use client"

import { useState } from "react"
import { Check, Copy } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

export function PaymentInfo({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    toast.success("Payment information copied")
    window.setTimeout(() => setCopied(false), 1400)
  }

  return (
    <div className="text-muted-foreground mt-0.5 flex min-w-0 items-center gap-1 text-xs">
      <p className="min-w-0 whitespace-pre-line break-words">{value}</p>
      <Button type="button" variant="ghost" size="icon-xs" onClick={copy} aria-label="Copy payment information">
        {copied ? <Check /> : <Copy />}
      </Button>
    </div>
  )
}
