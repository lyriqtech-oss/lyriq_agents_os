-- Migration: Lyriq Agents OS Official Agent Templates Library V1

create table if not exists public.agent_templates (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  category text not null,
  description text,
  minimum_plan text not null default 'pro',
  is_premium boolean not null default false,
  mission text not null,
  use_cases jsonb default '[]'::jsonb,
  anti_use_cases jsonb default '[]'::jsonb,
  base_prompt text not null,
  onboarding_questions jsonb default '[]'::jsonb,
  recommended_tools jsonb default '[]'::jsonb,
  recommended_skills jsonb default '[]'::jsonb,
  risk_level text check (risk_level in ('low', 'medium', 'high', 'critical')) default 'medium',
  autonomy_rules jsonb default '[]'::jsonb,
  approval_triggers jsonb default '[]'::jsonb,
  suggested_kpis jsonb default '[]'::jsonb,
  first_suggested_actions jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.agent_template_versions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.agent_templates(id) on delete cascade,
  version text not null default 'v1.0.0',
  changelog text,
  prompt_snapshot text not null,
  config_snapshot jsonb default '{}'::jsonb,
  active boolean default true,
  created_at timestamptz default now()
);

alter table public.agent_templates enable row level security;
alter table public.agent_template_versions enable row level security;

create policy "anyone_read_agent_templates" on public.agent_templates for select using (true);
create policy "anyone_read_agent_template_versions" on public.agent_template_versions for select using (true);
