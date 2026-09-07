"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { HandCoins, Home, ReceiptText } from "lucide-react";

import { ExpenseForm } from "@/components/sendit/expense-form";
import { RoomCurrencySwitcher } from "@/components/sendit/room-currency-switcher";
import { RoomManager } from "@/components/sendit/room-manager";
import { ThemeToggle } from "@/components/sendit/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import type { RoomLedger } from "@/lib/types";

const NAV_ITEMS = [
  { anchor: "overview", label: "Overview", icon: Home },
  { anchor: "settle", label: "Settle Up", icon: HandCoins },
  { anchor: "expenses", label: "Expenses", icon: ReceiptText },
];

export function RoomShell({
  ledger,
  children,
}: {
  ledger: RoomLedger;
  children: React.ReactNode;
}) {
  const searchParams = useSearchParams();
  const root = `/r/${ledger.room.code}`;
  const currentMember = ledger.members.find(
    (member) => member.id === ledger.currentMemberId,
  );

  function hrefFor(anchor: string) {
    const query = searchParams.toString();
    return `${root}${query ? `?${query}` : ""}#${anchor}`;
  }

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <header className="bg-background/92 sticky top-0 z-40 border-b backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-5xl items-center px-4 sm:px-6 lg:px-8">
          <nav className="hidden items-center gap-1 md:flex" aria-label="Room">
            {NAV_ITEMS.map((item) => {
              return (
                <Link
                  key={item.label}
                  href={hrefFor(item.anchor)}
                  className={buttonVariants({
                    variant: "ghost",
                    size: "sm",
                  })}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex w-full items-center justify-between gap-2 md:ml-auto md:w-auto md:justify-start">
            <ExpenseForm
              room={ledger.room}
              members={ledger.members}
              currentMemberId={ledger.currentMemberId}
              compactTrigger
            />
            <div className="flex items-center gap-2">
              <RoomCurrencySwitcher
                room={ledger.room}
                preferredCurrency={
                  currentMember?.preferredCurrency || ledger.room.baseCurrency
                }
              />
              <RoomManager ledger={ledger} />
              <ThemeToggle variant="outline" />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {children}
      </main>

      <nav
        className="bg-background/95 fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t backdrop-blur-lg md:hidden"
        aria-label="Room"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={hrefFor(item.anchor)}
              className="text-muted-foreground hover:text-foreground flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors"
            >
              <Icon className="size-5" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
