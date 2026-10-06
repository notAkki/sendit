alter table public.member_identities
  add column home_position integer,
  add column is_home_archived boolean not null default false;

with ranked as (
  select
    room_id,
    member_id,
    user_id,
    row_number() over (partition by user_id order by created_at desc)::integer as position
  from public.member_identities
)
update public.member_identities as identity
set home_position = ranked.position
from ranked
where identity.room_id = ranked.room_id
  and identity.member_id = ranked.member_id
  and identity.user_id = ranked.user_id;

alter table public.member_identities
  alter column home_position set default 0,
  alter column home_position set not null;

create index member_identities_home_idx
  on public.member_identities(user_id, is_home_archived, home_position);

create or replace function public.reorder_my_rooms(p_room_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  active_room_count integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if cardinality(p_room_ids) is null or cardinality(p_room_ids) = 0 then
    raise exception 'Include at least one room';
  end if;
  if (
    select count(distinct room_id)
    from unnest(p_room_ids) as requested(room_id)
  ) <> cardinality(p_room_ids) then
    raise exception 'Room order contains duplicates';
  end if;

  select count(*)
  into active_room_count
  from public.member_identities
  where user_id = auth.uid() and not is_home_archived;

  if active_room_count <> cardinality(p_room_ids) then
    raise exception 'Room order is incomplete';
  end if;
  if exists (
    select 1
    from unnest(p_room_ids) as requested(room_id)
    where not exists (
      select 1
      from public.member_identities as identity
      where identity.user_id = auth.uid()
        and identity.room_id = requested.room_id
        and not identity.is_home_archived
    )
  ) then
    raise exception 'Room order contains an unavailable room';
  end if;

  update public.member_identities as identity
  set home_position = requested.position::integer
  from unnest(p_room_ids) with ordinality as requested(room_id, position)
  where identity.user_id = auth.uid()
    and identity.room_id = requested.room_id;
end;
$$;

create or replace function public.set_my_room_archived(p_room_id uuid, p_archived boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  update public.member_identities
  set is_home_archived = p_archived
  where user_id = auth.uid() and room_id = p_room_id;

  if not found then raise exception 'Room is not available on this device'; end if;
end;
$$;

revoke execute on function public.reorder_my_rooms(uuid[]) from public, anon;
revoke execute on function public.set_my_room_archived(uuid, boolean) from public, anon;

grant execute on function public.reorder_my_rooms(uuid[]) to authenticated;
grant execute on function public.set_my_room_archived(uuid, boolean) to authenticated;

notify pgrst, 'reload schema';
