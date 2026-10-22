-- felt: clubs and the weekly boards.
-- Paste this whole file into Supabase > SQL Editor and press Run. It's safe to run more than once.

create table if not exists public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tag text not null,
  color text not null default 'red',
  about text not null default '',
  open boolean not null default true,
  code text not null,
  owner uuid not null,
  xp bigint not null default 0,
  created_at timestamptz not null default now()
);
create unique index if not exists clubs_name_key on public.clubs (lower(name));
create unique index if not exists clubs_tag_key on public.clubs (upper(tag));
create unique index if not exists clubs_code_key on public.clubs (code);

create table if not exists public.club_members (
  user_id uuid primary key,
  club_id uuid not null references public.clubs(id) on delete cascade,
  role text not null default 'member',
  donated bigint not null default 0,
  joined_at timestamptz not null default now()
);
create index if not exists club_members_club_idx on public.club_members (club_id);

create table if not exists public.weekly_scores (
  week text not null,
  user_id uuid not null,
  bot bigint not null default 0,
  live bigint not null default 0,
  gain bigint not null default 0,
  net bigint not null default 0,
  claimed boolean not null default false,
  primary key (week, user_id)
);
create index if not exists weekly_scores_net_idx on public.weekly_scores (week, net desc);

-- only the game server (with the secret key) touches these, so no policies
alter table public.clubs enable row level security;
alter table public.club_members enable row level security;
alter table public.weekly_scores enable row level security;

create or replace function public.club_donate(cid uuid, uid uuid, amt bigint) returns bigint language sql as $$
  update public.club_members set donated = donated + amt where user_id = uid and club_id = cid;
  update public.clubs set xp = xp + amt where id = cid returning xp;
$$;

create or replace function public.weekly_add(wk text, uid uuid, d_live bigint, d_gain bigint) returns void language sql as $$
  insert into public.weekly_scores as w (week, user_id, live, gain, net) values (wk, uid, d_live, d_gain, d_live)
  on conflict (week, user_id) do update set live = w.live + excluded.live, gain = w.gain + excluded.gain, net = w.bot + w.live + excluded.live;
$$;

-- what the phone says it won this week, capped at the chips that really came in
create or replace function public.weekly_set_bot(wk text, uid uuid, b bigint) returns void language sql as $$
  insert into public.weekly_scores (week, user_id) values (wk, uid) on conflict do nothing;
  update public.weekly_scores set bot = least(b, gain), net = least(b, gain) + live where week = wk and user_id = uid;
$$;

create or replace function public.club_week(wk text) returns table (club_id uuid, score bigint, members bigint) language sql stable as $$
  select m.club_id, coalesce(sum(w.net), 0)::bigint, count(*)::bigint
  from public.club_members m left join public.weekly_scores w on w.user_id = m.user_id and w.week = wk
  group by m.club_id;
$$;

revoke all on function public.club_donate(uuid, uuid, bigint) from public, anon, authenticated;
revoke all on function public.weekly_add(text, uuid, bigint, bigint) from public, anon, authenticated;
revoke all on function public.weekly_set_bot(text, uuid, bigint) from public, anon, authenticated;
revoke all on function public.club_week(text) from public, anon, authenticated;
grant execute on function public.club_donate(uuid, uuid, bigint) to service_role;
grant execute on function public.weekly_add(text, uuid, bigint, bigint) to service_role;
grant execute on function public.weekly_set_bot(text, uuid, bigint) to service_role;
grant execute on function public.club_week(text) to service_role;
