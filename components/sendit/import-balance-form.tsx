"use client";

import {
  startTransition,
  useId,
  useMemo,
  useState,
  type ClipboardEvent,
} from "react";
import { useRouter } from "next/navigation";
import Decimal from "decimal.js";
import { Import as ImportIcon, InfoIcon } from "lucide-react";
import { toast } from "sonner";

import { importBalanceAction } from "@/app/actions/sendit";
import { buildBalanceImportPlan } from "@/lib/balance-import";
import { formatMoney } from "@/lib/money";
import {
  extractMoneyInputPair,
  normalizeMoneyInput,
  parseMoneyInput,
} from "@/lib/money-input";
import { createParticipantColorMap } from "@/lib/participant-colors";
import type { Member, Room } from "@/lib/types";
import { CurrencySelect } from "@/components/sendit/currency-select";
import { MemberAvatar } from "@/components/sendit/member-avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type EntryValues = Record<string, { cost: string; net: string }>;

function today() {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function parsedAmount(value: string) {
  return parseMoneyInput(value || "0");
}

function parsedSignedAmount(value: string) {
  return parseMoneyInput(value || "0", { allowNegative: true });
}

export function ImportBalanceForm({
  room,
  members,
}: {
  room: Room;
  members: Member[];
}) {
  const router = useRouter();
  const uid = useId().replace(/:/g, "");
  const formId = `import-balance-${uid}`;
  const activeMembers = useMemo(
    () => members.filter((member) => !member.isArchived && !member.mergedInto),
    [members],
  );
  const participantColors = useMemo(
    () => createParticipantColorMap(members),
    [members],
  );
  const emptyValues = () =>
    Object.fromEntries(
      activeMembers.map((member) => [member.id, { cost: "", net: "" }]),
    );
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [title, setTitle] = useState("");
  const [expenseDate, setExpenseDate] = useState(today);
  const [currency, setCurrency] = useState(room.baseCurrency);
  const [values, setValues] = useState<EntryValues>(emptyValues);
  const membersById = new Map(
    activeMembers.map((member) => [member.id, member]),
  );

  const rawEntries = activeMembers.map((member) => ({
    memberId: member.id,
    cost:
      normalizeMoneyInput(values[member.id]?.cost || "0", currency) ||
      values[member.id]?.cost ||
      "0",
    net:
      normalizeMoneyInput(values[member.id]?.net || "0", currency, {
        allowNegative: true,
      }) ||
      values[member.id]?.net ||
      "0",
  }));
  const hasAmounts = rawEntries.some(
    (entry) => entry.cost !== "0" || entry.net !== "0",
  );
  const totals = rawEntries.reduce(
    (current, entry) => ({
      cost: current.cost.plus(parsedAmount(entry.cost) || 0),
      net: current.net.plus(parsedSignedAmount(entry.net) || 0),
    }),
    { cost: new Decimal(0), net: new Decimal(0) },
  );
  const preview = (() => {
    if (!hasAmounts) return { plan: null, error: "" };
    try {
      return { plan: buildBalanceImportPlan(rawEntries, currency), error: "" };
    } catch (error) {
      return {
        plan: null,
        error:
          error instanceof Error ? error.message : "Check the import amounts.",
      };
    }
  })();

  function updateAmount(
    memberId: string,
    field: "cost" | "net",
    value: string,
  ) {
    setValues((current) => ({
      ...current,
      [memberId]: { ...current[memberId], [field]: value },
    }));
  }

  function normalizeAmount(memberId: string, field: "cost" | "net") {
    const current = values[memberId]?.[field] || "";
    if (!current) return;
    const normalized = normalizeMoneyInput(current, currency, {
      allowNegative: field === "net",
      showPositiveSign: field === "net",
    });
    if (normalized) updateAmount(memberId, field, normalized);
  }

  function pasteAmountPair(
    memberId: string,
    event: ClipboardEvent<HTMLInputElement>,
  ) {
    const pair = extractMoneyInputPair(
      event.clipboardData.getData("text"),
      currency,
    );
    if (!pair) return;
    event.preventDefault();
    setValues((current) => ({ ...current, [memberId]: pair }));
  }

  function resetForm() {
    setTitle("");
    setExpenseDate(today());
    setCurrency(room.baseCurrency);
    setValues(emptyValues());
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Import balance"
          />
        }
      >
        <ImportIcon />
        <span className="sr-only">Import balance</span>
      </SheetTrigger>
      <SheetContent className="w-full overflow-x-hidden overflow-y-auto sm:max-w-xl border-l border-white/0">
        <SheetHeader className="border-b">
          <SheetTitle>Import balance</SheetTitle>
        </SheetHeader>

        <form
          id={formId}
          className="flex flex-col gap-6 px-4 pb-6"
          onSubmit={(event) => {
            event.preventDefault();
            if (!preview.plan) {
              toast.error(preview.error || "Enter the Cost and Net amounts.");
              return;
            }
            setPending(true);
            startTransition(async () => {
              const result = await importBalanceAction({
                roomId: room.id,
                title,
                expenseDate,
                currency,
                entries: preview.plan.entries.map(
                  ({ memberId, cost, net }) => ({
                    memberId,
                    cost,
                    net,
                  }),
                ),
              });
              if (!result.ok) {
                toast.error(result.error);
                setPending(false);
                return;
              }
              toast.success(
                `Imported ${result.data.expenseCount} summary expenses`,
              );
              resetForm();
              setOpen(false);
              router.refresh();
              setPending(false);
            });
          }}
        >
          <Alert>
            <InfoIcon />
            <AlertTitle>Settle excluded people first</AlertTitle>
            <AlertDescription>
              Cost and Net must cover only people in this room. Settle anyone
              outside this room first, then enter the remaining participants’
              adjusted net balances.
            </AlertDescription>
          </Alert>

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`import-title-${uid}`}>
                Import name
              </FieldLabel>
              <Input
                id={`import-title-${uid}`}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Porto"
                maxLength={60}
                required
                autoFocus
              />
            </Field>
            <FieldGroup className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor={`import-date-${uid}`}>Date</FieldLabel>
                <Input
                  id={`import-date-${uid}`}
                  type="date"
                  value={expenseDate}
                  onChange={(event) => setExpenseDate(event.target.value)}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`import-currency-${uid}`}>
                  Currency
                </FieldLabel>
                <CurrencySelect
                  id={`import-currency-${uid}`}
                  value={currency}
                  onValueChange={setCurrency}
                  pinnedCurrencies={room.displayCurrencies}
                />
              </Field>
            </FieldGroup>
          </FieldGroup>

          <FieldSet>
            <FieldLegend>Participant totals</FieldLegend>
            <FieldDescription>
              Enter each participant’s Cost and final Net. You can paste both
              values into either field.
            </FieldDescription>
            <div className="border-y">
              <Table className="table-fixed">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="h-8 w-[42%]">Name</TableHead>
                    <TableHead className="h-8 w-[29%]">Cost</TableHead>
                    <TableHead className="h-8 w-[29%]">Net</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeMembers.map((member) => {
                    const cost = parsedAmount(values[member.id]?.cost || "");
                    const net = parsedSignedAmount(
                      values[member.id]?.net || "",
                    );
                    const paid = cost && net ? cost.plus(net) : null;
                    return (
                      <TableRow
                        key={member.id}
                        className="hover:bg-transparent"
                      >
                        <TableCell>
                          <div className="flex min-w-0 items-center gap-2">
                            <MemberAvatar
                              name={member.name}
                              size="sm"
                              color={participantColors.get(member.id)}
                            />
                            <div className="min-w-0">
                              <div className="truncate font-medium">
                                {member.name}
                              </div>
                              <div
                                className={
                                  paid?.isNegative()
                                    ? "text-xs text-destructive"
                                    : "text-xs text-muted-foreground"
                                }
                              >
                                Paid{" "}
                                {paid
                                  ? formatMoney(paid, currency)
                                  : formatMoney(0, currency)}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Field className="gap-0">
                            <FieldLabel
                              className="sr-only"
                              htmlFor={`import-cost-${uid}-${member.id}`}
                            >
                              {member.name} cost
                            </FieldLabel>
                            <InputGroup>
                              <InputGroupInput
                                id={`import-cost-${uid}-${member.id}`}
                                inputMode="decimal"
                                value={values[member.id]?.cost || ""}
                                onChange={(event) =>
                                  updateAmount(
                                    member.id,
                                    "cost",
                                    event.target.value,
                                  )
                                }
                                onBlur={() =>
                                  normalizeAmount(member.id, "cost")
                                }
                                onPaste={(event) =>
                                  pasteAmountPair(member.id, event)
                                }
                                placeholder="0.00"
                              />
                              <InputGroupAddon align="inline-end">
                                {currency}
                              </InputGroupAddon>
                            </InputGroup>
                          </Field>
                        </TableCell>
                        <TableCell>
                          <Field className="gap-0">
                            <FieldLabel
                              className="sr-only"
                              htmlFor={`import-net-${uid}-${member.id}`}
                            >
                              {member.name} net balance
                            </FieldLabel>
                            <InputGroup>
                              <InputGroupInput
                                id={`import-net-${uid}-${member.id}`}
                                inputMode="decimal"
                                value={values[member.id]?.net || ""}
                                onChange={(event) =>
                                  updateAmount(
                                    member.id,
                                    "net",
                                    event.target.value,
                                  )
                                }
                                onBlur={() => normalizeAmount(member.id, "net")}
                                onPaste={(event) =>
                                  pasteAmountPair(member.id, event)
                                }
                                placeholder="0.00"
                              />
                              <InputGroupAddon align="inline-end">
                                {currency}
                              </InputGroupAddon>
                            </InputGroup>
                          </Field>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </FieldSet>

          {hasAmounts &&
            (preview.plan ? (
              <FieldDescription>
                Ready to import · {formatMoney(preview.plan.total, currency)}{" "}
                total · {preview.plan.expenses.length} generated expenses
              </FieldDescription>
            ) : (
              <FieldError>
                {preview.error} Cost: {formatMoney(totals.cost, currency)} ·
                Net: {formatMoney(totals.net, currency, { sign: true })}
              </FieldError>
            ))}

          {preview.plan && (
            <FieldSet className="gap-2">
              <FieldLegend>Generated expenses</FieldLegend>
              <div className="divide-y border-y">
                {preview.plan.expenses.map((expense) => {
                  const payer = membersById.get(expense.paidByMemberId);
                  return (
                    <div key={expense.paidByMemberId} className="px-2 py-2.5">
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate font-medium">
                          {payer?.name || "Participant"} paid
                        </span>
                        <span className="shrink-0 font-medium tabular-nums">
                          {formatMoney(expense.amount, currency)}
                        </span>
                      </div>
                      <div className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                        {expense.splits
                          .map(
                            (split) =>
                              `${membersById.get(split.memberId)?.name || "Participant"} ${formatMoney(split.amount, currency)}`,
                          )
                          .join(" · ")}
                      </div>
                    </div>
                  );
                })}
              </div>
            </FieldSet>
          )}
        </form>

        <SheetFooter className="border-t">
          <Button
            type="submit"
            form={formId}
            size="lg"
            disabled={pending || !preview.plan || !title.trim()}
          >
            {pending && <Spinner data-icon="inline-start" />}
            Import{" "}
            {preview.plan
              ? formatMoney(preview.plan.total, currency)
              : "balance"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
