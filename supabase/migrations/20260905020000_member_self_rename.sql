create or replace function public.update_my_member_profile(
  p_room_id uuid,
  p_name text,
  p_preferred_currency text,
  p_payment_info text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  member_id uuid := public.current_member_id(p_room_id);
  clean_name text := trim(coalesce(p_name, ''));
begin
  if member_id is null then raise exception 'Not allowed'; end if;
  if char_length(clean_name) < 1 or char_length(clean_name) > 60 then
    raise exception 'Name must be between 1 and 60 characters';
  end if;
  if upper(trim(coalesce(p_preferred_currency, ''))) !~ '^[A-Z]{3}$' then
    raise exception 'Invalid currency';
  end if;
  if char_length(trim(coalesce(p_payment_info, ''))) > 500 then
    raise exception 'Payment information must be 500 characters or fewer';
  end if;

  update public.room_members set
    name = clean_name,
    preferred_currency = upper(trim(p_preferred_currency)),
    payment_info = nullif(trim(coalesce(p_payment_info, '')), '')
  where id = member_id and room_id = p_room_id and merged_into is null;

  if not found then raise exception 'Participant not found'; end if;
end;
$$;

revoke execute on function public.update_my_member_profile(uuid, text, text, text) from public, anon;
grant execute on function public.update_my_member_profile(uuid, text, text, text) to authenticated;

drop function if exists public.update_my_member_profile(uuid, text, text);
