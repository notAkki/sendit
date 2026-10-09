create or replace function public.import_balance_expenses(
  p_room_id uuid,
  p_expense_date date,
  p_currency text,
  p_fx_rate numeric,
  p_fx_requested_date date,
  p_fx_effective_date date,
  p_fx_source text,
  p_expenses jsonb
)
returns uuid[]
language plpgsql
security definer
set search_path = public
as $$
declare
  expense_row jsonb;
  expense_ids uuid[] := '{}';
begin
  if public.current_member_id(p_room_id) is null then raise exception 'Not allowed'; end if;
  if p_expenses is null or jsonb_typeof(p_expenses) is distinct from 'array' then
    raise exception 'Invalid balance import';
  end if;
  if jsonb_array_length(p_expenses) not between 1 and 100 then
    raise exception 'Include between 1 and 100 generated expenses';
  end if;

  for expense_row in select value from jsonb_array_elements(p_expenses)
  loop
    expense_ids := array_append(
      expense_ids,
      public.save_expense(
        null::uuid,
        p_room_id,
        expense_row->>'title',
        expense_row->>'description',
        p_expense_date,
        (expense_row->>'amount')::numeric,
        p_currency,
        (expense_row->>'baseAmount')::numeric,
        (expense_row->>'paidByMemberId')::uuid,
        'exact',
        p_fx_rate,
        p_fx_requested_date,
        p_fx_effective_date,
        p_fx_source,
        expense_row->'splits'
      )
    );
  end loop;

  return expense_ids;
end;
$$;

revoke execute on function public.import_balance_expenses(
  uuid, date, text, numeric, date, date, text, jsonb
) from public, anon;

grant execute on function public.import_balance_expenses(
  uuid, date, text, numeric, date, date, text, jsonb
) to authenticated;

notify pgrst, 'reload schema';
