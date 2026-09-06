import { redirect } from "next/navigation";

export default async function ExpensesPage({ params, searchParams }: {
  params: Promise<{ code: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { code } = await params;
  const query = await searchParams;
  const next = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) {
      value.forEach((item) => next.append(key, item));
    } else if (value) {
      next.set(key, value);
    }
  }

  const suffix = next.size ? `?${next.toString()}` : "";
  redirect(`/r/${code}${suffix}#expenses`);
}
