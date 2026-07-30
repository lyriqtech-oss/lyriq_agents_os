-- Migration: Lyriq Agents OS Plan Limits & Upgrade Triggers V1

create table if not exists public.plan_limits (
  id uuid primary key default gen_random_uuid(),
  plan_key text unique not null,
  max_workspaces int not null default 1,
  max_users int not null default 1,
  max_agents int not null default 1,
  max_files int not null default 3,
  max_storage_mb int not null default 10,
  max_messages_month int not null default 50,
  max_skills int not null default 1,
  max_automations int not null default 0,
  max_tasks int not null default 10,
  log_retention_days int not null default 7,
  premium_templates boolean not null default false,
  premium_skills boolean not null default false,
  advanced_audit boolean not null default false,
  roi_dashboard_level text not null default 'basic',
  created_at timestamptz default now()
);

-- Insert 7 plan limit configurations
insert into public.plan_limits (plan_key, max_workspaces, max_users, max_agents, max_files, max_storage_mb, max_messages_month, max_skills, max_automations, max_tasks, log_retention_days, premium_templates, premium_skills, advanced_audit, roi_dashboard_level)
values
  ('free', 1, 1, 1, 3, 10, 50, 1, 0, 10, 7, false, false, false, 'none'),
  ('flash', 1, 1, 1, 20, 250, 500, 3, 0, 20, 14, false, false, false, 'basic'),
  ('pro', 1, 3, 3, 100, 2048, 2000, 10, 5, 100, 30, false, false, false, 'standard'),
  ('max_5x', 2, 5, 8, 500, 20480, 10000, 25, 25, 1000, 90, true, true, true, 'advanced'),
  ('max_20x', 5, 10, 20, 2000, 102400, 40000, 75, 100, 5000, 180, true, true, true, 'advanced'),
  ('business', 10, 25, 40, 10000, 512000, 100000, 200, 300, 20000, 365, true, true, true, 'enterprise'),
  ('enterprise', 999, 999, 999, 99999, 9999999, 9999999, 999, 9999, 999999, 3650, true, true, true, 'custom')
on conflict (plan_key) do update set
  max_workspaces = excluded.max_workspaces,
  max_users = excluded.max_users,
  max_agents = excluded.max_agents,
  max_files = excluded.max_files,
  max_storage_mb = excluded.max_storage_mb,
  max_messages_month = excluded.max_messages_month,
  max_skills = excluded.max_skills,
  max_automations = excluded.max_automations,
  max_tasks = excluded.max_tasks;

-- Upgrade Telemetry Events Table
create table if not exists public.upgrade_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  user_id uuid references auth.users(id),
  event_type text check (event_type in ('limit_reached', 'premium_feature_clicked', 'upgrade_modal_shown', 'upgrade_clicked', 'checkout_started', 'checkout_completed', 'churn_signal_detected', 'heavy_usage_detected', 'automation_suggestion_shown')) not null,
  limit_type text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table public.plan_limits enable row level security;
alter table public.upgrade_events enable row level security;

create policy "anyone_read_plan_limits" on public.plan_limits for select using (true);
create policy "members_read_upgrade_events" on public.upgrade_events for select using (public.is_company_member(company_id));
