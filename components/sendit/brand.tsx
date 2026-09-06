import Link from "next/link"

import { SenditMark } from "@/components/sendit/sendit-mark"

export function Brand() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2 font-semibold tracking-tight"
      aria-label="Sendit home"
    >
      <SenditMark />
      <span>Sendit</span>
    </Link>
  )
}
