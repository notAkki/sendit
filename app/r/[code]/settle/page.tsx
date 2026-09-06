import { redirect } from "next/navigation"

export default async function SettlePage({ params, searchParams }: {
  params: Promise<{ code: string }>
  searchParams: Promise<{
    currency?: string | string[]
    display?: string | string[]
  }>
}) {
  const { code } = await params
  const query = await searchParams
  const requested = query.display || query.currency
  const display = Array.isArray(requested) ? requested[0] : requested
  const suffix = display && /^[A-Z]{3}$/i.test(display)
    ? `?display=${encodeURIComponent(display.toUpperCase())}`
    : ""
  redirect(`/r/${code}${suffix}#settle`)
}
