import { ExpenseSection } from "@/components/sendit/expense-section";
import { MemberAvatar } from "@/components/sendit/member-avatar";
import { SettlementSection } from "@/components/sendit/settlement-section";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { computeBalances, totalSpend } from "@/lib/accounting";
import { getJoinedLedger } from "@/lib/data";
import {
  convertBaseAmount,
  resolveDisplayCurrency,
} from "@/lib/display-currency";
import { formatMoney, money } from "@/lib/money";
import { createParticipantColorMap } from "@/lib/participant-colors";
import { cn } from "@/lib/utils";

export const metadata = { title: "Trip overview" };

export default async function RoomOverview({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { code } = await params;
  const query = await searchParams;
  const ledger = await getJoinedLedger(code);
  if (!ledger) return null;
  const requested = Array.isArray(query.display)
    ? query.display[0]
    : query.display;
  const display = await resolveDisplayCurrency(ledger, requested);
  const balances = computeBalances(ledger).filter(
    (balance) => !balance.member.mergedInto,
  );
  const spend = totalSpend(ledger);
  const paidBy = balances
    .filter((balance) => money(balance.paid).isPositive())
    .sort((left, right) => money(right.paid).comparedTo(left.paid));
  const remaining = balances
    .reduce(
      (total, balance) =>
        money(balance.net).isPositive() ? total.plus(balance.net) : total,
      money(0),
    )
    .toString();
  const participantColors = createParticipantColorMap(ledger.members);
  const convert = (value: string) =>
    formatMoney(convertBaseAmount(value, display), display.code);

  return (
    <div className="flex flex-col gap-12 max-w-5xl px-2 sm:px-8 lg:px-9 mx-auto">
      <section
        id="overview"
        className="scroll-mt-32 py-2 sm:py-4"
        aria-labelledby="trip-overview-title"
      >
        <h1
          id="trip-overview-title"
          className="text-2xl font-semibold tracking-tight sm:text-3xl"
        >
          {ledger.room.name}
        </h1>

        <dl className="mt-9 grid gap-6 sm:grid-cols-3 sm:gap-10">
          <div>
            <dt className="text-muted-foreground text-sm">Total spend</dt>
            <dd className="mt-2 text-3xl font-semibold tracking-tight">
              {convert(spend)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-sm">Remaining</dt>
            <dd className="mt-2 text-3xl font-semibold tracking-tight">
              {convert(remaining)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-sm">Expenses</dt>
            <dd className="mt-2 text-3xl font-semibold tracking-tight">
              {ledger.expenses.length}
            </dd>
          </div>
        </dl>

        {display.error && (
          <p className="text-destructive mt-3 text-sm">{display.error}</p>
        )}
        {!display.error && display.code !== ledger.room.baseCurrency && (
          <p className="text-muted-foreground mt-3 text-xs">
            Current estimate · rate effective {display.effectiveDate}
          </p>
        )}

        <div className="mt-10">
          <p className="text-muted-foreground mb-3 text-sm">
            Spend distribution
          </p>
          <div
            className="bg-muted flex h-3 overflow-hidden rounded-full"
            role="img"
            aria-label="Share of trip expenses paid by each participant"
          >
            {paidBy.map((balance) => (
              <div
                key={balance.member.id}
                style={{
                  backgroundColor: participantColors.get(balance.member.id),
                  width: `${money(balance.paid).div(spend).mul(100).toString()}%`,
                }}
              />
            ))}
          </div>
          {paidBy.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
              {paidBy.map((balance) => (
                <div
                  key={balance.member.id}
                  className="flex items-center gap-2 text-sm"
                >
                  <span
                    className="size-2 rounded-full"
                    style={{
                      backgroundColor: participantColors.get(balance.member.id),
                    }}
                    aria-hidden="true"
                  />
                  <span className="text-muted-foreground">
                    {balance.member.name}
                  </span>
                  <span className="font-medium">{convert(balance.paid)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground mt-3 text-sm">
              Add the first expense to start the trip.
            </p>
          )}
        </div>
      </section>

      <section id="balances" className="scroll-mt-32">
        <h2 className="mb-4 text-lg font-semibold">Participants</h2>
        <div className="border-y">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="h-12">Person</TableHead>
                <TableHead className="h-12 text-right">Paid</TableHead>
                <TableHead className="h-12 text-right">Cost</TableHead>
                <TableHead className="h-12 text-right">Net</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {balances.map((balance) => {
                const positive = money(balance.net).isPositive();
                const negative = money(balance.net).isNegative();
                return (
                  <TableRow key={balance.member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <MemberAvatar
                          name={balance.member.name}
                          size="sm"
                          color={participantColors.get(balance.member.id)}
                        />
                        <p className="font-medium">{balance.member.name}</p>
                        {balance.member.isArchived && (
                          <Badge variant="outline">Archived</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {convert(balance.paid)}
                    </TableCell>
                    <TableCell className="text-right">
                      {convert(balance.owed)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-semibold",
                        positive && "text-positive",
                        negative && "text-destructive",
                        !positive && !negative && "text-muted-foreground",
                      )}
                    >
                      {formatMoney(
                        convertBaseAmount(balance.net, display),
                        display.code,
                        { sign: true },
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </section>

      <SettlementSection ledger={ledger} display={display} />

      <ExpenseSection ledger={ledger} display={display} filters={query} />
    </div>
  );
}
