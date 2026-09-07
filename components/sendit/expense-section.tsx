import { ReceiptText } from "lucide-react";

import { ExpenseFilters } from "@/components/sendit/expense-filters";
import { ExpenseForm } from "@/components/sendit/expense-form";
import {
  DeleteRecord,
  ReceiptButton,
} from "@/components/sendit/ledger-actions";
import { MemberAvatar } from "@/components/sendit/member-avatar";
import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  convertBaseAmount,
  type DisplayCurrency,
} from "@/lib/display-currency";
import { formatMoney } from "@/lib/money";
import { createParticipantColorMap } from "@/lib/participant-colors";
import type { Expense, Member, RoomLedger } from "@/lib/types";

type ExpenseSearchParams = Record<
  string,
  string | string[] | undefined
>;

const dateFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

function ExpenseDistribution({
  expense,
  membersById,
  currentMemberId,
}: {
  expense: Expense;
  membersById: Map<string, Member>;
  currentMemberId: string;
}) {
  return (
    <div className="flex flex-col items-start gap-1.5">
      {expense.splits.map((split) => {
        const member = membersById.get(split.memberId);
        const isCurrentMember = split.memberId === currentMemberId;
        const memberName = member?.name || "Unknown";
        const share = formatMoney(split.amount, expense.currency);

        return (
          <Badge
            key={split.id}
            variant={isCurrentMember ? "default" : "secondary"}
            aria-label={`${isCurrentMember ? "Your" : memberName} share: ${share}`}
          >
            {memberName} · {share}
          </Badge>
        );
      })}
    </div>
  );
}

export function ExpenseSection({
  ledger,
  display,
  filters,
}: {
  ledger: RoomLedger;
  display: DisplayCurrency;
  filters: ExpenseSearchParams;
}) {
  const search = first(filters.q);
  const query = search.toLocaleLowerCase();
  const payer = first(filters.payer);
  const beneficiary = first(filters.beneficiary);
  const membersById = new Map(
    ledger.members.map((member) => [member.id, member]),
  );
  const participantColors = createParticipantColorMap(ledger.members);
  const expenses = ledger.expenses.filter((expense) => {
    if (
      query &&
      !`${expense.title} ${expense.description || ""}`
        .toLocaleLowerCase()
        .includes(query)
    ) {
      return false;
    }
    if (payer && expense.paidByMemberId !== payer) return false;
    if (
      beneficiary &&
      !expense.splits.some((split) => split.memberId === beneficiary)
    ) {
      return false;
    }
    return true;
  });
  const displayAmount = (baseAmount: string) =>
    formatMoney(convertBaseAmount(baseAmount, display), display.code);

  return (
    <section id="expenses" className="scroll-mt-32">
      <h2 className="mb-4 text-lg font-semibold">Expenses</h2>

      <ExpenseFilters
        members={ledger.members
          .filter((member) => !member.mergedInto)
          .map((member) => ({ id: member.id, name: member.name }))}
        initial={{ query: search, payer, beneficiary }}
      />

      {expenses.length === 0 ? (
        <Empty className="mt-6 min-h-72 rounded-none border-x-0 border-y border-solid">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ReceiptText />
            </EmptyMedia>
            <EmptyTitle>
              {ledger.expenses.length
                ? "No matching expenses"
                : "No expenses yet"}
            </EmptyTitle>
            <EmptyDescription>
              {ledger.expenses.length
                ? "Try clearing a filter or searching for something else."
                : "Add the first shared cost to start the ledger."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <div className="mt-6 hidden border-y md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="h-12 w-full px-4">
                    Expense
                  </TableHead>
                  <TableHead className="h-12 w-px px-4 whitespace-nowrap">
                    Paid by
                  </TableHead>
                  <TableHead className="h-12 w-px px-4 whitespace-nowrap">
                    Distribution
                  </TableHead>
                  <TableHead className="h-12 w-px px-4 text-right whitespace-nowrap">
                    Amount
                  </TableHead>
                  <TableHead className="h-12 w-px px-4 text-right whitespace-nowrap">
                    Date
                  </TableHead>
                  <TableHead className="h-12 w-px px-4 whitespace-nowrap">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => {
                  const paidBy = membersById.get(expense.paidByMemberId);

                  return (
                    <TableRow key={expense.id}>
                      <TableCell className="w-full px-4 py-4 whitespace-normal">
                        <p className="line-clamp-2 break-words font-medium leading-snug">
                          {expense.title}
                        </p>
                        {expense.description && (
                          <p className="text-muted-foreground mt-1 max-w-full truncate text-xs">
                            {expense.description}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="w-px px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 whitespace-nowrap">
                          <MemberAvatar
                            name={paidBy?.name || "Unknown"}
                            size="sm"
                            color={participantColors.get(expense.paidByMemberId)}
                          />
                          {paidBy?.name || "Unknown"}
                        </div>
                      </TableCell>
                      <TableCell className="w-px px-4 py-4 whitespace-nowrap">
                        <ExpenseDistribution
                          expense={expense}
                          membersById={membersById}
                          currentMemberId={ledger.currentMemberId}
                        />
                      </TableCell>
                      <TableCell className="w-px px-4 py-4 text-right whitespace-nowrap tabular-nums">
                        <p className="font-medium">
                          {formatMoney(expense.amount, expense.currency)}
                        </p>
                        {expense.currency !== display.code && (
                          <p className="text-muted-foreground text-xs">
                            {displayAmount(expense.baseAmount)}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="w-px px-4 py-4 text-right whitespace-nowrap tabular-nums">
                        {dateFormatter.format(
                          new Date(`${expense.expenseDate}T12:00:00`),
                        )}
                      </TableCell>
                      <TableCell className="w-px px-4 py-4 whitespace-nowrap">
                        <div className="flex justify-end gap-1">
                          <ReceiptButton expense={expense} />
                          <ExpenseForm
                            room={ledger.room}
                            members={ledger.members}
                            currentMemberId={ledger.currentMemberId}
                            expense={expense}
                          />
                          <DeleteRecord
                            roomId={ledger.room.id}
                            id={expense.id}
                            kind="expense"
                            title={expense.title}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="mt-6 divide-y border-y md:hidden">
            {expenses.map((expense) => {
              const paidBy = membersById.get(expense.paidByMemberId);

              return (
                <article key={expense.id} className="px-2 py-4">
                  <div className="flex items-start gap-3">
                    <MemberAvatar
                      name={paidBy?.name || "Unknown"}
                      color={participantColors.get(expense.paidByMemberId)}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{expense.title}</p>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {paidBy?.name} paid · {expense.expenseDate}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {formatMoney(expense.amount, expense.currency)}
                      </p>
                      {expense.currency !== display.code && (
                        <p className="text-muted-foreground text-xs">
                          {displayAmount(expense.baseAmount)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-3">
                    <ExpenseDistribution
                      expense={expense}
                      membersById={membersById}
                      currentMemberId={ledger.currentMemberId}
                    />
                  </div>
                  <div className="mt-3 flex justify-end gap-1">
                    <ReceiptButton expense={expense} />
                    <ExpenseForm
                      room={ledger.room}
                      members={ledger.members}
                      currentMemberId={ledger.currentMemberId}
                      expense={expense}
                    />
                    <DeleteRecord
                      roomId={ledger.room.id}
                      id={expense.id}
                      kind="expense"
                      title={expense.title}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
