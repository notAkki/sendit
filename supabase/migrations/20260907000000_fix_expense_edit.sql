-- Fixes expense edits failing because the original function used expense_id
-- as both a PL/pgSQL variable and an expense_splits column name.
create or replace function public.save_expense(
  p_id uuid,
  p_room_id uuid,
  p_title text,
  p_description text,
  p_expense_date date,
  p_amount numeric,
  p_currency text,
  p_base_amount numeric,
  p_paid_by_member_id uuid,
  p_split_mode text,
  p_fx_rate numeric,
  p_fx_requested_date date,
  p_fx_effective_date date,
  p_fx_source text,
  p_splits jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_expense_id uuid := coalesce(p_id, gen_random_uuid());
  editor_id uuid := public.current_member_id(p_room_id);
  split_row jsonb;
begin
  if editor_id is null then raise exception 'Not allowed'; end if;
  if not exists (
    select 1
    from public.room_members as member
    where member.id = p_paid_by_member_id
      and member.room_id = p_room_id
  ) then
    raise exception 'Payer is not in this room';
  end if;
  if jsonb_array_length(p_splits) = 0 then raise exception 'Choose at least one participant'; end if;
  if (select coalesce(sum((value->>'amount')::numeric), 0) from jsonb_array_elements(p_splits)) <> p_amount then
    raise exception 'Split amounts do not match the expense total';
  end if;
  if (select coalesce(sum((value->>'baseAmount')::numeric), 0) from jsonb_array_elements(p_splits)) <> p_base_amount then
    raise exception 'Base split amounts do not match the converted total';
  end if;

  if p_id is null then
    insert into public.expenses (
      id, room_id, title, description, expense_date, amount, currency, base_amount,
      paid_by_member_id, split_mode, fx_rate, fx_requested_date, fx_effective_date,
      fx_source, created_by_member_id, updated_by_member_id
    ) values (
      saved_expense_id, p_room_id, trim(p_title), nullif(trim(p_description), ''), p_expense_date,
      p_amount, p_currency, p_base_amount, p_paid_by_member_id, p_split_mode, p_fx_rate,
      p_fx_requested_date, p_fx_effective_date, p_fx_source, editor_id, editor_id
    );
  else
    update public.expenses as expense set
      title = trim(p_title),
      description = nullif(trim(p_description), ''),
      expense_date = p_expense_date,
      amount = p_amount,
      currency = p_currency,
      base_amount = p_base_amount,
      paid_by_member_id = p_paid_by_member_id,
      split_mode = p_split_mode,
      fx_rate = p_fx_rate,
      fx_requested_date = p_fx_requested_date,
      fx_effective_date = p_fx_effective_date,
      fx_source = p_fx_source,
      updated_by_member_id = editor_id
    where expense.id = p_id
      and expense.room_id = p_room_id;
    if not found then raise exception 'Expense not found'; end if;

    delete from public.expense_splits as existing_split
    where existing_split.expense_id = p_id;
  end if;

  for split_row in select value from jsonb_array_elements(p_splits)
  loop
    if not exists (
      select 1
      from public.room_members as member
      where member.id = (split_row->>'memberId')::uuid
        and member.room_id = p_room_id
    ) then
      raise exception 'A split participant is not in this room';
    end if;

    insert into public.expense_splits (room_id, expense_id, member_id, amount, base_amount)
    values (
      p_room_id,
      saved_expense_id,
      (split_row->>'memberId')::uuid,
      (split_row->>'amount')::numeric,
      (split_row->>'baseAmount')::numeric
    );
  end loop;

  return saved_expense_id;
end;
$$;
