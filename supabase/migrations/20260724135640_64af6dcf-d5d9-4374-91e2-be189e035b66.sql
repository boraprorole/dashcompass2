-- Create a table for app features toggle
create table if not exists public.app_features (
    key text primary key,
    label text not null,
    enabled boolean not null default true,
    updated_at timestamptz default now()
);

-- Grant access
grant select, update on public.app_features to authenticated;
grant all on public.app_features to service_role;

-- Enable RLS
alter table public.app_features enable row level security;

-- Policies
create policy "Allow all users to read features"
on public.app_features for select
to authenticated
using (true);

create policy "Allow admins to update features"
on public.app_features for update
to authenticated
using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'admin_global') or public.has_role(auth.uid(), 'admin_agencia'));

-- Initial data
insert into public.app_features (key, label, enabled)
values 
    ('/reports', 'Relatórios', true),
    ('/pr', 'PR & Clipping', true),
    ('/entregas', 'Entregas', true),
    ('/schedule', 'Cronograma', true),
    ('/demandas', 'Demandas', true),
    ('/conexoes', 'Conexões', true),
    ('/ai', 'Compass AI', true),
    ('/profile', 'Perfil', true)
on conflict (key) do nothing;
