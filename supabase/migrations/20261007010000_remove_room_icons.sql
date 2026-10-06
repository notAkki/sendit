drop function if exists public.update_room_settings(uuid, text, text, text, text[]);

create or replace function public.update_room_settings(
  p_room_id uuid,
  p_name text,
  p_base_currency text,
  p_display_currencies text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_room_creator(p_room_id) then raise exception 'Only the room creator can change settings'; end if;
  if trim(p_name) = '' then raise exception 'Enter a trip name'; end if;
  if p_base_currency !~ '^[A-Z]{3}$' then raise exception 'Invalid base currency'; end if;
  if exists (select 1 from public.expenses where room_id = p_room_id)
    or exists (select 1 from public.transfers where room_id = p_room_id) then
    if p_base_currency <> (select base_currency from public.rooms where id = p_room_id) then
      raise exception 'The trip currency is locked after the first financial record';
    end if;
  end if;

  update public.rooms set
    name = trim(p_name),
    base_currency = p_base_currency,
    display_currencies = array(
      select distinct upper(currency)
      from unnest(array_append(coalesce(p_display_currencies, '{}'), p_base_currency)) currency
      where currency ~ '^[A-Z]{3}$'
    )
  where id = p_room_id;
end;
$$;

alter table public.rooms drop column if exists icon;

revoke execute on function public.update_room_settings(uuid, text, text, text[]) from public, anon;
grant execute on function public.update_room_settings(uuid, text, text, text[]) to authenticated;

notify pgrst, 'reload schema';
