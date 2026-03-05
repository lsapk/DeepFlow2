-- Unified Premium/AI credits + sync/offline schema updates

create extension if not exists "pgcrypto";

create table if not exists public.subscribers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  stripe_customer_id text,
  subscribed boolean not null default false,
  subscription_tier text not null default 'basic',
  subscription_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_credits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  credits integer not null default 0,
  last_updated timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(user_id)
);

alter table public.tasks add column if not exists google_task_id text;
alter table public.tasks add column if not exists offline_id text;
alter table public.tasks add column if not exists synced_at timestamptz;

alter table public.subtasks add column if not exists description text;
alter table public.subtasks add column if not exists priority text;

alter table public.subobjectives add column if not exists sort_order integer default 0;
alter table public.subobjectives add column if not exists completed boolean default false;

alter table public.user_profiles add column if not exists updated_at timestamptz default now();

alter table public.user_settings add column if not exists dark_mode boolean default true;
alter table public.user_settings add column if not exists karma_points integer default 0;
alter table public.user_settings add column if not exists unlocked_features jsonb default '{}'::jsonb;
alter table public.user_settings add column if not exists gemini_api_key text;
alter table public.user_settings add column if not exists created_at timestamptz default now();
alter table public.user_settings add column if not exists updated_at timestamptz default now();

alter table public.subscribers enable row level security;
alter table public.ai_credits enable row level security;

-- Subscribers RLS
create policy if not exists "Admins can manage subscriptions"
on public.subscribers for all
using (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'))
with check (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'));

create policy if not exists "Users can read own subscriptions"
on public.subscribers for select
using (auth.uid() = user_id);

create policy if not exists "Users can update own subscriptions"
on public.subscribers for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- AI credits RLS
create policy if not exists "Admins can manage ai credits"
on public.ai_credits for all
using (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'))
with check (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'));

create policy if not exists "Users can manage own ai credits"
on public.ai_credits for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
