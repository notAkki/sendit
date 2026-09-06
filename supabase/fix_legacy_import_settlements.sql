-- Repair the existing 2026 legacy import so settlement balances are expressed
-- in whole USD cents, matching expenses created through Sendit's normal form.
-- Replace target_code, then run this entire file once in the Supabase SQL Editor.

do $fix$
declare
  target_code constant text := 'PASTE-ROOM-CODE-HERE';
  target_room public.rooms%rowtype;
  imported_count integer;
begin
  if target_code = 'PASTE-ROOM-CODE-HERE' then
    raise exception 'Replace PASTE-ROOM-CODE-HERE with the room code from the URL before running this script.';
  end if;

  select *
  into target_room
  from public.rooms
  where code = upper(trim(target_code));

  if not found then
    raise exception 'No Sendit room found for code %.', upper(trim(target_code));
  end if;

  if target_room.base_currency <> 'USD' then
    raise exception
      'This repair expects a USD accounting room, but room % uses %.',
      target_room.code,
      target_room.base_currency;
  end if;

  select count(*)
  into imported_count
  from public.expenses as expense
  where expense.room_id = target_room.id
    and expense.id in (
      select md5(
        'sendit-legacy-trip-2026|'
        || target_room.id::text
        || '|'
        || item_number::text
      )::uuid
      from generate_series(1, 80) as imported(item_number)
    );

  if imported_count <> 80 then
    raise exception
      'Expected all 80 imported expenses in room %, but found %. No changes were made.',
      target_room.code,
      imported_count;
  end if;

  -- Sendit rounds every converted total to the base currency's smallest unit.
  update public.expenses as expense
  set base_amount = round(expense.amount * expense.fx_rate, 2)
  where expense.room_id = target_room.id
    and expense.id in (
      select md5(
        'sendit-legacy-trip-2026|'
        || target_room.id::text
        || '|'
        || item_number::text
      )::uuid
      from generate_series(1, 80) as imported(item_number)
    );

  -- Match Sendit's largest-remainder allocator: work in integer cents, give
  -- leftover cents to the largest fractional remainders, and use member UUIDs
  -- as the stable tie-breaker.
  with imported_expenses as (
    select expense.id
    from public.expenses as expense
    where expense.room_id = target_room.id
      and expense.id in (
        select md5(
          'sendit-legacy-trip-2026|'
          || target_room.id::text
          || '|'
          || item_number::text
        )::uuid
        from generate_series(1, 80) as imported(item_number)
      )
  ),
  provisional as (
    select
      split.id as split_id,
      split.expense_id,
      split.member_id,
      expense.base_amount * 100 as total_minor,
      floor(
        expense.base_amount * 100 * split.amount / expense.amount
      ) as floor_minor,
      expense.base_amount * 100 * split.amount / expense.amount
        - floor(expense.base_amount * 100 * split.amount / expense.amount)
        as fractional_remainder
    from public.expense_splits as split
    join public.expenses as expense on expense.id = split.expense_id
    join imported_expenses on imported_expenses.id = expense.id
  ),
  ranked as (
    select
      provisional.*,
      sum(floor_minor) over (partition by expense_id) as floor_total,
      row_number() over (
        partition by expense_id
        order by fractional_remainder desc, member_id::text
      ) as remainder_rank
    from provisional
  ),
  allocations as (
    select
      split_id,
      (
        floor_minor
        + case
            when remainder_rank <= total_minor - floor_total then 1
            else 0
          end
      ) / 100 as base_amount
    from ranked
  )
  update public.expense_splits as split
  set base_amount = allocations.base_amount
  from allocations
  where split.id = allocations.split_id;

  if exists (
    select 1
    from public.expenses as expense
    where expense.room_id = target_room.id
      and expense.id in (
        select md5(
          'sendit-legacy-trip-2026|'
          || target_room.id::text
          || '|'
          || item_number::text
        )::uuid
        from generate_series(1, 80) as imported(item_number)
      )
      and expense.base_amount <> (
        select coalesce(sum(split.base_amount), 0)
        from public.expense_splits as split
        where split.expense_id = expense.id
      )
  ) then
    raise exception 'Repair verification failed. All changes were rolled back.';
  end if;

  raise notice
    'Repaired base-currency rounding for % imported expenses in room % (%).',
    imported_count,
    target_room.name,
    target_room.code;
end;
$fix$;
