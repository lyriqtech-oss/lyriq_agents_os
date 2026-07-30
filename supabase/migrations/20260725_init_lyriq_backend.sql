-- Migration: Lyriq Agents OS Backend Supabase Schema V1
-- Description: Multi-tenant schema with RLS, pgvector, storage buckets, audit logs, and provider credentials.

-- 1. Enable pgvector extension
create extension if not exists vector;

-- 2. Profiles (Public user metadata linked to auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  default_company_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. Companies (Multi-tenant workspaces)
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  owner_id uuid references auth.users(id),
  plan text default 'free',
  status text default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. Company Members (RBAC and Workspace Access)
create table if not exists public.company_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text check (role in ('owner', 'admin', 'manager', 'member', 'viewer')) default 'member',
  status text check (status in ('active', 'invited', 'suspended')) default 'active',
  created_at timestamptz default now(),
  unique (company_id, user_id)
);

-- 5. Agents
create table if not exists public.agents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  role_title text,
  description text,
  system_prompt text,
  tone text,
  status text default 'active',
  model_provider text default 'openai',
  model_name text default 'gpt-4o-mini',
  tools jsonb default '[]'::jsonb,
  permissions jsonb default '{}'::jsonb,
  memory_enabled boolean default true,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 6. Conversations
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  agent_id uuid references public.agents(id) on delete cascade,
  title text,
  status text default 'open',
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 7. Messages
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete cascade,
  agent_id uuid references public.agents(id),
  sender_type text check (sender_type in ('user', 'agent', 'system', 'tool')) not null,
  sender_user_id uuid references auth.users(id),
  content text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- 8. Files
create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  uploaded_by uuid references auth.users(id),
  bucket text default 'company-files',
  storage_path text not null,
  original_name text not null,
  mime_type text,
  size_bytes bigint,
  status text check (status in ('uploaded', 'processing', 'ready', 'failed')) default 'uploaded',
  extracted_text text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- 9. Memory Items (RAG Embeddings)
create table if not exists public.memory_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  agent_id uuid references public.agents(id),
  source_type text check (source_type in ('file', 'chat', 'manual', 'automation', 'system')),
  source_id uuid,
  title text,
  content text not null,
  embedding vector(1536),
  tags text[] default '{}',
  confidence numeric default 1.0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- HNSW Vector Index for fast cosine similarity search
create index if not exists memory_items_embedding_hnsw_idx 
  on public.memory_items using hnsw (embedding vector_cosine_ops);

-- pgvector cosine similarity search function (RPC)
create or replace function public.match_memory_items (
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  target_company_id uuid
)
returns table (
  id uuid,
  company_id uuid,
  agent_id uuid,
  title text,
  content text,
  similarity float
)
language sql stable
as $$
  select
    memory_items.id,
    memory_items.company_id,
    memory_items.agent_id,
    memory_items.title,
    memory_items.content,
    1 - (memory_items.embedding <=> query_embedding) as similarity
  from public.memory_items
  where memory_items.company_id = target_company_id
    and 1 - (memory_items.embedding <=> query_embedding) > match_threshold
  order by memory_items.embedding <=> query_embedding
  limit match_count;
$$;

-- 10. Tasks
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  agent_id uuid references public.agents(id),
  title text not null,
  description text,
  status text check (status in ('backlog', 'todo', 'in_progress', 'waiting', 'done', 'canceled')) default 'todo',
  priority text check (priority in ('low', 'medium', 'high', 'urgent')) default 'medium',
  due_at timestamptz,
  assigned_to uuid references auth.users(id),
  created_by uuid references auth.users(id),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 11. Automations
create table if not exists public.automations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  description text,
  trigger_type text not null,
  trigger_config jsonb default '{}'::jsonb,
  steps jsonb default '[]'::jsonb,
  status text check (status in ('draft', 'active', 'paused', 'archived')) default 'active',
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 12. Automation Runs
create table if not exists public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  automation_id uuid not null references public.automations(id) on delete cascade,
  status text check (status in ('queued', 'running', 'success', 'failed', 'canceled', 'waiting_approval')) default 'queued',
  input jsonb default '{}'::jsonb,
  output jsonb default '{}'::jsonb,
  error text,
  started_at timestamptz default now(),
  finished_at timestamptz,
  created_at timestamptz default now()
);

-- 13. Provider Credentials (BYOK Secret Vault)
create table if not exists public.provider_credentials (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  provider text not null,
  encrypted_secret text not null,
  masked_secret text not null,
  status text check (status in ('valid', 'invalid', 'revoked', 'untested')) default 'valid',
  last_validated_at timestamptz default now(),
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 14. Audit Logs
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  actor_user_id uuid references auth.users(id),
  actor_agent_id uuid references public.agents(id),
  action text not null,
  entity_type text,
  entity_id uuid,
  risk_level text check (risk_level in ('low', 'medium', 'high', 'critical')) default 'low',
  metadata jsonb default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz default now()
);

-- 15. Usage Events (Token, Credit & Cost Tracking)
create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid references auth.users(id),
  agent_id uuid references public.agents(id),
  event_type text not null,
  provider text,
  model text,
  input_tokens integer default 0,
  output_tokens integer default 0,
  estimated_cost numeric default 0,
  credits_used numeric default 0,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- RLS AUXILIARY FUNCTION
create or replace function public.is_company_member(target_company_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.company_members cm
    where cm.company_id = target_company_id
      and cm.user_id = auth.uid()
      and cm.status = 'active'
  );
$$;

-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.company_members enable row level security;
alter table public.agents enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.files enable row level security;
alter table public.memory_items enable row level security;
alter table public.tasks enable row level security;
alter table public.automations enable row level security;
alter table public.automation_runs enable row level security;
alter table public.provider_credentials enable row level security;
alter table public.audit_logs enable row level security;
alter table public.usage_events enable row level security;

-- CREATE RLS POLICIES
create policy "members_read_agents" on public.agents for select using (public.is_company_member(company_id));
create policy "members_read_tasks" on public.tasks for select using (public.is_company_member(company_id));
create policy "members_read_conversations" on public.conversations for select using (public.is_company_member(company_id));
create policy "members_read_messages" on public.messages for select using (public.is_company_member(company_id));
create policy "members_read_files" on public.files for select using (public.is_company_member(company_id));
create policy "members_read_automations" on public.automations for select using (public.is_company_member(company_id));
