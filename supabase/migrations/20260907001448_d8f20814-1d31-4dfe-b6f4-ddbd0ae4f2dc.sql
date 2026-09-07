-- roles
create type public.app_role as enum ('student','staff','admin');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  email text not null default '',
  student_number text,
  faculty text,
  year_of_study text,
  consent_share boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_staff(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role in ('staff','admin'))
$$;

create or replace function public.can_view_student(_student uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select _student = auth.uid()
      or (public.is_staff(auth.uid())
          and exists (select 1 from public.profiles p where p.id = _student and p.consent_share))
$$;

create policy "profiles own read" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_staff(auth.uid()));
create policy "profiles own insert" on public.profiles for insert to authenticated
  with check (id = auth.uid());
create policy "profiles own update" on public.profiles for update to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(),'admin'))
  with check (id = auth.uid() or public.has_role(auth.uid(),'admin'));

create policy "roles read own" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.is_staff(auth.uid()));

-- progress
create table public.progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  xp integer not null default 0,
  streak integer not null default 0,
  last_played_day text,
  badges text[] not null default '{}',
  levels jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.progress to authenticated;
grant all on public.progress to service_role;
alter table public.progress enable row level security;
create policy "progress read" on public.progress for select to authenticated
  using (public.can_view_student(user_id));
create policy "progress insert" on public.progress for insert to authenticated
  with check (user_id = auth.uid());
create policy "progress update" on public.progress for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  domain text not null,
  level integer not null,
  task_kind text not null,
  correct boolean not null,
  response_ms integer not null,
  attempts integer not null default 1,
  hint_used boolean not null default false,
  is_checkpoint boolean not null default false,
  at timestamptz not null default now()
);
grant select, insert on public.attempts to authenticated;
grant all on public.attempts to service_role;
alter table public.attempts enable row level security;
create policy "attempts read" on public.attempts for select to authenticated using (public.can_view_student(user_id));
create policy "attempts insert" on public.attempts for insert to authenticated with check (user_id = auth.uid());
create index attempts_user_idx on public.attempts (user_id, at desc);

create table public.level_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  domain text not null,
  level integer not null,
  accuracy integer not null,
  avg_response_ms integer not null,
  duration_ms integer not null,
  retried boolean not null default false,
  at timestamptz not null default now()
);
grant select, insert on public.level_runs to authenticated;
grant all on public.level_runs to service_role;
alter table public.level_runs enable row level security;
create policy "runs read" on public.level_runs for select to authenticated using (public.can_view_student(user_id));
create policy "runs insert" on public.level_runs for insert to authenticated with check (user_id = auth.uid());
create index level_runs_user_idx on public.level_runs (user_id, at desc);

create table public.checkpoints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  domain text not null,
  at_level integer not null,
  accuracy integer not null,
  gameplay_accuracy integer not null,
  consistency integer not null,
  at timestamptz not null default now()
);
grant select, insert on public.checkpoints to authenticated;
grant all on public.checkpoints to service_role;
alter table public.checkpoints enable row level security;
create policy "cp read" on public.checkpoints for select to authenticated using (public.can_view_student(user_id));
create policy "cp insert" on public.checkpoints for insert to authenticated with check (user_id = auth.uid());

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  domains jsonb not null,
  overall text not null,
  summary_text text not null,
  total_attempts integer not null default 0,
  created_at timestamptz not null default now()
);
grant select, insert on public.reports to authenticated;
grant all on public.reports to service_role;
alter table public.reports enable row level security;
create policy "reports read" on public.reports for select to authenticated using (public.can_view_student(user_id));
create policy "reports insert" on public.reports for insert to authenticated with check (user_id = auth.uid());

create table public.case_notes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  author text not null default '',
  action text not null,
  note text not null default '',
  at timestamptz not null default now()
);
grant select, insert on public.case_notes to authenticated;
grant all on public.case_notes to service_role;
alter table public.case_notes enable row level security;
create policy "notes read" on public.case_notes for select to authenticated using (public.can_view_student(student_id));
create policy "notes insert" on public.case_notes for insert to authenticated
  with check (public.is_staff(auth.uid()) and public.can_view_student(student_id));

create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  message text not null default '',
  contact_preference text not null default 'email',
  status text not null default 'new',
  email_status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.referrals to authenticated;
grant all on public.referrals to service_role;
alter table public.referrals enable row level security;
create policy "referrals read" on public.referrals for select to authenticated using (public.can_view_student(student_id));
create policy "referrals insert" on public.referrals for insert to authenticated with check (student_id = auth.uid());
create policy "referrals staff update" on public.referrals for update to authenticated
  using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  actor text not null default '',
  action text not null,
  at timestamptz not null default now()
);
grant select, insert on public.audit_log to authenticated;
grant all on public.audit_log to service_role;
alter table public.audit_log enable row level security;
create policy "audit read staff" on public.audit_log for select to authenticated using (public.is_staff(auth.uid()));
create policy "audit insert" on public.audit_log for insert to authenticated with check (actor_id = auth.uid());

create table public.game_settings (
  domain text primary key,
  enabled boolean not null default true
);
grant select on public.game_settings to authenticated;
grant select, insert, update on public.game_settings to authenticated;
grant all on public.game_settings to service_role;
alter table public.game_settings enable row level security;
create policy "games read" on public.game_settings for select to authenticated using (true);
create policy "games admin write" on public.game_settings for update to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

insert into public.game_settings (domain, enabled) values
  ('number', true), ('word', true), ('memory', true),
  ('reading', true), ('logic', true), ('attention', true);

-- new user bootstrap
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, email, student_number, faculty, year_of_study, consent_share)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    coalesce(new.email,''),
    new.raw_user_meta_data->>'student_number',
    new.raw_user_meta_data->>'faculty',
    new.raw_user_meta_data->>'year_of_study',
    coalesce((new.raw_user_meta_data->>'consent_share')::boolean, false)
  ) on conflict (id) do nothing;

  insert into public.user_roles (user_id, role) values (new.id, 'student')
  on conflict do nothing;

  insert into public.progress (user_id, levels) values (new.id, '{}'::jsonb)
  on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();