import { redirect } from "next/navigation"

export default async function BalancesPage({ params, searchParams }: {
  params: Promise<{ code: string }>
  searchParams: Promise<{ display?: string | string[] }>
}) {
  const { code } = await params
  const query = await searchParams
  const display = Array.isArray(query.display) ? query.display[0] : query.display
  const suffix = display && /^[A-Z]{3}$/i.test(display)
    ? `?display=${encodeURIComponent(display.toUpperCase())}`
    : ""
  redirect(`/r/${code}${suffix}#balances`)
}
