create extension if not exists pgcrypto;

create or replace function public.generate_room_code()
returns text
language plpgsql
volatile
set search_path = public
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate text;
begin
  candidate := '';
  for index in 1..8 loop
    candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  candidate := substr(candidate, 1, 4) || '-' || substr(candidate, 5, 4);
  return candidate;
end;
$$;

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null check (char_length(name) between 1 and 80),
  base_currency text not null check (base_currency ~ '^[A-Z]{3}$'),
  display_currencies text[] not null default '{}',
  creator_member_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.room_members (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  preferred_currency text not null check (preferred_currency ~ '^[A-Z]{3}$'),
  payment_info text constraint room_members_payment_info_length check (payment_info is null or char_length(payment_info) <= 500),
  is_archived boolean not null default false,
  merged_into uuid references public.room_members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (room_id, name)
);

alter table public.rooms
  add constraint rooms_creator_member_id_fkey
  foreign key (creator_member_id) references public.room_members(id)
  deferrable initially deferred;

create table public.member_identities (
  room_id uuid not null references public.rooms(id) on delete cascade,
  member_id uuid not null references public.room_members(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (room_id, member_id, user_id),
  unique (room_id, user_id)
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  description text check (description is null or char_length(description) <= 500),
  expense_date date not null,
  amount numeric(20, 6) not null check (amount > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  base_amount numeric(20, 6) not null check (base_amount > 0),
  paid_by_member_id uuid not null references public.room_members(id),
  split_mode text not null check (split_mode in ('equal', 'exact', 'percentage', 'shares')),
  fx_rate numeric(24, 12) not null check (fx_rate > 0),
  fx_requested_date date not null,
  fx_effective_date date not null,
  fx_source text not null check (fx_source in ('frankfurter', 'manual', 'identity')),
  receipt_path text,
  receipt_name text,
  receipt_type text check (receipt_type is null or receipt_type in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')),
  receipt_size bigint check (receipt_size is null or receipt_size between 1 and 10485760),
  created_by_member_id uuid not null references public.room_members(id),
  updated_by_member_id uuid not null references public.room_members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.expense_splits (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  expense_id uuid not null references public.expenses(id) on delete cascade,
  member_id uuid not null references public.room_members(id),
  amount numeric(20, 6) not null check (amount >= 0),
  base_amount numeric(20, 6) not null check (base_amount >= 0),
  unique (expense_id, member_id)
);

create table public.transfers (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  from_member_id uuid not null references public.room_members(id),
  to_member_id uuid not null references public.room_members(id),
  transfer_date date not null,
  amount numeric(20, 6) not null check (amount > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  base_amount numeric(20, 6) not null check (base_amount > 0),
  fx_rate numeric(24, 12) not null check (fx_rate > 0),
  fx_requested_date date not null,
  fx_effective_date date not null,
  fx_source text not null check (fx_source in ('frankfurter', 'manual', 'identity')),
  note text check (note is null or char_length(note) <= 240),
  created_by_member_id uuid not null references public.room_members(id),
  updated_by_member_id uuid not null references public.room_members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (from_member_id <> to_member_id)
);

create table public.join_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  attempted_at timestamptz not null default now()
);

create index room_members_room_id_idx on public.room_members(room_id);
create index member_identities_user_id_idx on public.member_identities(user_id);
create index expenses_room_date_idx on public.expenses(room_id, expense_date desc);
create index expense_splits_room_member_idx on public.expense_splits(room_id, member_id);
create index transfers_room_date_idx on public.transfers(room_id, transfer_date desc);
create index join_attempts_user_time_idx on public.join_attempts(user_id, attempted_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger rooms_set_updated_at before update on public.rooms
for each row execute function public.set_updated_at();
create trigger room_members_set_updated_at before update on public.room_members
for each row execute function public.set_updated_at();
create trigger expenses_set_updated_at before update on public.expenses
for each row execute function public.set_updated_at();
create trigger transfers_set_updated_at before update on public.transfers
for each row execute function public.set_updated_at();

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

create trigger rooms_broadcast_change after insert or update or delete on public.rooms
for each row execute function public.broadcast_room_change();
create trigger room_members_broadcast_change after insert or update or delete on public.room_members
for each row execute function public.broadcast_room_change();
create trigger expenses_broadcast_change after insert or update or delete on public.expenses
for each row execute function public.broadcast_room_change();
create trigger expense_splits_broadcast_change after insert or update or delete on public.expense_splits
for each row execute function public.broadcast_room_change();
create trigger transfers_broadcast_change after insert or update or delete on public.transfers
for each row execute function public.broadcast_room_change();

create or replace function public.current_member_id(target_room_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select member_id
  from public.member_identities
  where room_id = target_room_id and user_id = (select auth.uid())
  limit 1
$$;

create or replace function public.is_room_member(target_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.member_identities
    where room_id = target_room_id and user_id = (select auth.uid())
  )
$$;

create or replace function public.is_room_creator(target_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.rooms
    where id = target_room_id and creator_member_id = public.current_member_id(target_room_id)
  )
$$;

alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.member_identities enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_splits enable row level security;
alter table public.transfers enable row level security;
alter table public.join_attempts enable row level security;

create policy "members read rooms" on public.rooms for select to authenticated
using (public.is_room_member(id));
create policy "creators update rooms" on public.rooms for update to authenticated
using (public.is_room_creator(id)) with check (public.is_room_creator(id));

create policy "members read participants" on public.room_members for select to authenticated
using (public.is_room_member(room_id));
create policy "members add participants" on public.room_members for insert to authenticated
with check (public.is_room_member(room_id));
create policy "creators update participants" on public.room_members for update to authenticated
using (public.is_room_creator(room_id)) with check (public.is_room_creator(room_id));

create policy "members read identities" on public.member_identities for select to authenticated
using (user_id = (select auth.uid()) and public.is_room_member(room_id));

create policy "members read expenses" on public.expenses for select to authenticated
using (public.is_room_member(room_id));
create policy "members add expenses" on public.expenses for insert to authenticated
with check (public.is_room_member(room_id));
create policy "members update expenses" on public.expenses for update to authenticated
using (public.is_room_member(room_id)) with check (public.is_room_member(room_id));
create policy "members delete expenses" on public.expenses for delete to authenticated
using (public.is_room_member(room_id));

create policy "members read splits" on public.expense_splits for select to authenticated
using (public.is_room_member(room_id));
create policy "members add splits" on public.expense_splits for insert to authenticated
with check (public.is_room_member(room_id));
create policy "members update splits" on public.expense_splits for update to authenticated
using (public.is_room_member(room_id)) with check (public.is_room_member(room_id));
create policy "members delete splits" on public.expense_splits for delete to authenticated
using (public.is_room_member(room_id));

create policy "members read transfers" on public.transfers for select to authenticated
using (public.is_room_member(room_id));
create policy "members add transfers" on public.transfers for insert to authenticated
with check (public.is_room_member(room_id));
create policy "members update transfers" on public.transfers for update to authenticated
using (public.is_room_member(room_id)) with check (public.is_room_member(room_id));
create policy "members delete transfers" on public.transfers for delete to authenticated
using (public.is_room_member(room_id));

revoke all on public.join_attempts from anon, authenticated;

create or replace function public.create_room(
  p_name text,
  p_base_currency text,
  p_creator_name text,
  p_preferred_currency text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  new_room_id uuid := gen_random_uuid();
  new_member_id uuid := gen_random_uuid();
  new_code text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if char_length(trim(p_name)) not between 1 and 80 then raise exception 'Invalid room name'; end if;
  if char_length(trim(p_creator_name)) not between 1 and 60 then raise exception 'Invalid display name'; end if;
  if p_base_currency !~ '^[A-Z]{3}$' or p_preferred_currency !~ '^[A-Z]{3}$' then
    raise exception 'Invalid currency';
  end if;
  loop
    new_code := public.generate_room_code();
    exit when not exists (select 1 from public.rooms where code = new_code);
  end loop;
  insert into public.rooms (id, code, name, base_currency, display_currencies, creator_member_id)
  values (
    new_room_id,
    new_code,
    trim(p_name),
    p_base_currency,
    array(select distinct currency from unnest(array[p_base_currency, p_preferred_currency, 'USD', 'CAD', 'EUR']) as currency),
    new_member_id
  );
  insert into public.room_members (id, room_id, name, preferred_currency)
  values (new_member_id, new_room_id, trim(p_creator_name), p_preferred_currency);
  insert into public.member_identities (room_id, member_id, user_id)
  values (new_room_id, new_member_id, auth.uid());
  return jsonb_build_object('roomId', new_room_id, 'memberId', new_member_id, 'code', new_code);
end;
$$;

create or replace function public.get_room_join_preview(p_code text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'roomId', rooms.id,
    'name', rooms.name,
    'baseCurrency', rooms.base_currency,
    'members', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', room_members.id,
        'name', room_members.name,
        'preferredCurrency', room_members.preferred_currency
      ) order by room_members.created_at)
      from public.room_members
      where room_members.room_id = rooms.id and not room_members.is_archived
    ), '[]'::jsonb)
  )
  from public.rooms
  where rooms.code = upper(trim(p_code))
$$;

create or replace function public.join_room(p_code text, p_name text, p_member_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_room public.rooms%rowtype;
  target_member public.room_members%rowtype;
  existing_member_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if (select count(*) from public.join_attempts where user_id = auth.uid() and attempted_at > now() - interval '10 minutes') >= 10 then
    raise exception 'Too many join attempts. Try again in a few minutes.';
  end if;
  insert into public.join_attempts (user_id) values (auth.uid());

  select * into target_room from public.rooms where code = upper(trim(p_code));
  if target_room.id is null then raise exception 'Room not found'; end if;

  select member_id into existing_member_id
  from public.member_identities
  where room_id = target_room.id and user_id = auth.uid();
  if existing_member_id is not null then
    return jsonb_build_object('roomId', target_room.id, 'memberId', existing_member_id, 'code', target_room.code);
  end if;

  if p_member_id is not null then
    select * into target_member
    from public.room_members
    where id = p_member_id and room_id = target_room.id and not is_archived;
    if target_member.id is null then raise exception 'Participant not found'; end if;
  else
    if char_length(trim(p_name)) not between 1 and 60 then raise exception 'Enter your name'; end if;
    insert into public.room_members (room_id, name, preferred_currency)
    values (target_room.id, trim(p_name), target_room.base_currency)
    returning * into target_member;
  end if;

  insert into public.member_identities (room_id, member_id, user_id)
  values (target_room.id, target_member.id, auth.uid());
  return jsonb_build_object('roomId', target_room.id, 'memberId', target_member.id, 'code', target_room.code);
end;
$$;

create or replace function public.add_room_member(p_room_id uuid, p_name text, p_preferred_currency text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare new_id uuid;
begin
  if not public.is_room_member(p_room_id) then raise exception 'Not allowed'; end if;
  insert into public.room_members (room_id, name, preferred_currency)
  values (p_room_id, trim(p_name), p_preferred_currency)
  returning id into new_id;
  return new_id;
end;
$$;

create or replace function public.update_my_member_profile(
  p_room_id uuid,
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
begin
  if member_id is null then raise exception 'Not allowed'; end if;
  if upper(trim(coalesce(p_preferred_currency, ''))) !~ '^[A-Z]{3}$' then
    raise exception 'Invalid currency';
  end if;
  if char_length(trim(coalesce(p_payment_info, ''))) > 500 then
    raise exception 'Payment information must be 500 characters or fewer';
  end if;

  update public.room_members set
    preferred_currency = upper(trim(p_preferred_currency)),
    payment_info = nullif(trim(coalesce(p_payment_info, '')), '')
  where id = member_id and room_id = p_room_id and merged_into is null;

  if not found then raise exception 'Participant not found'; end if;
end;
$$;

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
  expense_id uuid := coalesce(p_id, gen_random_uuid());
  editor_id uuid := public.current_member_id(p_room_id);
  split_row jsonb;
begin
  if editor_id is null then raise exception 'Not allowed'; end if;
  if not exists (select 1 from public.room_members where id = p_paid_by_member_id and room_id = p_room_id) then
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
      expense_id, p_room_id, trim(p_title), nullif(trim(p_description), ''), p_expense_date,
      p_amount, p_currency, p_base_amount, p_paid_by_member_id, p_split_mode, p_fx_rate,
      p_fx_requested_date, p_fx_effective_date, p_fx_source, editor_id, editor_id
    );
  else
    update public.expenses set
      title = trim(p_title), description = nullif(trim(p_description), ''), expense_date = p_expense_date,
      amount = p_amount, currency = p_currency, base_amount = p_base_amount,
      paid_by_member_id = p_paid_by_member_id, split_mode = p_split_mode, fx_rate = p_fx_rate,
      fx_requested_date = p_fx_requested_date, fx_effective_date = p_fx_effective_date,
      fx_source = p_fx_source, updated_by_member_id = editor_id
    where id = p_id and room_id = p_room_id;
    if not found then raise exception 'Expense not found'; end if;
    delete from public.expense_splits where expense_id = p_id;
  end if;

  for split_row in select value from jsonb_array_elements(p_splits)
  loop
    if not exists (
      select 1 from public.room_members
      where id = (split_row->>'memberId')::uuid and room_id = p_room_id
    ) then raise exception 'A split participant is not in this room'; end if;
    insert into public.expense_splits (room_id, expense_id, member_id, amount, base_amount)
    values (
      p_room_id, expense_id, (split_row->>'memberId')::uuid,
      (split_row->>'amount')::numeric, (split_row->>'baseAmount')::numeric
    );
  end loop;
  return expense_id;
end;
$$;

create or replace function public.save_transfer(
  p_id uuid,
  p_room_id uuid,
  p_from_member_id uuid,
  p_to_member_id uuid,
  p_transfer_date date,
  p_amount numeric,
  p_currency text,
  p_base_amount numeric,
  p_fx_rate numeric,
  p_fx_requested_date date,
  p_fx_effective_date date,
  p_fx_source text,
  p_note text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  transfer_id uuid := coalesce(p_id, gen_random_uuid());
  editor_id uuid := public.current_member_id(p_room_id);
begin
  if editor_id is null then raise exception 'Not allowed'; end if;
  if p_from_member_id = p_to_member_id then raise exception 'Choose two different people'; end if;
  if (select count(*) from public.room_members where room_id = p_room_id and id in (p_from_member_id, p_to_member_id)) <> 2 then
    raise exception 'Both people must be in this room';
  end if;
  if p_id is null then
    insert into public.transfers (
      id, room_id, from_member_id, to_member_id, transfer_date, amount, currency,
      base_amount, fx_rate, fx_requested_date, fx_effective_date, fx_source, note,
      created_by_member_id, updated_by_member_id
    ) values (
      transfer_id, p_room_id, p_from_member_id, p_to_member_id, p_transfer_date,
      p_amount, p_currency, p_base_amount, p_fx_rate, p_fx_requested_date,
      p_fx_effective_date, p_fx_source, nullif(trim(p_note), ''), editor_id, editor_id
    );
  else
    update public.transfers set
      from_member_id = p_from_member_id, to_member_id = p_to_member_id,
      transfer_date = p_transfer_date, amount = p_amount, currency = p_currency,
      base_amount = p_base_amount, fx_rate = p_fx_rate,
      fx_requested_date = p_fx_requested_date, fx_effective_date = p_fx_effective_date,
      fx_source = p_fx_source, note = nullif(trim(p_note), ''), updated_by_member_id = editor_id
    where id = p_id and room_id = p_room_id;
    if not found then raise exception 'Payment not found'; end if;
  end if;
  return transfer_id;
end;
$$;

create or replace function public.attach_expense_receipt(
  p_room_id uuid,
  p_expense_id uuid,
  p_path text,
  p_name text,
  p_type text,
  p_size bigint
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare old_path text;
begin
  if public.current_member_id(p_room_id) is null then raise exception 'Not allowed'; end if;
  if p_path not like p_room_id::text || '/' || p_expense_id::text || '/%' then raise exception 'Invalid receipt path'; end if;
  if p_type not in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf') then raise exception 'Invalid receipt type'; end if;
  if p_size not between 1 and 10485760 then raise exception 'Receipt must be 10 MB or smaller'; end if;
  select receipt_path into old_path from public.expenses where id = p_expense_id and room_id = p_room_id for update;
  if not found then raise exception 'Expense not found'; end if;
  update public.expenses set receipt_path = p_path, receipt_name = p_name, receipt_type = p_type, receipt_size = p_size
  where id = p_expense_id and room_id = p_room_id;
  return old_path;
end;
$$;

create or replace function public.delete_expense(p_room_id uuid, p_expense_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare old_path text;
begin
  if public.current_member_id(p_room_id) is null then raise exception 'Not allowed'; end if;
  delete from public.expenses where id = p_expense_id and room_id = p_room_id
  returning receipt_path into old_path;
  if not found then raise exception 'Expense not found'; end if;
  return old_path;
end;
$$;

create or replace function public.delete_transfer(p_room_id uuid, p_transfer_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_member_id(p_room_id) is null then raise exception 'Not allowed'; end if;
  delete from public.transfers where id = p_transfer_id and room_id = p_room_id;
  if not found then raise exception 'Payment not found'; end if;
end;
$$;

create or replace function public.rotate_room_code(p_room_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare new_code text;
begin
  if not public.is_room_creator(p_room_id) then raise exception 'Only the room creator can rotate the code'; end if;
  loop
    new_code := public.generate_room_code();
    exit when not exists (select 1 from public.rooms where code = new_code);
  end loop;
  update public.rooms set code = new_code where id = p_room_id;
  return new_code;
end;
$$;

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

create or replace function public.rename_room_member(p_room_id uuid, p_member_id uuid, p_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_room_creator(p_room_id) then raise exception 'Only the room creator can rename participants'; end if;
  if trim(p_name) = '' then raise exception 'Enter a participant name'; end if;
  update public.room_members set name = trim(p_name)
  where id = p_member_id and room_id = p_room_id and merged_into is null;
  if not found then raise exception 'Participant not found'; end if;
end;
$$;

create or replace function public.set_member_archived(p_room_id uuid, p_member_id uuid, p_archived boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_room_creator(p_room_id) then raise exception 'Only the room creator can manage participants'; end if;
  if exists (select 1 from public.rooms where id = p_room_id and creator_member_id = p_member_id) then
    raise exception 'The room creator cannot be archived';
  end if;
  update public.room_members set is_archived = p_archived
  where id = p_member_id and room_id = p_room_id and merged_into is null;
end;
$$;

revoke all on public.rooms, public.room_members, public.member_identities, public.expenses, public.expense_splits, public.transfers, public.join_attempts from anon;
revoke insert, update, delete on public.rooms, public.room_members, public.member_identities, public.expenses, public.expense_splits, public.transfers from authenticated;
grant select on public.rooms, public.room_members, public.member_identities, public.expenses, public.expense_splits, public.transfers to authenticated;

revoke execute on function public.create_room(text, text, text, text) from public, anon;
revoke execute on function public.join_room(text, text, uuid) from public, anon;
revoke execute on function public.add_room_member(uuid, text, text) from public, anon;
revoke execute on function public.save_expense(uuid, uuid, text, text, date, numeric, text, numeric, uuid, text, numeric, date, date, text, jsonb) from public, anon;
revoke execute on function public.save_transfer(uuid, uuid, uuid, uuid, date, numeric, text, numeric, numeric, date, date, text, text) from public, anon;
revoke execute on function public.attach_expense_receipt(uuid, uuid, text, text, text, bigint) from public, anon;
revoke execute on function public.delete_expense(uuid, uuid) from public, anon;
revoke execute on function public.delete_transfer(uuid, uuid) from public, anon;
revoke execute on function public.rotate_room_code(uuid) from public, anon;
revoke execute on function public.update_room_settings(uuid, text, text, text[]) from public, anon;
revoke execute on function public.rename_room_member(uuid, uuid, text) from public, anon;
revoke execute on function public.set_member_archived(uuid, uuid, boolean) from public, anon;
revoke execute on function public.update_my_member_profile(uuid, text, text) from public, anon;
revoke execute on function public.get_room_join_preview(text) from public;
grant execute on function public.get_room_join_preview(text) to anon, authenticated;
grant execute on function public.create_room(text, text, text, text) to authenticated;
grant execute on function public.join_room(text, text, uuid) to authenticated;
grant execute on function public.add_room_member(uuid, text, text) to authenticated;
grant execute on function public.save_expense(uuid, uuid, text, text, date, numeric, text, numeric, uuid, text, numeric, date, date, text, jsonb) to authenticated;
grant execute on function public.save_transfer(uuid, uuid, uuid, uuid, date, numeric, text, numeric, numeric, date, date, text, text) to authenticated;
grant execute on function public.attach_expense_receipt(uuid, uuid, text, text, text, bigint) to authenticated;
grant execute on function public.delete_expense(uuid, uuid) to authenticated;
grant execute on function public.delete_transfer(uuid, uuid) to authenticated;
grant execute on function public.rotate_room_code(uuid) to authenticated;
grant execute on function public.update_room_settings(uuid, text, text, text[]) to authenticated;
grant execute on function public.rename_room_member(uuid, uuid, text) to authenticated;
grant execute on function public.set_member_archived(uuid, uuid, boolean) to authenticated;
grant execute on function public.update_my_member_profile(uuid, text, text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'receipts', 'receipts', false, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "room members read receipts" on storage.objects for select to authenticated
using (
  bucket_id = 'receipts'
  and public.is_room_member(((storage.foldername(name))[1])::uuid)
);
create policy "room members add receipts" on storage.objects for insert to authenticated
with check (
  bucket_id = 'receipts'
  and public.is_room_member(((storage.foldername(name))[1])::uuid)
);
create policy "room members delete receipts" on storage.objects for delete to authenticated
using (
  bucket_id = 'receipts'
  and public.is_room_member(((storage.foldername(name))[1])::uuid)
);

create policy "room members receive private realtime" on realtime.messages
for select to authenticated
using (
  case
    when realtime.topic() ~ '^room:[0-9a-f-]{36}$'
    then public.is_room_member(split_part(realtime.topic(), ':', 2)::uuid)
    else false
  end
);
