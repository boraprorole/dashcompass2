
create table if not exists public.ai_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Nova conversa',
  provider text not null default 'anthropic',
  model text not null default 'claude-sonnet-4-5-20250929',
  mode text not null default 'general',
  report_id uuid references public.reports(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.ai_threads to authenticated;
grant all on public.ai_threads to service_role;

alter table public.ai_threads enable row level security;

create index if not exists ai_threads_user_updated_idx
  on public.ai_threads (user_id, updated_at desc);

create policy "Admins manage their own threads" on public.ai_threads
  for all using (
    auth.uid() = user_id and public.has_role(auth.uid(), 'admin')
  ) with check (
    auth.uid() = user_id and public.has_role(auth.uid(), 'admin')
  );

create table if not exists public.ai_messages (
  id uuid primary key,
  thread_id uuid not null references public.ai_threads(id) on delete cascade,
  role text not null check (role in ('user','assistant','system','tool')),
  parts jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.ai_messages to authenticated;
grant all on public.ai_messages to service_role;

alter table public.ai_messages enable row level security;

create index if not exists ai_messages_thread_created_idx
  on public.ai_messages (thread_id, created_at);

create policy "Admins manage messages in their own threads" on public.ai_messages
  for all using (
    exists (
      select 1 from public.ai_threads t
      where t.id = ai_messages.thread_id
        and t.user_id = auth.uid()
        and public.has_role(auth.uid(), 'admin')
    )
  ) with check (
    exists (
      select 1 from public.ai_threads t
      where t.id = ai_messages.thread_id
        and t.user_id = auth.uid()
        and public.has_role(auth.uid(), 'admin')
    )
  );

create or replace function public.tg_ai_threads_touch()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists ai_threads_touch on public.ai_threads;
create trigger ai_threads_touch
  before update on public.ai_threads
  for each row execute function public.tg_ai_threads_touch();
