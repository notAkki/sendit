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
    <div className="mt-2 flex max-w-xl items-start gap-2 text-xs">
      <p className="text-muted-foreground min-w-0 flex-1 whitespace-pre-line">
        <span className="font-medium text-foreground">Pay via </span>
        {value}
      </p>
      <Button type="button" variant="ghost" size="icon-xs" onClick={copy} aria-label="Copy payment information">
        {copied ? <Check /> : <Copy />}
      </Button>
    </div>
  )
}
