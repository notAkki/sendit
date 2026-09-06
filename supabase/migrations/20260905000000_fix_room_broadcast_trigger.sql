-- Repairs the generic Realtime trigger from the initial Sendit migration.
-- `rooms` has an `id` column, while the ledger tables have `room_id`.
-- Reading both fields directly from a polymorphic trigger record raises at runtime.

create or replace function public.broadcast_room_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_data jsonb;
  target_room_id uuid;
begin
  row_data := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  target_room_id := coalesce(
    row_data->>'room_id',
    row_data->>'id'
  )::uuid;

  perform realtime.broadcast_changes(
    'room:' || target_room_id::text,
    tg_op,
    tg_op,
    tg_table_name,
    tg_table_schema,
    new,
    old
  );

  return null;
end;
$$;
