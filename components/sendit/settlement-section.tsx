import { ArrowRight, CheckCircle2, HandCoins, Info } from "lucide-react";

import { DeleteRecord } from "@/components/sendit/ledger-actions";
import { MemberAvatar } from "@/components/sendit/member-avatar";
import { PaymentInfo } from "@/components/sendit/payment-info";
import { TransferForm } from "@/components/sendit/transfer-form";
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
import { computeSettlements } from "@/lib/accounting";
import {
  convertBaseAmount,
  type DisplayCurrency,
} from "@/lib/display-currency";
import { formatMoney } from "@/lib/money";
import { createParticipantColorMap } from "@/lib/participant-colors";
import type { RoomLedger } from "@/lib/types";

export function SettlementSection({
  ledger,
  display,
}: {
  ledger: RoomLedger;
  display: DisplayCurrency;
}) {
  const settlements = computeSettlements(ledger);
  const membersById = new Map(
    ledger.members.map((member) => [member.id, member]),
  );
  const participantColors = createParticipantColorMap(ledger.members);

  return (
    <section id="settle" className="scroll-mt-32">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Settle up</h2>
        <TransferForm room={ledger.room} members={ledger.members} />
      </div>

      {display.error && (
        <p className="text-destructive mb-4 text-sm">{display.error}</p>
      )}
      {display.code !== ledger.room.baseCurrency && (
        <div className="text-muted-foreground mb-4 flex items-start gap-2 text-xs">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          <p>
            Shown using 1 {ledger.room.baseCurrency} = {display.rate}{" "}
            {display.code}, effective {display.effectiveDate}. A recorded
            payment locks its own dated rate.
          </p>
        </div>
      )}
      {settlements.suggestions.length === 0 ? (
        <Empty className="min-h-44 rounded-none border-x-0 border-y border-solid">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CheckCircle2 />
            </EmptyMedia>
            <EmptyTitle>All settled</EmptyTitle>
            <EmptyDescription>
              There are no remaining balances between friends.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="border-y">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="h-12 w-full px-4">Payment</TableHead>
                <TableHead className="h-12 w-px px-4 text-right">
                  Amount
                </TableHead>
                <TableHead className="h-12 w-px px-4">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {settlements.suggestions.map((suggestion, index) => {
                const from = membersById.get(suggestion.fromMemberId);
                const to = membersById.get(suggestion.toMemberId);
                const amount = convertBaseAmount(
                  suggestion.baseAmount,
                  display,
                );
                return (
                  <TableRow
                    key={`${suggestion.fromMemberId}-${suggestion.toMemberId}-${index}`}
                  >
                    <TableCell className="w-full px-4 py-4">
                      <div className="flex items-center gap-3">
                        <MemberAvatar
                          name={from?.name || "Unknown"}
                          size="sm"
                          color={participantColors.get(suggestion.fromMemberId)}
                        />
                        <p className="font-medium">{from?.name || "Unknown"}</p>
                        <ArrowRight
                          className="text-muted-foreground size-4 shrink-0"
                          aria-hidden="true"
                        />
                        <MemberAvatar
                          name={to?.name || "Unknown"}
                          size="sm"
                          color={participantColors.get(suggestion.toMemberId)}
                        />
                        <div className="min-w-0">
                          <p className="font-medium">{to?.name || "Unknown"}</p>
                          {to?.paymentInfo && (
                            <PaymentInfo value={to.paymentInfo} />
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="w-px px-4 py-4 text-right font-semibold">
                      {formatMoney(amount, display.code)}
                    </TableCell>
                    <TableCell className="w-px px-4 py-4">
                      <div className="flex justify-end">
                        <TransferForm
                          room={ledger.room}
                          members={ledger.members}
                          fromMemberId={suggestion.fromMemberId}
                          toMemberId={suggestion.toMemberId}
                          amount={amount}
                          currency={display.code}
                          label="Record as paid"
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="mt-10">
        {ledger.transfers.length === 0 ? (
          <Empty className="min-h-44 rounded-none border-x-0 border-y border-solid">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <HandCoins />
              </EmptyMedia>
              <EmptyTitle>No payments recorded</EmptyTitle>
              <EmptyDescription>
                Use a suggestion above when somebody pays, or record a payment
                directly.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="border-y">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="h-12 w-full px-4">
                    Recorded payments
                  </TableHead>
                  <TableHead className="h-12 w-px px-4 text-right">Date</TableHead>
                  <TableHead className="h-12 w-px px-4 text-right">
                    Amount
                  </TableHead>
                  <TableHead className="h-12 w-px px-4">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledger.transfers.map((transfer) => {
                  const from = membersById.get(transfer.fromMemberId);
                  const to = membersById.get(transfer.toMemberId);
                  const converted = convertBaseAmount(
                    transfer.baseAmount,
                    display,
                  );
                  return (
                    <TableRow key={transfer.id}>
                      <TableCell className="w-full px-4 py-4">
                        <div className="flex min-w-0 flex-col gap-2">
                          <div className="flex items-center gap-3">
                            <MemberAvatar
                              name={from?.name || "Unknown"}
                              size="sm"
                              color={participantColors.get(transfer.fromMemberId)}
                            />
                            <p className="font-medium">
                              {from?.name || "Unknown"}
                            </p>
                            <ArrowRight
                              className="text-muted-foreground size-4 shrink-0"
                              aria-hidden="true"
                            />
                            <MemberAvatar
                              name={to?.name || "Unknown"}
                              size="sm"
                              color={participantColors.get(transfer.toMemberId)}
                            />
                            <p className="font-medium">
                              {to?.name || "Unknown"}
                            </p>
                          </div>
                          {transfer.note && (
                            <p className="text-muted-foreground max-w-2xl truncate pl-1 text-sm">
                              {transfer.note}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="w-px px-4 py-4 text-right whitespace-nowrap tabular-nums">
                        {transfer.transferDate}
                      </TableCell>
                      <TableCell className="w-px px-4 py-4 text-right">
                        <p className="font-medium">
                          {formatMoney(transfer.amount, transfer.currency)}
                        </p>
                        {transfer.currency !== display.code && (
                          <p className="text-muted-foreground text-xs">
                            {formatMoney(converted, display.code)}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="w-px px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <TransferForm
                            room={ledger.room}
                            members={ledger.members}
                            transfer={transfer}
                          />
                          <DeleteRecord
                            roomId={ledger.room.id}
                            id={transfer.id}
                            kind="transfer"
                            title="this payment"
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </section>
  );
}
