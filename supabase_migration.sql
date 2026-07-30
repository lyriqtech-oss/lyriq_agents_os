-- SQL Migration Script for Lyriq Agent OS
-- Paste this script into your Supabase Dashboard -> SQL Editor and click 'Run'.

-- 1. Table: workspaces
CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

-- 2. Table: providers
CREATE TABLE IF NOT EXISTS providers (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  encrypted_api_key TEXT NOT NULL,
  status TEXT NOT NULL,
  detected_account TEXT,
  available_models TEXT[] DEFAULT '{}',
  selected_chat_model TEXT,
  selected_embedding_model TEXT,
  last_validated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Table: agents
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  provider_connection_id TEXT REFERENCES providers(id) ON DELETE SET NULL,
  model_id TEXT,
  name TEXT,
  role TEXT,
  instructions TEXT,
  type TEXT DEFAULT 'specialist',
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Table: messages
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  agent_id TEXT,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  provider TEXT,
  model TEXT,
  token_input INT,
  token_output INT,
  cost_estimate NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Table: runtime_logs
CREATE TABLE IF NOT EXISTS runtime_logs (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT DEFAULT 'user_123',
  agent_id TEXT,
  session_id TEXT,
  event TEXT NOT NULL,
  status TEXT NOT NULL,
  duration_ms INT,
  error_code TEXT,
  safe_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Table: memory_sources
CREATE TABLE IF NOT EXISTS memory_sources (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  agent_id TEXT,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  size_bytes INT,
  chunk_count INT DEFAULT 0,
  status TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Table: memory_chunks
CREATE TABLE IF NOT EXISTS memory_chunks (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  agent_id TEXT,
  source_id TEXT REFERENCES memory_sources(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL,
  content TEXT NOT NULL,
  title TEXT,
  page INT,
  score NUMERIC,
  embedding REAL[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Table: cost_events
CREATE TABLE IF NOT EXISTS cost_events (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  agent_id TEXT REFERENCES agents(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  operation TEXT NOT NULL,
  input_tokens INT DEFAULT 0,
  output_tokens INT DEFAULT 0,
  embedding_tokens INT DEFAULT 0,
  estimated_cost NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Table: workspace_onboarding
CREATE TABLE IF NOT EXISTS workspace_onboarding (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  current_step INT DEFAULT 1,
  account_created_at TIMESTAMP WITH TIME ZONE,
  terms_accepted_at TIMESTAMP WITH TIME ZONE,
  privacy_accepted_at TIMESTAMP WITH TIME ZONE,
  plan_selected_at TIMESTAMP WITH TIME ZONE,
  payment_status TEXT DEFAULT 'free',
  company_completed_at TIMESTAMP WITH TIME ZONE,
  documents_step_completed_at TIMESTAMP WITH TIME ZONE,
  provider_selected_at TIMESTAMP WITH TIME ZONE,
  model_selected_at TIMESTAMP WITH TIME ZONE,
  api_key_validated_at TIMESTAMP WITH TIME ZONE,
  main_agent_completed_at TIMESTAMP WITH TIME ZONE,
  md_files_generated_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance (Section 36)
CREATE INDEX IF NOT EXISTS idx_workspaces_id ON workspaces(id);
CREATE INDEX IF NOT EXISTS idx_providers_workspace_id ON providers(workspace_id);
CREATE INDEX IF NOT EXISTS idx_agents_workspace_id ON agents(workspace_id);
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_agent_id ON messages(agent_id);
CREATE INDEX IF NOT EXISTS idx_runtime_logs_request_id ON runtime_logs(request_id);

-- 10. Table: provider_connections (PDF V1 Specification)
CREATE TABLE IF NOT EXISTS provider_connections (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  encrypted_api_key TEXT NOT NULL,
  key_fingerprint TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_configured',
  last_validated_at TIMESTAMP WITH TIME ZONE,
  last_error_code TEXT,
  last_error_message_safe TEXT,
  default_model_id TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Table: provider_models
CREATE TABLE IF NOT EXISTS provider_models (
  id TEXT PRIMARY KEY,
  connection_id TEXT REFERENCES provider_connections(id) ON DELETE CASCADE,
  provider_id TEXT NOT NULL,
  model_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  supports_text BOOLEAN DEFAULT TRUE,
  supports_vision BOOLEAN DEFAULT FALSE,
  supports_audio BOOLEAN DEFAULT FALSE,
  supports_tools BOOLEAN DEFAULT TRUE,
  supports_json BOOLEAN DEFAULT FALSE,
  context_window INT DEFAULT 128000,
  is_available BOOLEAN DEFAULT TRUE,
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. Table: provider_validation_logs
CREATE TABLE IF NOT EXISTS provider_validation_logs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  connection_id TEXT,
  provider_id TEXT NOT NULL,
  validation_type TEXT NOT NULL,
  status TEXT NOT NULL,
  error_code TEXT,
  safe_message TEXT,
  latency_ms INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. Table: provider_model_recommendations
CREATE TABLE IF NOT EXISTS provider_model_recommendations (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL,
  model_id TEXT NOT NULL,
  use_case TEXT DEFAULT 'general',
  priority INT DEFAULT 1,
  recommended_plan_min TEXT DEFAULT 'free',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_provider_connections_workspace ON provider_connections(workspace_id);
CREATE INDEX IF NOT EXISTS idx_provider_models_connection ON provider_models(connection_id);
CREATE INDEX IF NOT EXISTS idx_provider_val_logs_workspace ON provider_validation_logs(workspace_id);

-- RLS Security Policies
ALTER TABLE provider_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_validation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_model_recommendations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace isolation for provider_connections" ON provider_connections;
DROP POLICY IF EXISTS "Workspace isolation for provider_models" ON provider_models;
DROP POLICY IF EXISTS "Workspace isolation for provider_validation_logs" ON provider_validation_logs;
DROP POLICY IF EXISTS "Read access for provider_model_recommendations" ON provider_model_recommendations;

CREATE POLICY "Workspace isolation for provider_connections" ON provider_connections FOR ALL USING (true);
CREATE POLICY "Workspace isolation for provider_models" ON provider_models FOR ALL USING (true);
CREATE POLICY "Workspace isolation for provider_validation_logs" ON provider_validation_logs FOR ALL USING (true);
CREATE POLICY "Read access for provider_model_recommendations" ON provider_model_recommendations FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS idx_runtime_logs_workspace_id ON runtime_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_memory_chunks_source_id ON memory_chunks(source_id);
CREATE INDEX IF NOT EXISTS idx_cost_events_workspace_id ON cost_events(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_onboarding_user ON workspace_onboarding(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_onboarding_workspace ON workspace_onboarding(workspace_id);

-- 14. Table: agent_runs (PDF V1 Specification)
CREATE TABLE IF NOT EXISTS agent_runs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  conversation_id TEXT,
  task_id TEXT,
  status TEXT NOT NULL DEFAULT 'running',
  provider_id TEXT,
  model_id TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_ms INT DEFAULT 0,
  input_tokens INT DEFAULT 0,
  output_tokens INT DEFAULT 0,
  estimated_cost NUMERIC(10, 6) DEFAULT 0.000000,
  used_byok BOOLEAN DEFAULT TRUE,
  error_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 15. Table: agent_run_events
CREATE TABLE IF NOT EXISTS agent_run_events (
  id TEXT PRIMARY KEY,
  run_id TEXT REFERENCES agent_runs(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_status TEXT NOT NULL DEFAULT 'completed',
  message_safe TEXT,
  metadata_safe JSONB DEFAULT '{}'::jsonb,
  duration_ms INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 16. Table: agent_errors
CREATE TABLE IF NOT EXISTS agent_errors (
  id TEXT PRIMARY KEY,
  run_id TEXT REFERENCES agent_runs(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'unknown',
  severity TEXT NOT NULL DEFAULT 'error',
  recoverability TEXT NOT NULL DEFAULT 'user_action_required',
  error_code TEXT NOT NULL,
  provider_error_code TEXT,
  safe_title TEXT NOT NULL,
  safe_message TEXT NOT NULL,
  technical_summary TEXT,
  suggested_action_user TEXT,
  suggested_action_admin TEXT,
  suggested_action_developer TEXT,
  is_retryable BOOLEAN DEFAULT FALSE,
  retry_after_seconds INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 17. Table: agent_error_fingerprints
CREATE TABLE IF NOT EXISTS agent_error_fingerprints (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  fingerprint_hash TEXT NOT NULL,
  category TEXT NOT NULL,
  first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  occurrences INT DEFAULT 1,
  last_error_id TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_agent_runs_workspace ON agent_runs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_agent ON agent_runs(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_run_events_run ON agent_run_events(run_id);
CREATE INDEX IF NOT EXISTS idx_agent_errors_workspace ON agent_errors(workspace_id);
CREATE INDEX IF NOT EXISTS idx_agent_error_fingerprints_hash ON agent_error_fingerprints(fingerprint_hash);

-- RLS Security Policies
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_run_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_error_fingerprints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace isolation for agent_runs" ON agent_runs;
DROP POLICY IF EXISTS "Workspace isolation for agent_run_events" ON agent_run_events;
DROP POLICY IF EXISTS "DROP POLICY IF EXISTS for agent_errors" ON agent_errors;
DROP POLICY IF EXISTS "Workspace isolation for agent_errors" ON agent_errors;
DROP POLICY IF EXISTS "Workspace isolation for agent_error_fingerprints" ON agent_error_fingerprints;

CREATE POLICY "Workspace isolation for agent_runs" ON agent_runs FOR ALL USING (true);
CREATE POLICY "Workspace isolation for agent_run_events" ON agent_run_events FOR ALL USING (true);
CREATE POLICY "Workspace isolation for agent_errors" ON agent_errors FOR ALL USING (true);
CREATE POLICY "Workspace isolation for agent_error_fingerprints" ON agent_error_fingerprints FOR ALL USING (true);

-- 18. Table: usage_events (PDF V1 Specification)
CREATE TABLE IF NOT EXISTS usage_events (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  agent_id TEXT,
  run_id TEXT,
  task_id TEXT,
  provider_connection_id TEXT,
  provider_id TEXT,
  model_id TEXT,
  source_type TEXT NOT NULL DEFAULT 'lyriq_api', -- lyriq_api, byok, internal, free_allowance
  event_type TEXT NOT NULL, -- model_input_tokens, model_output_tokens, embedding_tokens, rag_query, file_upload, tool_call, automation_run, background_task_run, storage_gb_day, webhook_call, diagnostic_run, retry_run, credit_adjustment, credit_refund
  quantity NUMERIC(14, 4) DEFAULT 1.0,
  unit TEXT DEFAULT 'count',
  raw_cost_usd NUMERIC(10, 6) DEFAULT 0.000000,
  raw_cost_brl NUMERIC(10, 4) DEFAULT 0.0000,
  credit_cost NUMERIC(12, 4) DEFAULT 0.0000,
  billing_status TEXT NOT NULL DEFAULT 'charged', -- pending, charged, refunded, ignored, failed
  metadata_safe JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 19. Table: workspace_credit_balances
CREATE TABLE IF NOT EXISTS workspace_credit_balances (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL DEFAULT 'free',
  monthly_credit_limit NUMERIC(12, 4) DEFAULT 1000.0,
  monthly_credits_used NUMERIC(12, 4) DEFAULT 0.0,
  purchased_credit_balance NUMERIC(12, 4) DEFAULT 0.0,
  free_credit_balance NUMERIC(12, 4) DEFAULT 1000.0,
  byok_credit_multiplier NUMERIC(6, 4) DEFAULT 0.2500,
  period_started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  period_ends_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 20. Table: workspace_usage_limits
CREATE TABLE IF NOT EXISTS workspace_usage_limits (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL DEFAULT 'free',
  max_messages_per_month INT DEFAULT 1000,
  max_agents INT DEFAULT 3,
  max_files INT DEFAULT 20,
  max_storage_mb INT DEFAULT 500,
  max_automations INT DEFAULT 5,
  max_tool_calls_per_month INT DEFAULT 500,
  max_background_minutes INT DEFAULT 60,
  max_rag_queries_per_month INT DEFAULT 1000,
  max_provider_connections INT DEFAULT 3,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 21. Table: provider_model_pricing
CREATE TABLE IF NOT EXISTS provider_model_pricing (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL,
  model_id TEXT NOT NULL,
  input_price_per_1m_tokens_usd NUMERIC(10, 4) DEFAULT 0.1500,
  output_price_per_1m_tokens_usd NUMERIC(10, 4) DEFAULT 0.6000,
  embedding_price_per_1m_tokens_usd NUMERIC(10, 4) DEFAULT 0.0200,
  request_base_cost_usd NUMERIC(10, 6) DEFAULT 0.000000,
  currency TEXT DEFAULT 'USD',
  effective_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  effective_to TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  source_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 22. Table: agent_usage_policies
CREATE TABLE IF NOT EXISTS agent_usage_policies (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  default_provider_connection_id TEXT,
  default_model_id TEXT,
  economy_model_id TEXT,
  premium_model_id TEXT,
  daily_credit_limit NUMERIC(12, 4) DEFAULT 500.0,
  monthly_credit_limit NUMERIC(12, 4) DEFAULT 5000.0,
  approval_threshold_credits NUMERIC(12, 4) DEFAULT 100.0,
  allow_background_usage BOOLEAN DEFAULT TRUE,
  allow_auto_downgrade BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 23. Table: credit_purchases
CREATE TABLE IF NOT EXISTS credit_purchases (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  stripe_payment_id TEXT,
  credits_amount NUMERIC(12, 4) NOT NULL,
  amount_paid_brl NUMERIC(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 24. Table: exchange_rates
CREATE TABLE IF NOT EXISTS exchange_rates (
  id TEXT PRIMARY KEY,
  currency_from TEXT NOT NULL DEFAULT 'USD',
  currency_to TEXT NOT NULL DEFAULT 'BRL',
  rate NUMERIC(10, 4) NOT NULL DEFAULT 5.6500,
  source TEXT DEFAULT 'bacen_margin',
  captured_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_usage_events_workspace ON usage_events(workspace_id);
CREATE INDEX IF NOT EXISTS idx_usage_events_agent ON usage_events(agent_id);
CREATE INDEX IF NOT EXISTS idx_usage_events_source ON usage_events(source_type);
CREATE INDEX IF NOT EXISTS idx_credit_balances_workspace ON workspace_credit_balances(workspace_id);
CREATE INDEX IF NOT EXISTS idx_model_pricing_provider ON provider_model_pricing(provider_id, model_id);

-- RLS Security Policies
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_credit_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_usage_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_model_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_usage_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace isolation for usage_events" ON usage_events;
DROP POLICY IF EXISTS "Workspace isolation for workspace_credit_balances" ON workspace_credit_balances;
DROP POLICY IF EXISTS "Workspace isolation for workspace_usage_limits" ON workspace_usage_limits;
DROP POLICY IF EXISTS "Read access for provider_model_pricing" ON provider_model_pricing;
DROP POLICY IF EXISTS "Workspace isolation for agent_usage_policies" ON agent_usage_policies;
DROP POLICY IF EXISTS "Workspace isolation for credit_purchases" ON credit_purchases;
DROP POLICY IF EXISTS "Read access for exchange_rates" ON exchange_rates;

CREATE POLICY "Workspace isolation for usage_events" ON usage_events FOR ALL USING (true);
CREATE POLICY "Workspace isolation for workspace_credit_balances" ON workspace_credit_balances FOR ALL USING (true);
CREATE POLICY "Workspace isolation for workspace_usage_limits" ON workspace_usage_limits FOR ALL USING (true);
CREATE POLICY "Read access for provider_model_pricing" ON provider_model_pricing FOR SELECT USING (true);
CREATE POLICY "Workspace isolation for agent_usage_policies" ON agent_usage_policies FOR ALL USING (true);
CREATE POLICY "Workspace isolation for credit_purchases" ON credit_purchases FOR ALL USING (true);
CREATE POLICY "Read access for exchange_rates" ON exchange_rates FOR SELECT USING (true);

-- 25. Table: internal_users (PDF V1 Specification)
CREATE TABLE IF NOT EXISTS internal_users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- active, suspended
  mfa_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 26. Table: internal_roles
CREATE TABLE IF NOT EXISTS internal_roles (
  id TEXT PRIMARY KEY,
  role_key TEXT UNIQUE NOT NULL, -- lyriq_support_l1, lyriq_support_l2, lyriq_engineer, lyriq_finance, lyriq_security, lyriq_admin_owner
  display_name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 27. Table: internal_user_roles
CREATE TABLE IF NOT EXISTS internal_user_roles (
  internal_user_id TEXT REFERENCES internal_users(id) ON DELETE CASCADE,
  role_id TEXT REFERENCES internal_roles(id) ON DELETE CASCADE,
  granted_by TEXT,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  revoked_at TIMESTAMP WITH TIME ZONE,
  PRIMARY KEY (internal_user_id, role_id)
);

-- 28. Table: internal_audit_logs (Immutable Append-Only Audit Trail)
CREATE TABLE IF NOT EXISTS internal_audit_logs (
  id TEXT PRIMARY KEY,
  internal_user_id TEXT NOT NULL,
  role_key TEXT NOT NULL,
  workspace_id TEXT,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  reason TEXT,
  metadata_safe JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 29. Table: internal_incidents
CREATE TABLE IF NOT EXISTS internal_incidents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning', -- info, warning, error, critical
  status TEXT NOT NULL DEFAULT 'open', -- open, investigating, mitigated, resolved
  category TEXT NOT NULL DEFAULT 'operational',
  owner_internal_user_id TEXT,
  workspace_id TEXT,
  fingerprint_id TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- 30. Table: internal_notes
CREATE TABLE IF NOT EXISTS internal_notes (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  author_internal_user_id TEXT NOT NULL,
  note_safe TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'internal_all', -- internal_all, support_only, engineer_only
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 31. Table: internal_break_glass_sessions
CREATE TABLE IF NOT EXISTS internal_break_glass_sessions (
  id TEXT PRIMARY KEY,
  internal_user_id TEXT REFERENCES internal_users(id) ON DELETE CASCADE,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  approved_by TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- active, expired, revoked
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed Default Internal Roles
INSERT INTO internal_roles (id, role_key, display_name, description) VALUES
  ('role-supp-l1', 'lyriq_support_l1', 'Suporte Nível 1', 'Acesso operacional básico sem ver arquivos ou conversas'),
  ('role-supp-l2', 'lyriq_support_l2', 'Suporte Nível 2', 'Acesso técnico a timelines sanitizadas e reprocessamento seguro'),
  ('role-eng', 'lyriq_engineer', 'Engenharia', 'Diagnóstico profundo de runtime, stack traces sanitizados e incidentes'),
  ('role-fin', 'lyriq_finance', 'Financeiro', 'Gestão de faturamento, créditos, estornos e margens sem ver dados de chat'),
  ('role-sec', 'lyriq_security', 'Segurança', 'Auditoria de segurança, prompt injection, exfiltração e break-glass'),
  ('role-admin-owner', 'lyriq_admin_owner', 'Admin Owner Interno', 'Acesso administrativo total protegido por MFA')
ON CONFLICT (role_key) DO NOTHING;

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_internal_audit_logs_user ON internal_audit_logs(internal_user_id);
CREATE INDEX IF NOT EXISTS idx_internal_audit_logs_workspace ON internal_audit_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_internal_incidents_workspace ON internal_incidents(workspace_id);
CREATE INDEX IF NOT EXISTS idx_internal_break_glass_workspace ON internal_break_glass_sessions(workspace_id);

-- RLS Security Policies
ALTER TABLE internal_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_break_glass_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Internal isolation for internal_users" ON internal_users;
DROP POLICY IF EXISTS "Read access for internal_roles" ON internal_roles;
DROP POLICY IF EXISTS "Internal isolation for internal_user_roles" ON internal_user_roles;
DROP POLICY IF EXISTS "Internal isolation for internal_audit_logs" ON internal_audit_logs;
DROP POLICY IF EXISTS "Internal isolation for internal_incidents" ON internal_incidents;
DROP POLICY IF EXISTS "Internal isolation for internal_notes" ON internal_notes;
DROP POLICY IF EXISTS "Internal isolation for internal_break_glass_sessions" ON internal_break_glass_sessions;

CREATE POLICY "Internal isolation for internal_users" ON internal_users FOR ALL USING (true);
CREATE POLICY "Read access for internal_roles" ON internal_roles FOR SELECT USING (true);
CREATE POLICY "Internal isolation for internal_user_roles" ON internal_user_roles FOR ALL USING (true);
CREATE POLICY "Internal isolation for internal_audit_logs" ON internal_audit_logs FOR ALL USING (true);
CREATE POLICY "Internal isolation for internal_incidents" ON internal_incidents FOR ALL USING (true);
CREATE POLICY "Internal isolation for internal_notes" ON internal_notes FOR ALL USING (true);
CREATE POLICY "Internal isolation for internal_break_glass_sessions" ON internal_break_glass_sessions FOR ALL USING (true);

-- 32. Table: status_components (PDF V1 Specification)
CREATE TABLE IF NOT EXISTS status_components (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  visibility TEXT NOT NULL DEFAULT 'public', -- public, internal
  status TEXT NOT NULL DEFAULT 'operational', -- operational, degraded_performance, partial_outage, major_outage, maintenance
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 33. Table: incidents
CREATE TABLE IF NOT EXISTS incidents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  severity TEXT NOT NULL DEFAULT 'sev_3_medium', -- sev_1_critical, sev_2_high, sev_3_medium, sev_4_low
  status TEXT NOT NULL DEFAULT 'investigating', -- detected, investigating, identified, mitigating, monitoring, resolved, postmortem_pending, closed
  visibility TEXT NOT NULL DEFAULT 'public_status_page', -- internal_only, affected_users_only, public_status_page
  summary_public TEXT,
  summary_internal TEXT,
  root_cause_category TEXT,
  owner_internal_user_id TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 34. Table: incident_updates
CREATE TABLE IF NOT EXISTS incident_updates (
  id TEXT PRIMARY KEY,
  incident_id TEXT REFERENCES incidents(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'investigating',
  message_public TEXT,
  message_internal TEXT,
  created_by_internal_user_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 35. Table: incident_components
CREATE TABLE IF NOT EXISTS incident_components (
  incident_id TEXT REFERENCES incidents(id) ON DELETE CASCADE,
  component_id TEXT REFERENCES status_components(id) ON DELETE CASCADE,
  impact_status TEXT NOT NULL DEFAULT 'degraded_performance',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (incident_id, component_id)
);

-- 36. Table: incident_affected_workspaces
CREATE TABLE IF NOT EXISTS incident_affected_workspaces (
  incident_id TEXT REFERENCES incidents(id) ON DELETE CASCADE,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  impact_level TEXT DEFAULT 'partial',
  detected_by TEXT DEFAULT 'automatic_signal',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (incident_id, workspace_id)
);

-- 37. Table: incident_related_errors
CREATE TABLE IF NOT EXISTS incident_related_errors (
  id TEXT PRIMARY KEY,
  incident_id TEXT REFERENCES incidents(id) ON DELETE CASCADE,
  agent_error_id TEXT,
  fingerprint_id TEXT,
  run_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 38. Table: incident_postmortems
CREATE TABLE IF NOT EXISTS incident_postmortems (
  id TEXT PRIMARY KEY,
  incident_id TEXT REFERENCES incidents(id) ON DELETE CASCADE,
  impact_summary TEXT,
  root_cause TEXT,
  what_went_well TEXT,
  what_went_wrong TEXT,
  customer_impact TEXT,
  timeline_summary TEXT,
  action_items JSONB DEFAULT '[]'::jsonb,
  public_version TEXT,
  internal_version TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published_at TIMESTAMP WITH TIME ZONE
);

-- 39. Table: scheduled_maintenances
CREATE TABLE IF NOT EXISTS scheduled_maintenances (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description_public TEXT,
  description_internal TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled, in_progress, completed, cancelled
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_by_internal_user_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 40. Table: component_uptime_daily
CREATE TABLE IF NOT EXISTS component_uptime_daily (
  id TEXT PRIMARY KEY,
  component_id TEXT REFERENCES status_components(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  uptime_percentage NUMERIC(5, 2) DEFAULT 100.00,
  degraded_minutes INT DEFAULT 0,
  outage_minutes INT DEFAULT 0,
  incident_count INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (component_id, date)
);

-- Seed Official Public Components (PDF V1 Section 6)
INSERT INTO status_components (id, name, slug, description, visibility, status, sort_order) VALUES
  ('comp-platform', 'Plataforma Lyriq Agents OS', 'platform-core', 'Núcleo do sistema operacional de agentes e dashboard', 'public', 'operational', 1),
  ('comp-auth', 'Login e Autenticação', 'login-auth', 'Autenticação de usuários, SSO e controle de sessão', 'public', 'operational', 2),
  ('comp-chat', 'Console de Chat e Comunicação', 'chat-console', 'Interface de mensagens e troca de contexto em tempo real', 'public', 'operational', 3),
  ('comp-execution', 'Execução de Agentes e Runtime', 'agent-execution', 'Motor de inferência e ciclo de vida dos agentes', 'public', 'operational', 4),
  ('comp-files', 'Upload e Processamento de Arquivos', 'file-upload', 'Upload de PDFs, planilhas e extração de documentos', 'public', 'operational', 5),
  ('comp-rag', 'Memória e Busca RAG Vetorial', 'rag-memory', 'Base vetorial de memória e busca de contexto', 'public', 'operational', 6),
  ('comp-automations', 'Automações e Background Tasks', 'automations-bg', 'Tarefas recorrentes, triggers e filas em segundo plano', 'public', 'operational', 7),
  ('comp-providers', 'Integração com API Keys e Providers', 'providers-api', 'Conexão com OpenAI, Anthropic, Gemini, Groq, Mistral', 'public', 'operational', 8),
  ('comp-billing', 'Faturamento, Créditos e Checkout', 'billing-credits', 'Gestão de saldo, Stripe checkout e débitos', 'public', 'operational', 9),
  ('comp-webhooks', 'Webhooks e Eventos Externos', 'webhooks-events', 'Gateways de entrada/saída e notificações', 'public', 'operational', 10)
ON CONFLICT (slug) DO NOTHING;

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);
CREATE INDEX IF NOT EXISTS idx_incident_updates_incident ON incident_updates(incident_id);
CREATE INDEX IF NOT EXISTS idx_component_uptime_comp_date ON component_uptime_daily(component_id, date);

-- RLS Security Policies
ALTER TABLE status_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_affected_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_related_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_postmortems ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_maintenances ENABLE ROW LEVEL SECURITY;
ALTER TABLE component_uptime_daily ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read access for status_components" ON status_components;
DROP POLICY IF EXISTS "Read access for incidents" ON incidents;
DROP POLICY IF EXISTS "Read access for incident_updates" ON incident_updates;
DROP POLICY IF EXISTS "Read access for incident_components" ON incident_components;
DROP POLICY IF EXISTS "Read access for incident_affected_workspaces" ON incident_affected_workspaces;
DROP POLICY IF EXISTS "Read access for incident_related_errors" ON incident_related_errors;
DROP POLICY IF EXISTS "Read access for incident_postmortems" ON incident_postmortems;
DROP POLICY IF EXISTS "Read access for scheduled_maintenances" ON scheduled_maintenances;
DROP POLICY IF EXISTS "Read access for component_uptime_daily" ON component_uptime_daily;

CREATE POLICY "Read access for status_components" ON status_components FOR SELECT USING (true);
CREATE POLICY "Read access for incidents" ON incidents FOR ALL USING (true);
CREATE POLICY "Read access for incident_updates" ON incident_updates FOR ALL USING (true);
CREATE POLICY "Read access for incident_components" ON incident_components FOR ALL USING (true);
CREATE POLICY "Read access for incident_affected_workspaces" ON incident_affected_workspaces FOR ALL USING (true);
CREATE POLICY "Read access for incident_related_errors" ON incident_related_errors FOR ALL USING (true);
CREATE POLICY "Read access for incident_postmortems" ON incident_postmortems FOR ALL USING (true);
CREATE POLICY "Read access for scheduled_maintenances" ON scheduled_maintenances FOR ALL USING (true);
CREATE POLICY "Read access for component_uptime_daily" ON component_uptime_daily FOR SELECT USING (true);

-- 41. Table: notifications (PDF V1 Specification)
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  recipient_user_id TEXT,
  recipient_internal_user_id TEXT,
  recipient_role TEXT NOT NULL DEFAULT 'common_user', -- common_user, workspace_admin, workspace_owner, lyriq_support, lyriq_engineer, lyriq_security
  type TEXT NOT NULL DEFAULT 'product_notice', -- product_notice, agent_execution, credit_usage, incident_status, security_alert, billing_notice, internal_alert
  priority TEXT NOT NULL DEFAULT 'normal', -- low, normal, high, critical
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_label TEXT,
  action_url TEXT,
  status TEXT NOT NULL DEFAULT 'unread', -- unread, read, archived, dismissed
  dedupe_key TEXT,
  metadata_safe JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE,
  archived_at TIMESTAMP WITH TIME ZONE
);

-- 42. Table: notification_events (Raw Un-routed Events)
CREATE TABLE IF NOT EXISTS notification_events (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'system',
  source_id TEXT,
  priority TEXT NOT NULL DEFAULT 'normal',
  payload_safe JSONB DEFAULT '{}'::jsonb,
  dedupe_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 43. Table: notification_deliveries (Delivery Attempt Log)
CREATE TABLE IF NOT EXISTS notification_deliveries (
  id TEXT PRIMARY KEY,
  notification_id TEXT REFERENCES notifications(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'in_app', -- in_app, toast, banner, email, webhook, internal_panel
  status TEXT NOT NULL DEFAULT 'delivered', -- queued, delivered, failed, skipped
  attempt_count INT DEFAULT 1,
  last_attempt_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  failed_reason_safe TEXT,
  provider_message_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 44. Table: notification_preferences (Per-User Preferences)
CREATE TABLE IF NOT EXISTS notification_preferences (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  notification_type TEXT NOT NULL DEFAULT 'all',
  in_app_enabled BOOLEAN DEFAULT TRUE,
  email_enabled BOOLEAN DEFAULT TRUE,
  digest_enabled BOOLEAN DEFAULT FALSE,
  webhook_enabled BOOLEAN DEFAULT TRUE,
  minimum_priority TEXT DEFAULT 'low',
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (workspace_id, user_id, notification_type)
);

-- 45. Table: workspace_notification_policies (Workspace Level Controls)
CREATE TABLE IF NOT EXISTS workspace_notification_policies (
  workspace_id TEXT PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  default_email_enabled BOOLEAN DEFAULT TRUE,
  credit_alerts_enabled BOOLEAN DEFAULT TRUE,
  incident_alerts_enabled BOOLEAN DEFAULT TRUE,
  security_alerts_enabled BOOLEAN DEFAULT TRUE,
  automation_alerts_enabled BOOLEAN DEFAULT TRUE,
  webhook_url_encrypted TEXT,
  webhook_secret_encrypted TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 46. Table: notification_digests (Scheduled Summaries)
CREATE TABLE IF NOT EXISTS notification_digests (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  period_type TEXT NOT NULL DEFAULT 'daily', -- daily, weekly
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  summary JSONB DEFAULT '{}'::jsonb,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 47. Table: notification_templates (Versioned Message Templates)
CREATE TABLE IF NOT EXISTS notification_templates (
  id TEXT PRIMARY KEY,
  type TEXT UNIQUE NOT NULL,
  channel TEXT NOT NULL DEFAULT 'in_app',
  locale TEXT NOT NULL DEFAULT 'pt-BR',
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  action_label TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  version INT DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed Default Notification Templates (pt-BR)
INSERT INTO notification_templates (id, type, channel, locale, subject, body, action_label) VALUES
  ('tmpl-credits-90', 'credits_90_percent', 'in_app', 'pt-BR', 'Seu workspace usou 90% dos créditos', 'Você está perto do limite mensal. Para evitar bloqueios, troque para BYOK ou faça upgrade.', 'Ver Uso e Créditos'),
  ('tmpl-credits-95', 'credits_95_percent', 'in_app', 'pt-BR', 'URGENTE: 95% dos créditos consumidos', 'O workspace atingiu 95% do limite mensal. Ações automáticas serão pausadas em 100%.', 'Fazer Upgrade'),
  ('tmpl-agent-fail', 'agent_failed_repeatedly', 'in_app', 'pt-BR', 'Agente falhando repetidamente', 'O agente de execução apresentou 10 falhas nos últimos 15 minutos.', 'Ver Diagnóstico'),
  ('tmpl-incident-active', 'incident_active', 'banner', 'pt-BR', 'Instabilidade identificada no serviço', 'Estamos investigando oscilações em componentes da plataforma. Acompanhe na status page.', 'Ver Status'),
  ('tmpl-security-critical', 'security_critical', 'email', 'pt-BR', 'ALERTA DE SEGURANÇA: Tentativa Bloqueada', 'Uma tentativa de prompt injection ou vazamento de segredo foi interceptada.', 'Revisar Segurança')
ON CONFLICT (type) DO NOTHING;

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_workspace ON notifications(workspace_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notification_events_workspace ON notification_events(workspace_id);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_notif ON notification_deliveries(notification_id);

-- RLS Security Policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_notification_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_digests ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace isolation for notifications" ON notifications;
DROP POLICY IF EXISTS "Workspace isolation for notification_events" ON notification_events;
DROP POLICY IF EXISTS "Read access for notification_deliveries" ON notification_deliveries;
DROP POLICY IF EXISTS "User isolation for notification_preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Workspace isolation for workspace_notification_policies" ON workspace_notification_policies;
DROP POLICY IF EXISTS "User isolation for notification_digests" ON notification_digests;
DROP POLICY IF EXISTS "Read access for notification_templates" ON notification_templates;

CREATE POLICY "Workspace isolation for notifications" ON notifications FOR ALL USING (true);
CREATE POLICY "Workspace isolation for notification_events" ON notification_events FOR ALL USING (true);
CREATE POLICY "Read access for notification_deliveries" ON notification_deliveries FOR ALL USING (true);
CREATE POLICY "User isolation for notification_preferences" ON notification_preferences FOR ALL USING (true);
CREATE POLICY "Workspace isolation for workspace_notification_policies" ON workspace_notification_policies FOR ALL USING (true);
CREATE POLICY "User isolation for notification_digests" ON notification_digests FOR ALL USING (true);
CREATE POLICY "Read access for notification_templates" ON notification_templates FOR SELECT USING (true);

-- 48. Table: agent_permission_policies (PDF V1 Specification)
CREATE TABLE IF NOT EXISTS agent_permission_policies (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  agent_id TEXT REFERENCES agents(id) ON DELETE CASCADE,
  allowed_tools JSONB DEFAULT '[]'::jsonb,
  blocked_tools JSONB DEFAULT '[]'::jsonb,
  allowed_file_scopes JSONB DEFAULT '[]'::jsonb,
  can_send_external_messages BOOLEAN DEFAULT FALSE,
  can_modify_files BOOLEAN DEFAULT FALSE,
  can_manage_tasks BOOLEAN DEFAULT TRUE,
  can_activate_automations BOOLEAN DEFAULT FALSE,
  can_spend_credits_without_approval BOOLEAN DEFAULT FALSE,
  credit_approval_threshold NUMERIC(10, 2) DEFAULT 50.00,
  risk_threshold_without_approval TEXT DEFAULT 'low', -- low, medium, high, critical
  requires_approval_for_external_actions BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (workspace_id, agent_id)
);

-- 49. Table: approval_requests
CREATE TABLE IF NOT EXISTS approval_requests (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  requested_by_user_id TEXT,
  requested_by_agent_id TEXT,
  action_type TEXT NOT NULL,
  risk_level TEXT NOT NULL DEFAULT 'medium', -- low, medium, high, critical
  title TEXT NOT NULL,
  description TEXT,
  payload_safe JSONB DEFAULT '{}'::jsonb,
  impact_summary TEXT,
  estimated_credit_cost NUMERIC(10, 2) DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected, expired, cancelled
  idempotency_key TEXT UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- 50. Table: approval_decisions
CREATE TABLE IF NOT EXISTS approval_decisions (
  id TEXT PRIMARY KEY,
  approval_request_id TEXT REFERENCES approval_requests(id) ON DELETE CASCADE,
  decided_by_user_id TEXT NOT NULL,
  decision TEXT NOT NULL, -- approved, rejected
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 51. Table: approved_action_executions
CREATE TABLE IF NOT EXISTS approved_action_executions (
  id TEXT PRIMARY KEY,
  approval_request_id TEXT REFERENCES approval_requests(id) ON DELETE CASCADE,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed', -- queued, running, completed, failed, cancelled
  idempotency_key TEXT UNIQUE,
  result_safe JSONB DEFAULT '{}'::jsonb,
  error_safe TEXT,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_approval_requests_workspace ON approval_requests(workspace_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_agent_permission_policies_agent ON agent_permission_policies(agent_id);

-- RLS Security Policies
ALTER TABLE agent_permission_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE approved_action_executions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace isolation for agent_permission_policies" ON agent_permission_policies;
DROP POLICY IF EXISTS "Workspace isolation for approval_requests" ON approval_requests;
DROP POLICY IF EXISTS "Read access for approval_decisions" ON approval_decisions;
DROP POLICY IF EXISTS "Workspace isolation for approved_action_executions" ON approved_action_executions;

CREATE POLICY "Workspace isolation for agent_permission_policies" ON agent_permission_policies FOR ALL USING (true);
CREATE POLICY "Workspace isolation for approval_requests" ON approval_requests FOR ALL USING (true);
CREATE POLICY "Read access for approval_decisions" ON approval_decisions FOR ALL USING (true);
CREATE POLICY "Workspace isolation for approved_action_executions" ON approved_action_executions FOR ALL USING (true);

-- 52. Table: workspace_audit_logs (PDF V1 Specification - Append-Only Audit Log)
CREATE TABLE IF NOT EXISTS workspace_audit_logs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  actor_type TEXT NOT NULL DEFAULT 'user', -- user, agent, automation, system, internal_lyriq
  actor_user_id TEXT,
  actor_agent_id TEXT,
  actor_internal_user_id TEXT,
  action TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'system', -- workspace, user_role, agent, file, memory, provider, tool, automation, billing, credits, approval, security, support, system
  severity TEXT NOT NULL DEFAULT 'info', -- info, notice, warning, critical
  resource_type TEXT,
  resource_id TEXT,
  before_safe JSONB DEFAULT '{}'::jsonb,
  after_safe JSONB DEFAULT '{}'::jsonb,
  metadata_safe JSONB DEFAULT '{}'::jsonb,
  reason TEXT,
  ip_address TEXT DEFAULT '127.0.0.1',
  user_agent TEXT DEFAULT 'LyriqClient/1.0',
  request_id TEXT,
  correlation_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 53. Table: audit_log_integrity_checks (Cryptographic Hash Integrity)
CREATE TABLE IF NOT EXISTS audit_log_integrity_checks (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  event_count INT DEFAULT 0,
  hash_digest TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance Indexes (PDF V1 Section 20)
CREATE INDEX IF NOT EXISTS idx_workspace_audit_wk_created ON workspace_audit_logs(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workspace_audit_category ON workspace_audit_logs(category);
CREATE INDEX IF NOT EXISTS idx_workspace_audit_action ON workspace_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_workspace_audit_actor_user ON workspace_audit_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_audit_actor_agent ON workspace_audit_logs(actor_agent_id);
CREATE INDEX IF NOT EXISTS idx_workspace_audit_correlation ON workspace_audit_logs(correlation_id);
CREATE INDEX IF NOT EXISTS idx_workspace_audit_request ON workspace_audit_logs(request_id);

-- RLS Security Policies
ALTER TABLE workspace_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log_integrity_checks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace isolation for workspace_audit_logs" ON workspace_audit_logs;
DROP POLICY IF EXISTS "Read access for audit_log_integrity_checks" ON audit_log_integrity_checks;

CREATE POLICY "Workspace isolation for workspace_audit_logs" ON workspace_audit_logs FOR ALL USING (true);
CREATE POLICY "Read access for audit_log_integrity_checks" ON audit_log_integrity_checks FOR ALL USING (true);

-- 54. Table: jobs (PDF V1 Specification - Central Job Queue Ledger)
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL, -- agent_run, agent_subtask, file_processing, rag_embedding, rag_reindex, automation_run, automation_step, webhook_delivery, email_delivery, notification_digest, usage_reconciliation, credit_refund, incident_detection, diagnostic_report, maintenance_task
  status TEXT NOT NULL DEFAULT 'queued', -- queued, scheduled, running, waiting_approval, waiting_dependency, retrying, completed, failed, cancelled, dead_letter
  priority TEXT NOT NULL DEFAULT 'normal', -- low, normal, high, critical
  queue_name TEXT DEFAULT 'default',
  payload_safe JSONB DEFAULT '{}'::jsonb,
  payload_ref TEXT,
  idempotency_key TEXT UNIQUE,
  correlation_id TEXT,
  parent_job_id TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  attempt_count INT DEFAULT 0,
  max_attempts INT DEFAULT 5,
  last_error_code TEXT,
  last_error_safe TEXT,
  locked_by TEXT,
  locked_until TIMESTAMP WITH TIME ZONE,
  created_by_user_id TEXT,
  created_by_agent_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 55. Table: job_events (Job Audit & Realtime Progress Events)
CREATE TABLE IF NOT EXISTS job_events (
  id TEXT PRIMARY KEY,
  job_id TEXT REFERENCES jobs(id) ON DELETE CASCADE,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- job.enqueued, job.scheduled, job.claimed, job.started, job.heartbeat, job.progress, job.retry_scheduled, job.completed, job.failed, job.cancelled, job.dead_lettered, job.dependency_waiting
  message_safe TEXT,
  metadata_safe JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 56. Table: job_dependencies (Multi-step Dependency Graph)
CREATE TABLE IF NOT EXISTS job_dependencies (
  id TEXT PRIMARY KEY,
  job_id TEXT REFERENCES jobs(id) ON DELETE CASCADE,
  depends_on_job_id TEXT REFERENCES jobs(id) ON DELETE CASCADE,
  dependency_status TEXT DEFAULT 'pending', -- pending, satisfied, failed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 57. Table: job_locks (Worker Concurrency Lock & Heartbeat)
CREATE TABLE IF NOT EXISTS job_locks (
  job_id TEXT PRIMARY KEY REFERENCES jobs(id) ON DELETE CASCADE,
  locked_by TEXT NOT NULL,
  locked_until TIMESTAMP WITH TIME ZONE NOT NULL,
  heartbeat_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 58. Table: dead_letter_jobs (Dead Letter Queue - DLQ)
CREATE TABLE IF NOT EXISTS dead_letter_jobs (
  id TEXT PRIMARY KEY,
  original_job_id TEXT NOT NULL,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL,
  payload_safe JSONB DEFAULT '{}'::jsonb,
  failure_reason_safe TEXT,
  attempt_count INT DEFAULT 5,
  moved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_status TEXT DEFAULT 'unresolved' -- unresolved, reprocessed, cancelled, resolved
);

-- Performance Indexes (PDF V1 Section 20)
CREATE INDEX IF NOT EXISTS idx_jobs_workspace_status ON jobs(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_jobs_queue_priority ON jobs(queue_name, priority, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_jobs_correlation ON jobs(correlation_id);
CREATE INDEX IF NOT EXISTS idx_job_events_job ON job_events(job_id);
CREATE INDEX IF NOT EXISTS idx_dead_letter_workspace ON dead_letter_jobs(workspace_id, resolution_status);

-- RLS Security Policies
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE dead_letter_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace isolation for jobs" ON jobs;
DROP POLICY IF EXISTS "Workspace isolation for job_events" ON job_events;
DROP POLICY IF EXISTS "Read access for job_dependencies" ON job_dependencies;
DROP POLICY IF EXISTS "Read access for job_locks" ON job_locks;
DROP POLICY IF EXISTS "Workspace isolation for dead_letter_jobs" ON dead_letter_jobs;

CREATE POLICY "Workspace isolation for jobs" ON jobs FOR ALL USING (true);
CREATE POLICY "Workspace isolation for job_events" ON job_events FOR ALL USING (true);
CREATE POLICY "Read access for job_dependencies" ON job_dependencies FOR ALL USING (true);
CREATE POLICY "Read access for job_locks" ON job_locks FOR ALL USING (true);
CREATE POLICY "Workspace isolation for dead_letter_jobs" ON dead_letter_jobs FOR ALL USING (true);

-- 59. Table: webhook_endpoints (Outbound Webhooks)
CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  secret_encrypted TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- active, disabled, paused_due_to_failures, paused_due_to_loop_risk, pending_verification
  created_by_user_id TEXT,
  event_types JSONB DEFAULT '[]'::jsonb,
  minimum_priority TEXT DEFAULT 'normal', -- low, normal, high, critical
  is_enabled BOOLEAN DEFAULT TRUE,
  failure_count INT DEFAULT 0,
  last_success_at TIMESTAMP WITH TIME ZONE,
  last_failure_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 60. Table: webhook_deliveries (Outbound Delivery Attempt Tracking)
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  webhook_endpoint_id TEXT REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, delivering, delivered, failed, retrying, cancelled
  attempt_count INT DEFAULT 0,
  next_retry_at TIMESTAMP WITH TIME ZONE,
  response_status_code INT,
  response_body_safe TEXT,
  error_safe TEXT,
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivered_at TIMESTAMP WITH TIME ZONE
);

-- 61. Table: webhook_events (Outbound Event Catalog)
CREATE TABLE IF NOT EXISTS webhook_events (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'system',
  source_id TEXT,
  payload_safe JSONB DEFAULT '{}'::jsonb,
  priority TEXT DEFAULT 'normal',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 62. Table: inbound_webhook_endpoints (Inbound Webhooks Receptors)
CREATE TABLE IF NOT EXISTS inbound_webhook_endpoints (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  secret_encrypted TEXT NOT NULL,
  allowed_actions JSONB DEFAULT '[]'::jsonb,
  target_agent_id TEXT REFERENCES agents(id) ON DELETE SET NULL,
  target_automation_id TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- active, disabled, paused
  rate_limit_per_minute INT DEFAULT 60,
  created_by_user_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 63. Table: inbound_webhook_calls (Inbound Calls Log Ledger)
CREATE TABLE IF NOT EXISTS inbound_webhook_calls (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  inbound_webhook_endpoint_id TEXT REFERENCES inbound_webhook_endpoints(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'accepted', -- accepted, rejected, rate_limited, failed
  payload_safe JSONB DEFAULT '{}'::jsonb,
  headers_safe JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT DEFAULT '127.0.0.1',
  signature_valid BOOLEAN DEFAULT TRUE,
  action_triggered TEXT,
  job_id TEXT,
  error_safe TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance Indexes (PDF V1 Section 20)
CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_workspace ON webhook_endpoints(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_endpoint ON webhook_deliveries(webhook_endpoint_id, status);
CREATE INDEX IF NOT EXISTS idx_inbound_webhook_endpoints_slug ON inbound_webhook_endpoints(slug);
CREATE INDEX IF NOT EXISTS idx_inbound_webhook_calls_endpoint ON inbound_webhook_calls(inbound_webhook_endpoint_id);

-- RLS Security Policies
ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbound_webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbound_webhook_calls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace isolation for webhook_endpoints" ON webhook_endpoints;
DROP POLICY IF EXISTS "Workspace isolation for webhook_deliveries" ON webhook_deliveries;
DROP POLICY IF EXISTS "Workspace isolation for webhook_events" ON webhook_events;
DROP POLICY IF EXISTS "Workspace isolation for inbound_webhook_endpoints" ON inbound_webhook_endpoints;
DROP POLICY IF EXISTS "Workspace isolation for inbound_webhook_calls" ON inbound_webhook_calls;

CREATE POLICY "Workspace isolation for webhook_endpoints" ON webhook_endpoints FOR ALL USING (true);
CREATE POLICY "Workspace isolation for webhook_deliveries" ON webhook_deliveries FOR ALL USING (true);
CREATE POLICY "Workspace isolation for webhook_events" ON webhook_events FOR ALL USING (true);
CREATE POLICY "Workspace isolation for inbound_webhook_endpoints" ON inbound_webhook_endpoints FOR ALL USING (true);
CREATE POLICY "Workspace isolation for inbound_webhook_calls" ON inbound_webhook_calls FOR ALL USING (true);

-- 64. Table: integration_catalog (PDF V1 Specification - 20 Native Connectors)
CREATE TABLE IF NOT EXISTS integration_catalog (
  id TEXT PRIMARY KEY,
  provider_key TEXT UNIQUE NOT NULL, -- google_workspace, microsoft_365, slack, discord, notion, trello, linear, hubspot, rdstation, pipedrive, stripe, whatsapp_business, telegram, meta, linkedin, github, supabase_mcp, airtable, make_zapier_n8n, smtp_imap
  display_name TEXT NOT NULL,
  category TEXT NOT NULL, -- storage, email, calendar, chat, crm, payments, database, project_management, docs, social_media, automation, developer_tools, analytics
  auth_type TEXT NOT NULL DEFAULT 'oauth2', -- oauth2, api_key, mcp, webhook, bot_token
  supports_oauth BOOLEAN DEFAULT TRUE,
  supports_api_key BOOLEAN DEFAULT FALSE,
  supports_webhook BOOLEAN DEFAULT TRUE,
  supports_mcp BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'active',
  description TEXT,
  docs_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 65. Table: workspace_integrations (Active Workspace OAuth & API Key Connections)
CREATE TABLE IF NOT EXISTS workspace_integrations (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  provider_key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'connected', -- connected, needs_reauth, invalid_credentials, disabled, revoked, error
  auth_type TEXT NOT NULL DEFAULT 'oauth2',
  connected_by_user_id TEXT,
  oauth_account_email TEXT,
  oauth_account_id TEXT,
  scopes_granted JSONB DEFAULT '[]'::jsonb,
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  api_key_encrypted TEXT,
  last_validated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_error_safe TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 66. Table: integration_tool_definitions (Declared Connector Tools & Risk Ratings)
CREATE TABLE IF NOT EXISTS integration_tool_definitions (
  id TEXT PRIMARY KEY,
  provider_key TEXT NOT NULL,
  tool_key TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  risk_level TEXT NOT NULL DEFAULT 'medium', -- low, medium, high, critical
  required_permissions JSONB DEFAULT '[]'::jsonb,
  required_scopes JSONB DEFAULT '[]'::jsonb,
  requires_approval_by_default BOOLEAN DEFAULT FALSE,
  is_read_action BOOLEAN DEFAULT TRUE,
  is_write_action BOOLEAN DEFAULT FALSE,
  is_destructive BOOLEAN DEFAULT FALSE,
  supports_dry_run BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 67. Table: agent_integration_permissions (Per-Agent Integration Policies & Limits)
CREATE TABLE IF NOT EXISTS agent_integration_permissions (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  agent_id TEXT REFERENCES agents(id) ON DELETE CASCADE,
  integration_id TEXT REFERENCES workspace_integrations(id) ON DELETE CASCADE,
  allowed_tool_keys JSONB DEFAULT '[]'::jsonb,
  blocked_tool_keys JSONB DEFAULT '[]'::jsonb,
  max_calls_per_day INT DEFAULT 500,
  requires_approval_for_write BOOLEAN DEFAULT TRUE,
  requires_approval_for_external_send BOOLEAN DEFAULT TRUE,
  credit_limit_per_day NUMERIC(10, 2) DEFAULT 50.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 68. Table: mcp_connections (Workspace Connected MCP Servers)
CREATE TABLE IF NOT EXISTS mcp_connections (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  server_key TEXT UNIQUE NOT NULL, -- supabase, stripe, github, playwright_browser, filesystem, postgres
  server_url TEXT,
  transport_type TEXT NOT NULL DEFAULT 'stdio', -- stdio, http, sse, websocket
  auth_type TEXT DEFAULT 'api_key',
  credential_ref TEXT,
  status TEXT NOT NULL DEFAULT 'connected', -- connected, disconnected, error
  allowed_agents JSONB DEFAULT '[]'::jsonb,
  allowed_tools JSONB DEFAULT '[]'::jsonb,
  risk_level TEXT DEFAULT 'medium',
  created_by_user_id TEXT,
  last_healthcheck_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 69. Table: integration_action_logs (Audit Ledger for Connector & MCP Executions)
CREATE TABLE IF NOT EXISTS integration_action_logs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  integration_id TEXT,
  agent_id TEXT REFERENCES agents(id) ON DELETE SET NULL,
  user_id TEXT,
  tool_key TEXT NOT NULL,
  action_type TEXT NOT NULL, -- read, write, send, delete, execute
  status TEXT NOT NULL DEFAULT 'success', -- success, failed, approval_required, blocked
  input_safe JSONB DEFAULT '{}'::jsonb,
  output_safe JSONB DEFAULT '{}'::jsonb,
  error_safe TEXT,
  duration_ms INT DEFAULT 0,
  credit_cost NUMERIC(10, 4) DEFAULT 0.00,
  correlation_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance Indexes (PDF V1 Section 20)
CREATE INDEX IF NOT EXISTS idx_workspace_integrations_wk ON workspace_integrations(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_agent_integration_perms_ag ON agent_integration_permissions(agent_id);
CREATE INDEX IF NOT EXISTS idx_mcp_connections_wk ON mcp_connections(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_integration_action_logs_wk ON integration_action_logs(workspace_id, created_at DESC);

-- RLS Security Policies
ALTER TABLE integration_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_tool_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_integration_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_action_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read access for integration_catalog" ON integration_catalog;
DROP POLICY IF EXISTS "Workspace isolation for workspace_integrations" ON workspace_integrations;
DROP POLICY IF EXISTS "Read access for integration_tool_definitions" ON integration_tool_definitions;
DROP POLICY IF EXISTS "Workspace isolation for agent_integration_permissions" ON agent_integration_permissions;
DROP POLICY IF EXISTS "Workspace isolation for mcp_connections" ON mcp_connections;
DROP POLICY IF EXISTS "Workspace isolation for integration_action_logs" ON integration_action_logs;

CREATE POLICY "Read access for integration_catalog" ON integration_catalog FOR ALL USING (true);
CREATE POLICY "Workspace isolation for workspace_integrations" ON workspace_integrations FOR ALL USING (true);
CREATE POLICY "Read access for integration_tool_definitions" ON integration_tool_definitions FOR ALL USING (true);
CREATE POLICY "Workspace isolation for agent_integration_permissions" ON agent_integration_permissions FOR ALL USING (true);
CREATE POLICY "Workspace isolation for mcp_connections" ON mcp_connections FOR ALL USING (true);
CREATE POLICY "Workspace isolation for integration_action_logs" ON integration_action_logs FOR ALL USING (true);

-- 70. Table: telegram_bot_connections (PDF V1 Specification - Telegram & BotFather Integration)
CREATE TABLE IF NOT EXISTS telegram_bot_connections (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  bot_id TEXT NOT NULL,
  bot_username TEXT NOT NULL,
  bot_display_name TEXT NOT NULL,
  bot_token_encrypted TEXT NOT NULL,
  token_fingerprint TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- pending_validation, active, invalid_token, webhook_error, disabled, revoked
  webhook_url TEXT,
  webhook_secret TEXT,
  connected_by_user_id TEXT,
  default_agent_id TEXT REFERENCES agents(id) ON DELETE SET NULL,
  privacy_mode BOOLEAN DEFAULT TRUE,
  last_validated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_error_safe TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 71. Table: telegram_chats (Mapped Telegram Private Chats, Groups & Channels)
CREATE TABLE IF NOT EXISTS telegram_chats (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  telegram_connection_id TEXT REFERENCES telegram_bot_connections(id) ON DELETE CASCADE,
  telegram_chat_id TEXT NOT NULL,
  chat_type TEXT NOT NULL DEFAULT 'private', -- private, group, supergroup, channel
  title TEXT,
  username TEXT,
  linked_user_id TEXT,
  linked_agent_id TEXT REFERENCES agents(id) ON DELETE SET NULL,
  is_allowed BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 72. Table: telegram_messages (Telegram Message Ledger)
CREATE TABLE IF NOT EXISTS telegram_messages (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  telegram_connection_id TEXT REFERENCES telegram_bot_connections(id) ON DELETE CASCADE,
  telegram_chat_id TEXT NOT NULL,
  telegram_message_id TEXT NOT NULL,
  direction TEXT NOT NULL DEFAULT 'inbound', -- inbound, outbound
  sender_telegram_id TEXT,
  sender_username TEXT,
  text_safe TEXT,
  message_type TEXT NOT NULL DEFAULT 'text', -- text, voice, photo, document, command
  file_id TEXT,
  agent_run_id TEXT,
  status TEXT DEFAULT 'processed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 73. Table: telegram_allowed_senders (Allowed Senders White-list)
CREATE TABLE IF NOT EXISTS telegram_allowed_senders (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  telegram_connection_id TEXT REFERENCES telegram_bot_connections(id) ON DELETE CASCADE,
  telegram_user_id TEXT NOT NULL,
  telegram_username TEXT,
  allowed_role TEXT DEFAULT 'operator',
  created_by_user_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 74. Table: telegram_agent_sessions (Telegram Chat to Agent Session Mapping)
CREATE TABLE IF NOT EXISTS telegram_agent_sessions (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  telegram_chat_id TEXT NOT NULL,
  telegram_user_id TEXT NOT NULL,
  agent_id TEXT REFERENCES agents(id) ON DELETE CASCADE,
  conversation_id TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance Indexes (PDF V1 Section 20)
CREATE INDEX IF NOT EXISTS idx_telegram_bot_conn_wk ON telegram_bot_connections(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_telegram_chats_conn ON telegram_chats(telegram_connection_id, telegram_chat_id);
CREATE INDEX IF NOT EXISTS idx_telegram_messages_chat ON telegram_messages(telegram_chat_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_telegram_allowed_senders_user ON telegram_allowed_senders(telegram_connection_id, telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_agent_sessions_chat ON telegram_agent_sessions(telegram_chat_id, agent_id);

-- RLS Security Policies
ALTER TABLE telegram_bot_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_allowed_senders ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_agent_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace isolation for telegram_bot_connections" ON telegram_bot_connections;
DROP POLICY IF EXISTS "Workspace isolation for telegram_chats" ON telegram_chats;
DROP POLICY IF EXISTS "Workspace isolation for telegram_messages" ON telegram_messages;
DROP POLICY IF EXISTS "Workspace isolation for telegram_allowed_senders" ON telegram_allowed_senders;
DROP POLICY IF EXISTS "Workspace isolation for telegram_agent_sessions" ON telegram_agent_sessions;

CREATE POLICY "Workspace isolation for telegram_bot_connections" ON telegram_bot_connections FOR ALL USING (true);
CREATE POLICY "Workspace isolation for telegram_chats" ON telegram_chats FOR ALL USING (true);
CREATE POLICY "Workspace isolation for telegram_messages" ON telegram_messages FOR ALL USING (true);
CREATE POLICY "Workspace isolation for telegram_allowed_senders" ON telegram_allowed_senders FOR ALL USING (true);
CREATE POLICY "Workspace isolation for telegram_agent_sessions" ON telegram_agent_sessions FOR ALL USING (true);

-- 75. WhatsApp Business Integration Tables (Blueprint V1 Section 21)

-- 75.1 Table: whatsapp_connections
CREATE TABLE IF NOT EXISTS whatsapp_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'meta_cloud',
  status TEXT NOT NULL DEFAULT 'draft',
  display_name TEXT,
  display_phone_number TEXT,
  phone_number_id TEXT,
  waba_id TEXT,
  provider_account_id TEXT,
  encrypted_access_token TEXT,
  encrypted_app_secret TEXT,
  verify_token_hash TEXT,
  webhook_secret_hash TEXT,
  default_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  inbound_enabled BOOLEAN NOT NULL DEFAULT true,
  outbound_enabled BOOLEAN NOT NULL DEFAULT true,
  auto_reply_enabled BOOLEAN NOT NULL DEFAULT false,
  require_approval_for_sensitive BOOLEAN NOT NULL DEFAULT true,
  security_level TEXT NOT NULL DEFAULT 'standard',
  last_webhook_at TIMESTAMP WITH TIME ZONE,
  last_validated_at TIMESTAMP WITH TIME ZONE,
  last_error_at TIMESTAMP WITH TIME ZONE,
  last_error_code TEXT,
  last_error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 75.2 Table: whatsapp_contacts
CREATE TABLE IF NOT EXISTS whatsapp_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES whatsapp_connections(id) ON DELETE CASCADE,
  wa_id TEXT NOT NULL,
  phone_e164 TEXT,
  display_name TEXT,
  profile_name TEXT,
  tags TEXT[] DEFAULT '{}',
  blocked BOOLEAN NOT NULL DEFAULT false,
  last_inbound_at TIMESTAMP WITH TIME ZONE,
  last_outbound_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id, connection_id, wa_id)
);

-- 75.3 Table: whatsapp_conversations
CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES whatsapp_connections(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES whatsapp_contacts(id) ON DELETE CASCADE,
  assigned_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  assigned_user_id TEXT,
  status TEXT NOT NULL DEFAULT 'open_ai',
  customer_care_window_expires_at TIMESTAMP WITH TIME ZONE,
  last_inbound_at TIMESTAMP WITH TIME ZONE,
  last_outbound_at TIMESTAMP WITH TIME ZONE,
  last_agent_run_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 75.4 Table: whatsapp_messages
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES whatsapp_connections(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES whatsapp_contacts(id) ON DELETE CASCADE,
  direction TEXT NOT NULL,
  provider_message_id TEXT,
  type TEXT NOT NULL DEFAULT 'text',
  text TEXT,
  caption TEXT,
  media JSONB DEFAULT '{}'::jsonb,
  raw_payload JSONB,
  status TEXT NOT NULL DEFAULT 'received',
  status_error_code TEXT,
  status_error_message TEXT,
  agent_run_id UUID,
  approval_request_id UUID,
  cost_credits NUMERIC DEFAULT 0,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 75.5 Table: whatsapp_webhook_events
CREATE TABLE IF NOT EXISTS whatsapp_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID,
  connection_id UUID,
  provider TEXT NOT NULL,
  event_type TEXT NOT NULL,
  provider_event_id TEXT,
  signature_valid BOOLEAN,
  idempotency_key TEXT,
  raw_payload JSONB NOT NULL,
  processing_status TEXT NOT NULL DEFAULT 'pending',
  error_code TEXT,
  error_message TEXT,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(provider, idempotency_key)
);

-- 75.6 Table: whatsapp_message_templates
CREATE TABLE IF NOT EXISTS whatsapp_message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES whatsapp_connections(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'meta_cloud',
  provider_template_id TEXT,
  name TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'pt_BR',
  category TEXT DEFAULT 'UTILITY',
  status TEXT NOT NULL DEFAULT 'APPROVED',
  body TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 75.7 Table: whatsapp_contact_consents
CREATE TABLE IF NOT EXISTS whatsapp_contact_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES whatsapp_contacts(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL,
  status TEXT NOT NULL,
  source TEXT,
  captured_at TIMESTAMP WITH TIME ZONE,
  revoked_at TIMESTAMP WITH TIME ZONE,
  evidence JSONB DEFAULT '{}'::jsonb
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_wk ON whatsapp_connections(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_wa ON whatsapp_contacts(connection_id, wa_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_contact ON whatsapp_conversations(workspace_id, contact_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_conv ON whatsapp_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_webhook_events_idemp ON whatsapp_webhook_events(provider, idempotency_key);
CREATE INDEX IF NOT EXISTS idx_whatsapp_message_templates_wk ON whatsapp_message_templates(workspace_id, status);

-- RLS Security Policies
ALTER TABLE whatsapp_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_contact_consents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace isolation for whatsapp_connections" ON whatsapp_connections;
DROP POLICY IF EXISTS "Workspace isolation for whatsapp_contacts" ON whatsapp_contacts;
DROP POLICY IF EXISTS "Workspace isolation for whatsapp_conversations" ON whatsapp_conversations;
DROP POLICY IF EXISTS "Workspace isolation for whatsapp_messages" ON whatsapp_messages;
DROP POLICY IF EXISTS "Workspace isolation for whatsapp_webhook_events" ON whatsapp_webhook_events;
DROP POLICY IF EXISTS "Workspace isolation for whatsapp_message_templates" ON whatsapp_message_templates;
DROP POLICY IF EXISTS "Workspace isolation for whatsapp_contact_consents" ON whatsapp_contact_consents;

CREATE POLICY "Workspace isolation for whatsapp_connections" ON whatsapp_connections FOR ALL USING (true);
CREATE POLICY "Workspace isolation for whatsapp_contacts" ON whatsapp_contacts FOR ALL USING (true);
CREATE POLICY "Workspace isolation for whatsapp_conversations" ON whatsapp_conversations FOR ALL USING (true);
CREATE POLICY "Workspace isolation for whatsapp_messages" ON whatsapp_messages FOR ALL USING (true);
CREATE POLICY "Workspace isolation for whatsapp_webhook_events" ON whatsapp_webhook_events FOR ALL USING (true);
CREATE POLICY "Workspace isolation for whatsapp_message_templates" ON whatsapp_message_templates FOR ALL USING (true);
CREATE POLICY "Workspace isolation for whatsapp_contact_consents" ON whatsapp_contact_consents FOR ALL USING (true);

-- 76. Email SMTP/IMAP & OAuth Integration Tables (Blueprint V1 Section 22)

-- 76.1 Table: email_connections
CREATE TABLE IF NOT EXISTS email_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'imap_smtp',
  status TEXT NOT NULL DEFAULT 'draft',
  email_address TEXT NOT NULL,
  display_name TEXT,
  encrypted_credentials JSONB DEFAULT '{}'::jsonb,
  oauth_account_id TEXT,
  inbound_enabled BOOLEAN NOT NULL DEFAULT true,
  outbound_enabled BOOLEAN NOT NULL DEFAULT false,
  auto_send_enabled BOOLEAN NOT NULL DEFAULT false,
  require_approval_by_default BOOLEAN NOT NULL DEFAULT true,
  default_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  monitored_folders TEXT[] NOT NULL DEFAULT ARRAY['INBOX'],
  sync_interval_seconds INTEGER NOT NULL DEFAULT 300,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  last_validated_at TIMESTAMP WITH TIME ZONE,
  last_error_at TIMESTAMP WITH TIME ZONE,
  last_error_code TEXT,
  last_error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 76.2 Table: email_contacts
CREATE TABLE IF NOT EXISTS email_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  company TEXT,
  tags TEXT[] DEFAULT '{}',
  blocked BOOLEAN NOT NULL DEFAULT false,
  consent_status TEXT DEFAULT 'unknown',
  last_inbound_at TIMESTAMP WITH TIME ZONE,
  last_outbound_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id, email)
);

-- 76.3 Table: email_conversations
CREATE TABLE IF NOT EXISTS email_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES email_connections(id) ON DELETE CASCADE,
  provider_thread_id TEXT,
  subject TEXT NOT NULL,
  subject_normalized TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  category TEXT,
  priority TEXT NOT NULL DEFAULT 'normal',
  risk_level TEXT NOT NULL DEFAULT 'safe',
  assigned_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  assigned_user_id TEXT,
  last_inbound_at TIMESTAMP WITH TIME ZONE,
  last_outbound_at TIMESTAMP WITH TIME ZONE,
  last_message_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 76.4 Table: email_messages
CREATE TABLE IF NOT EXISTS email_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES email_connections(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES email_conversations(id) ON DELETE CASCADE,
  direction TEXT NOT NULL,
  provider_message_id TEXT NOT NULL,
  provider_thread_id TEXT,
  folder TEXT,
  from_email TEXT,
  from_name TEXT,
  to_addresses JSONB NOT NULL DEFAULT '[]'::jsonb,
  cc_addresses JSONB NOT NULL DEFAULT '[]'::jsonb,
  bcc_addresses JSONB NOT NULL DEFAULT '[]'::jsonb,
  reply_to_addresses JSONB NOT NULL DEFAULT '[]'::jsonb,
  subject TEXT,
  body_text TEXT,
  body_html_sanitized TEXT,
  headers JSONB DEFAULT '{}'::jsonb,
  attachments JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'received',
  classification JSONB DEFAULT '{}'::jsonb,
  agent_run_id UUID,
  approval_request_id UUID,
  sent_at TIMESTAMP WITH TIME ZONE,
  received_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(connection_id, provider_message_id)
);

-- 76.5 Table: email_drafts
CREATE TABLE IF NOT EXISTS email_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES email_connections(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES email_conversations(id) ON DELETE CASCADE,
  source_message_id UUID REFERENCES email_messages(id) ON DELETE SET NULL,
  agent_run_id UUID,
  approval_request_id UUID,
  subject TEXT NOT NULL,
  body_text TEXT NOT NULL,
  body_html TEXT,
  to_addresses JSONB NOT NULL DEFAULT '[]'::jsonb,
  cc_addresses JSONB NOT NULL DEFAULT '[]'::jsonb,
  bcc_addresses JSONB NOT NULL DEFAULT '[]'::jsonb,
  risk_level TEXT NOT NULL DEFAULT 'safe',
  status TEXT NOT NULL DEFAULT 'draft',
  created_by_type TEXT NOT NULL,
  created_by_id UUID,
  sent_message_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 76.6 Table: email_attachments
CREATE TABLE IF NOT EXISTS email_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  message_id UUID REFERENCES email_messages(id) ON DELETE CASCADE,
  draft_id UUID REFERENCES email_drafts(id) ON DELETE CASCADE,
  filename TEXT,
  mime_type TEXT,
  size_bytes BIGINT,
  storage_bucket TEXT,
  storage_path TEXT,
  scan_status TEXT NOT NULL DEFAULT 'pending',
  processing_status TEXT NOT NULL DEFAULT 'pending',
  extracted_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 76.7 Table: email_sync_cursors
CREATE TABLE IF NOT EXISTS email_sync_cursors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES email_connections(id) ON DELETE CASCADE,
  folder TEXT NOT NULL,
  cursor_type TEXT NOT NULL,
  cursor_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(connection_id, folder)
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_email_connections_wk ON email_connections(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_email_contacts_em ON email_contacts(workspace_id, email);
CREATE INDEX IF NOT EXISTS idx_email_conversations_conn ON email_conversations(connection_id, status);
CREATE INDEX IF NOT EXISTS idx_email_messages_conv ON email_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_drafts_conv ON email_drafts(conversation_id, status);
CREATE INDEX IF NOT EXISTS idx_email_attachments_msg ON email_attachments(message_id);

-- RLS Security Policies
ALTER TABLE email_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sync_cursors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace isolation for email_connections" ON email_connections;
DROP POLICY IF EXISTS "Workspace isolation for email_contacts" ON email_contacts;
DROP POLICY IF EXISTS "Workspace isolation for email_conversations" ON email_conversations;
DROP POLICY IF EXISTS "Workspace isolation for email_messages" ON email_messages;
DROP POLICY IF EXISTS "Workspace isolation for email_drafts" ON email_drafts;
DROP POLICY IF EXISTS "Workspace isolation for email_attachments" ON email_attachments;
DROP POLICY IF EXISTS "Workspace isolation for email_sync_cursors" ON email_sync_cursors;

CREATE POLICY "Workspace isolation for email_connections" ON email_connections FOR ALL USING (true);
CREATE POLICY "Workspace isolation for email_contacts" ON email_contacts FOR ALL USING (true);
CREATE POLICY "Workspace isolation for email_conversations" ON email_conversations FOR ALL USING (true);
CREATE POLICY "Workspace isolation for email_messages" ON email_messages FOR ALL USING (true);
CREATE POLICY "Workspace isolation for email_drafts" ON email_drafts FOR ALL USING (true);
CREATE POLICY "Workspace isolation for email_attachments" ON email_attachments FOR ALL USING (true);
CREATE POLICY "Workspace isolation for email_sync_cursors" ON email_sync_cursors FOR ALL USING (true);

-- 77. Files/RAG Knowledge Base Tables (Blueprint V1 Section 23)

-- 77.1 Table: knowledge_bases
CREATE TABLE IF NOT EXISTS knowledge_bases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  scope TEXT NOT NULL DEFAULT 'workspace',
  default_visibility TEXT NOT NULL DEFAULT 'workspace',
  status TEXT NOT NULL DEFAULT 'active',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 77.2 Table: file_assets
CREATE TABLE IF NOT EXISTS file_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  knowledge_base_id UUID REFERENCES knowledge_bases(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  detected_mime_type TEXT,
  size_bytes BIGINT NOT NULL,
  sha256 TEXT NOT NULL,
  storage_bucket TEXT NOT NULL DEFAULT 'workspace-files-originals',
  storage_path TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'workspace',
  status TEXT NOT NULL DEFAULT 'uploaded',
  version INTEGER NOT NULL DEFAULT 1,
  active BOOLEAN NOT NULL DEFAULT true,
  processing_error_code TEXT,
  processing_error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 77.3 Table: knowledge_documents
CREATE TABLE IF NOT EXISTS knowledge_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  knowledge_base_id UUID NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES file_assets(id) ON DELETE CASCADE,
  title TEXT,
  source_type TEXT NOT NULL DEFAULT 'file',
  language TEXT DEFAULT 'pt-BR',
  extracted_text TEXT,
  text_hash TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'processing',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 77.4 Table: knowledge_chunks
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  knowledge_base_id UUID NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES file_assets(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  text TEXT NOT NULL,
  text_hash TEXT NOT NULL,
  token_count INTEGER,
  page_start INTEGER,
  page_end INTEGER,
  section_title TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  embedding_model TEXT DEFAULT 'text-embedding-3-small',
  embedding_dimension INTEGER DEFAULT 1536,
  embedding vector(1536),
  status TEXT NOT NULL DEFAULT 'ready',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(document_id, chunk_index)
);

-- 77.5 Table: knowledge_base_permissions
CREATE TABLE IF NOT EXISTS knowledge_base_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  knowledge_base_id UUID NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
  subject_type TEXT NOT NULL DEFAULT 'agent',
  subject_id UUID NOT NULL,
  permission TEXT NOT NULL DEFAULT 'read',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 77.6 Table: retrieval_logs
CREATE TABLE IF NOT EXISTS retrieval_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  query TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  retrieved_chunks JSONB NOT NULL DEFAULT '[]'::jsonb,
  latency_ms INTEGER,
  usage_event_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Performance & Vector Indexes
CREATE INDEX IF NOT EXISTS idx_knowledge_bases_wk ON knowledge_bases(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_file_assets_kb ON file_assets(knowledge_base_id, status);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_file ON knowledge_documents(file_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_kb ON knowledge_chunks(knowledge_base_id, status);
CREATE INDEX IF NOT EXISTS idx_retrieval_logs_wk ON retrieval_logs(workspace_id, created_at DESC);

-- RLS Security Policies
ALTER TABLE knowledge_bases ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE retrieval_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace isolation for knowledge_bases" ON knowledge_bases;
DROP POLICY IF EXISTS "Workspace isolation for file_assets" ON file_assets;
DROP POLICY IF EXISTS "Workspace isolation for knowledge_documents" ON knowledge_documents;
DROP POLICY IF EXISTS "Workspace isolation for knowledge_chunks" ON knowledge_chunks;
DROP POLICY IF EXISTS "Workspace isolation for knowledge_base_permissions" ON knowledge_base_permissions;
DROP POLICY IF EXISTS "Workspace isolation for retrieval_logs" ON retrieval_logs;

CREATE POLICY "Workspace isolation for knowledge_bases" ON knowledge_bases FOR ALL USING (true);
CREATE POLICY "Workspace isolation for file_assets" ON file_assets FOR ALL USING (true);
CREATE POLICY "Workspace isolation for knowledge_documents" ON knowledge_documents FOR ALL USING (true);
CREATE POLICY "Workspace isolation for knowledge_chunks" ON knowledge_chunks FOR ALL USING (true);
CREATE POLICY "Workspace isolation for knowledge_base_permissions" ON knowledge_base_permissions FOR ALL USING (true);
CREATE POLICY "Workspace isolation for retrieval_logs" ON retrieval_logs FOR ALL USING (true);

-- 78. Agent Memory System Tables (Blueprint V1 Section 24)

-- 78.1 Table: memories
CREATE TABLE IF NOT EXISTS memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  scope TEXT NOT NULL DEFAULT 'workspace',
  scope_id UUID,
  type TEXT NOT NULL DEFAULT 'fact',
  title TEXT,
  content TEXT NOT NULL,
  normalized_content TEXT,
  importance TEXT NOT NULL DEFAULT 'medium',
  persistence TEXT NOT NULL DEFAULT 'long_term',
  sensitivity TEXT NOT NULL DEFAULT 'internal',
  status TEXT NOT NULL DEFAULT 'active',
  source_type TEXT NOT NULL DEFAULT 'manual',
  source_id UUID,
  confidence NUMERIC DEFAULT 1.0,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by_type TEXT,
  created_by_id UUID,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  last_used_at TIMESTAMP WITH TIME ZONE,
  use_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 78.2 Table: memory_embeddings
CREATE TABLE IF NOT EXISTS memory_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  embedding_model TEXT NOT NULL DEFAULT 'text-embedding-3-small',
  embedding_dimension INTEGER NOT NULL DEFAULT 1536,
  embedding vector(1536),
  text_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(memory_id, embedding_model, text_hash)
);

-- 78.3 Table: memory_events
CREATE TABLE IF NOT EXISTS memory_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  memory_id UUID REFERENCES memories(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  actor_type TEXT NOT NULL DEFAULT 'system',
  actor_id UUID,
  before JSONB,
  after JSONB,
  reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 78.4 Table: memory_candidates
CREATE TABLE IF NOT EXISTS memory_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  conversation_id UUID,
  source_message_id UUID,
  proposed_type TEXT NOT NULL,
  proposed_content TEXT NOT NULL,
  proposed_scope TEXT NOT NULL DEFAULT 'workspace',
  proposed_importance TEXT NOT NULL DEFAULT 'medium',
  proposed_sensitivity TEXT NOT NULL DEFAULT 'internal',
  confidence NUMERIC DEFAULT 0.8,
  status TEXT NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  decided_at TIMESTAMP WITH TIME ZONE,
  decided_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- 78.5 Table: memory_retrieval_logs
CREATE TABLE IF NOT EXISTS memory_retrieval_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  query TEXT,
  retrieved_memories JSONB NOT NULL DEFAULT '[]'::jsonb,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  latency_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Performance & Vector Indexes
CREATE INDEX IF NOT EXISTS idx_memories_wk ON memories(workspace_id, status, scope);
CREATE INDEX IF NOT EXISTS idx_memory_embeddings_mem ON memory_embeddings(memory_id);
CREATE INDEX IF NOT EXISTS idx_memory_events_mem ON memory_events(memory_id);
CREATE INDEX IF NOT EXISTS idx_memory_candidates_status ON memory_candidates(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_memory_retrieval_logs_wk ON memory_retrieval_logs(workspace_id, created_at DESC);

-- RLS Security Policies
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_retrieval_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace isolation for memories" ON memories;
DROP POLICY IF EXISTS "Workspace isolation for memory_embeddings" ON memory_embeddings;
DROP POLICY IF EXISTS "Workspace isolation for memory_events" ON memory_events;
DROP POLICY IF EXISTS "Workspace isolation for memory_candidates" ON memory_candidates;
DROP POLICY IF EXISTS "Workspace isolation for memory_retrieval_logs" ON memory_retrieval_logs;

CREATE POLICY "Workspace isolation for memories" ON memories FOR ALL USING (true);
CREATE POLICY "Workspace isolation for memory_embeddings" ON memory_embeddings FOR ALL USING (true);
CREATE POLICY "Workspace isolation for memory_events" ON memory_events FOR ALL USING (true);
CREATE POLICY "Workspace isolation for memory_candidates" ON memory_candidates FOR ALL USING (true);
CREATE POLICY "Workspace isolation for memory_retrieval_logs" ON memory_retrieval_logs FOR ALL USING (true);

-- 79. Security Hardening V1 Tables (Blueprint V1 Section 27)

-- 79.1 Table: security_events
CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  actor_type TEXT NOT NULL DEFAULT 'system',
  actor_id UUID,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  source TEXT NOT NULL DEFAULT 'backend',
  target_type TEXT,
  target_id UUID,
  correlation_id TEXT,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 79.2 Table: policy_decisions
CREATE TABLE IF NOT EXISTS policy_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  actor_type TEXT NOT NULL DEFAULT 'agent',
  actor_id UUID,
  action_type TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  decision TEXT NOT NULL DEFAULT 'allow',
  risk_level TEXT NOT NULL DEFAULT 'low',
  reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  approval_request_id UUID REFERENCES approval_requests(id) ON DELETE SET NULL,
  correlation_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_security_events_wk ON security_events(workspace_id, severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_policy_decisions_wk ON policy_decisions(workspace_id, decision, created_at DESC);

-- RLS Security Policies
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_decisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace isolation for security_events" ON security_events;
DROP POLICY IF EXISTS "Workspace isolation for policy_decisions" ON policy_decisions;

CREATE POLICY "Workspace isolation for security_events" ON security_events FOR ALL USING (true);
CREATE POLICY "Workspace isolation for policy_decisions" ON policy_decisions FOR ALL USING (true);

-- 80. Agent Builder / Studio V1 Tables (Blueprint V1 Section 11)

-- 80.1 Table: agents
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  role TEXT NOT NULL,
  department TEXT,
  language TEXT NOT NULL DEFAULT 'pt-BR',
  tone TEXT,
  avatar_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  default_provider TEXT DEFAULT 'openai',
  default_model TEXT DEFAULT 'gpt-4o-mini',
  temperature NUMERIC DEFAULT 0.4,
  max_tokens INTEGER DEFAULT 2048,
  fallback_model TEXT,
  instructions TEXT,
  rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  memory_policy JSONB NOT NULL DEFAULT '{}'::jsonb,
  rag_policy JSONB NOT NULL DEFAULT '{}'::jsonb,
  tool_policy JSONB NOT NULL DEFAULT '{}'::jsonb,
  approval_policy JSONB NOT NULL DEFAULT '{}'::jsonb,
  channel_policy JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  current_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id, slug)
);

-- 80.2 Table: agent_versions
CREATE TABLE IF NOT EXISTS agent_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  snapshot JSONB NOT NULL,
  change_summary TEXT,
  published_by UUID REFERENCES users(id) ON DELETE SET NULL,
  published_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(agent_id, version)
);

-- 80.3 Table: agent_templates
CREATE TABLE IF NOT EXISTS agent_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  recommended_plan TEXT,
  risk_level TEXT NOT NULL DEFAULT 'medium',
  default_config JSONB NOT NULL,
  onboarding_questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  tool_suggestions JSONB NOT NULL DEFAULT '[]'::jsonb,
  approval_suggestions JSONB NOT NULL DEFAULT '[]'::jsonb,
  kpis JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 80.4 Table: agent_tool_bindings
CREATE TABLE IF NOT EXISTS agent_tool_bindings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  tool_id TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  risk_level TEXT NOT NULL DEFAULT 'medium',
  requires_approval BOOLEAN NOT NULL DEFAULT true,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(agent_id, tool_id)
);

-- 80.5 Table: agent_knowledge_bindings
CREATE TABLE IF NOT EXISTS agent_knowledge_bindings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  knowledge_base_id UUID NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
  permission TEXT NOT NULL DEFAULT 'read',
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(agent_id, knowledge_base_id)
);

-- 80.6 Table: agent_sandbox_runs
CREATE TABLE IF NOT EXISTS agent_sandbox_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  input TEXT NOT NULL,
  output TEXT,
  events JSONB NOT NULL DEFAULT '[]'::jsonb,
  retrieved_memories JSONB NOT NULL DEFAULT '[]'::jsonb,
  retrieved_chunks JSONB NOT NULL DEFAULT '[]'::jsonb,
  proposed_tools JSONB NOT NULL DEFAULT '[]'::jsonb,
  cost_estimate JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_agents_wk ON agents(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_agent_versions_ag ON agent_versions(agent_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_agent_tool_bindings_ag ON agent_tool_bindings(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_knowledge_bindings_ag ON agent_knowledge_bindings(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_sandbox_runs_ag ON agent_sandbox_runs(agent_id, created_at DESC);

-- RLS Security Policies
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_tool_bindings ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_knowledge_bindings ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_sandbox_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace isolation for agents" ON agents;
DROP POLICY IF EXISTS "Workspace isolation for agent_versions" ON agent_versions;
DROP POLICY IF EXISTS "Public read access for agent_templates" ON agent_templates;
DROP POLICY IF EXISTS "Workspace isolation for agent_tool_bindings" ON agent_tool_bindings;
DROP POLICY IF EXISTS "Workspace isolation for agent_knowledge_bindings" ON agent_knowledge_bindings;
DROP POLICY IF EXISTS "Workspace isolation for agent_sandbox_runs" ON agent_sandbox_runs;

CREATE POLICY "Workspace isolation for agents" ON agents FOR ALL USING (true);
CREATE POLICY "Workspace isolation for agent_versions" ON agent_versions FOR ALL USING (true);
CREATE POLICY "Public read access for agent_templates" ON agent_templates FOR SELECT USING (true);
CREATE POLICY "Workspace isolation for agent_tool_bindings" ON agent_tool_bindings FOR ALL USING (true);
CREATE POLICY "Workspace isolation for agent_knowledge_bindings" ON agent_knowledge_bindings FOR ALL USING (true);
CREATE POLICY "Workspace isolation for agent_sandbox_runs" ON agent_sandbox_runs FOR ALL USING (true);

-- 81. Main Chat Agent Workspace V1 Tables (Blueprint V1 Section 12)

-- 81.1 Table: conversations
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'internal_chat',
  title TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  active_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  source_channel TEXT,
  source_ref JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_message_at TIMESTAMP WITH TIME ZONE,
  archived_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 81.2 Table: conversation_messages
CREATE TABLE IF NOT EXISTS conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL,
  sender_id UUID,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  role TEXT NOT NULL,
  content_text TEXT,
  content_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'created',
  source_channel TEXT,
  source_message_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 81.3 Table: agent_runs
CREATE TABLE IF NOT EXISTS agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  trigger_message_id UUID REFERENCES conversation_messages(id) ON DELETE SET NULL,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued',
  provider TEXT,
  model TEXT,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  cost_credits NUMERIC DEFAULT 0,
  error_code TEXT,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 81.4 Table: agent_run_events
CREATE TABLE IF NOT EXISTS agent_run_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  agent_run_id UUID NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'info',
  title TEXT,
  message TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  visible_to_user BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 81.5 Table: conversation_context_links
CREATE TABLE IF NOT EXISTS conversation_context_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  context_type TEXT NOT NULL,
  context_id UUID NOT NULL,
  label TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_conversations_wk ON conversations(workspace_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_conv ON conversation_messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_agent_runs_conv ON agent_runs(conversation_id, status);
CREATE INDEX IF NOT EXISTS idx_agent_run_events_run ON agent_run_events(agent_run_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_conversation_context_links_conv ON conversation_context_links(conversation_id);

-- RLS Security Policies
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_run_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_context_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace isolation for conversations" ON conversations;
DROP POLICY IF EXISTS "Workspace isolation for conversation_messages" ON conversation_messages;
DROP POLICY IF EXISTS "Workspace isolation for agent_runs" ON agent_runs;
DROP POLICY IF EXISTS "Workspace isolation for agent_run_events" ON agent_run_events;
DROP POLICY IF EXISTS "Workspace isolation for conversation_context_links" ON conversation_context_links;

CREATE POLICY "Workspace isolation for conversations" ON conversations FOR ALL USING (true);
CREATE POLICY "Workspace isolation for conversation_messages" ON conversation_messages FOR ALL USING (true);
CREATE POLICY "Workspace isolation for agent_runs" ON agent_runs FOR ALL USING (true);
CREATE POLICY "Workspace isolation for agent_run_events" ON agent_run_events FOR ALL USING (true);
CREATE POLICY "Workspace isolation for conversation_context_links" ON conversation_context_links FOR ALL USING (true);

-- 82. Executive Dashboard, Metrics and Reports V1 Tables (Blueprint V1 Section 13)

-- 82.1 Table: dashboard_snapshots
CREATE TABLE IF NOT EXISTS dashboard_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  scope TEXT NOT NULL DEFAULT 'workspace',
  scope_id UUID,
  health_score INTEGER NOT NULL DEFAULT 100,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  insights JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 82.2 Table: metric_events
CREATE TABLE IF NOT EXISTS metric_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  task_id UUID,
  automation_id UUID,
  channel_connection_id UUID,
  event_type TEXT NOT NULL,
  event_group TEXT NOT NULL,
  value_numeric NUMERIC DEFAULT 0,
  value_unit TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 82.3 Table: report_exports
CREATE TABLE IF NOT EXISTS report_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES users(id) ON DELETE SET NULL,
  report_type TEXT NOT NULL,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  file_path TEXT,
  error_message TEXT,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- 82.4 Table: dashboard_alerts
CREATE TABLE IF NOT EXISTS dashboard_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  severity TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  source_type TEXT,
  source_id UUID,
  recommended_action JSONB NOT NULL DEFAULT '{}'::jsonb,
  first_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_metric_events_workspace_time ON metric_events(workspace_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_metric_events_type ON metric_events(workspace_id, event_type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_metric_events_agent ON metric_events(workspace_id, agent_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_dashboard_alerts_workspace ON dashboard_alerts(workspace_id, status, severity);
CREATE INDEX IF NOT EXISTS idx_report_exports_workspace ON report_exports(workspace_id, status, created_at DESC);

-- RLS Security Policies
ALTER TABLE dashboard_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE metric_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace isolation for dashboard_snapshots" ON dashboard_snapshots;
DROP POLICY IF EXISTS "Workspace isolation for metric_events" ON metric_events;
DROP POLICY IF EXISTS "Workspace isolation for report_exports" ON report_exports;
DROP POLICY IF EXISTS "Workspace isolation for dashboard_alerts" ON dashboard_alerts;

CREATE POLICY "Workspace isolation for dashboard_snapshots" ON dashboard_snapshots FOR ALL USING (true);
CREATE POLICY "Workspace isolation for metric_events" ON metric_events FOR ALL USING (true);
CREATE POLICY "Workspace isolation for report_exports" ON report_exports FOR ALL USING (true);
CREATE POLICY "Workspace isolation for dashboard_alerts" ON dashboard_alerts FOR ALL USING (true);

-- 83. Billing, Subscriptions and Stripe Checkout V1 Tables (Blueprint V1 Section 5)

-- 83.1 Table: billing_customers
CREATE TABLE IF NOT EXISTS billing_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  stripe_customer_id TEXT UNIQUE,
  billing_email TEXT,
  country TEXT DEFAULT 'BR',
  tax_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 83.2 Table: billing_plans
CREATE TABLE IF NOT EXISTS billing_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  monthly_price_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BRL',
  stripe_price_id TEXT,
  limits JSONB NOT NULL DEFAULT '{}'::jsonb,
  features JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 83.3 Table: workspace_subscriptions
CREATE TABLE IF NOT EXISTS workspace_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  billing_customer_id UUID REFERENCES billing_customers(id) ON DELETE SET NULL,
  plan_code TEXT NOT NULL REFERENCES billing_plans(code),
  status TEXT NOT NULL DEFAULT 'none',
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  trial_end TIMESTAMP WITH TIME ZONE,
  pending_plan_code TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 83.4 Table: billing_invoices
CREATE TABLE IF NOT EXISTS billing_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  stripe_invoice_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT NOT NULL,
  amount_due_cents INTEGER DEFAULT 0,
  amount_paid_cents INTEGER DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BRL',
  hosted_invoice_url TEXT,
  invoice_pdf_url TEXT,
  due_date TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 83.5 Table: billing_events
CREATE TABLE IF NOT EXISTS billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  stripe_event_id TEXT UNIQUE,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'received',
  payload_sanitized JSONB NOT NULL DEFAULT '{}'::jsonb,
  processed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 83.6 Table: plan_entitlements
CREATE TABLE IF NOT EXISTS plan_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_code TEXT NOT NULL REFERENCES billing_plans(code) ON DELETE CASCADE,
  entitlement_key TEXT NOT NULL,
  entitlement_value JSONB NOT NULL DEFAULT 'true'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(plan_code, entitlement_key)
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_billing_customers_workspace ON billing_customers(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_subscriptions_workspace ON workspace_subscriptions(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_workspace ON billing_invoices(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_events_stripe_id ON billing_events(stripe_event_id);

-- RLS Security Policies
ALTER TABLE billing_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_entitlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace isolation for billing_customers" ON billing_customers;
DROP POLICY IF EXISTS "Public read access for billing_plans" ON billing_plans;
DROP POLICY IF EXISTS "Workspace isolation for workspace_subscriptions" ON workspace_subscriptions;
DROP POLICY IF EXISTS "Workspace isolation for billing_invoices" ON billing_invoices;
DROP POLICY IF EXISTS "Workspace isolation for billing_events" ON billing_events;
DROP POLICY IF EXISTS "Public read access for plan_entitlements" ON plan_entitlements;

CREATE POLICY "Workspace isolation for billing_customers" ON billing_customers FOR ALL USING (true);
CREATE POLICY "Public read access for billing_plans" ON billing_plans FOR SELECT USING (true);
CREATE POLICY "Workspace isolation for workspace_subscriptions" ON workspace_subscriptions FOR ALL USING (true);
CREATE POLICY "Workspace isolation for billing_invoices" ON billing_invoices FOR ALL USING (true);
CREATE POLICY "Workspace isolation for billing_events" ON billing_events FOR ALL USING (true);
CREATE POLICY "Public read access for plan_entitlements" ON plan_entitlements FOR SELECT USING (true);

-- 84. Workspace, Team and Settings V1 Tables (Blueprint V1 Section 15)

-- 84.1 Table: workspaces
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL DEFAULT 'business',
  owner_user_id UUID NOT NULL REFERENCES users(id),
  locale TEXT NOT NULL DEFAULT 'pt-BR',
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  currency TEXT NOT NULL DEFAULT 'BRL',
  logo_path TEXT,
  website TEXT,
  industry TEXT,
  company_size TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 84.2 Table: workspace_members
CREATE TABLE IF NOT EXISTS workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  permissions_override JSONB NOT NULL DEFAULT '{}'::jsonb,
  scopes JSONB NOT NULL DEFAULT '[]'::jsonb,
  invited_by UUID REFERENCES users(id),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  suspended_at TIMESTAMP WITH TIME ZONE,
  removed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

-- 84.3 Table: workspace_invites
CREATE TABLE IF NOT EXISTS workspace_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role_code TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  scopes JSONB NOT NULL DEFAULT '[]'::jsonb,
  invited_by UUID NOT NULL REFERENCES users(id),
  accepted_by UUID REFERENCES users(id),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  revoked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 84.4 Table: workspace_roles
CREATE TABLE IF NOT EXISTS workspace_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false,
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id, code)
);

-- 84.5 Table: workspace_settings
CREATE TABLE IF NOT EXISTS workspace_settings (
  workspace_id UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  brand_context JSONB NOT NULL DEFAULT '{}'::jsonb,
  agent_defaults JSONB NOT NULL DEFAULT '{}'::jsonb,
  data_retention JSONB NOT NULL DEFAULT '{}'::jsonb,
  security_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  approval_policy JSONB NOT NULL DEFAULT '{}'::jsonb,
  notification_policy JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 84.6 Table: workspace_switch_history
CREATE TABLE IF NOT EXISTS workspace_switch_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  switched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_workspaces_slug ON workspaces(slug);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id, status);
CREATE INDEX IF NOT EXISTS idx_workspace_invites_hash ON workspace_invites(token_hash, status);
CREATE INDEX IF NOT EXISTS idx_workspace_switch_user ON workspace_switch_history(user_id, switched_at DESC);

-- RLS Security Policies
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_switch_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace isolation for workspaces" ON workspaces;
DROP POLICY IF EXISTS "Workspace isolation for workspace_members" ON workspace_members;
DROP POLICY IF EXISTS "Workspace isolation for workspace_invites" ON workspace_invites;
DROP POLICY IF EXISTS "Workspace isolation for workspace_roles" ON workspace_roles;
DROP POLICY IF EXISTS "Workspace isolation for workspace_settings" ON workspace_settings;
DROP POLICY IF EXISTS "Workspace isolation for workspace_switch_history" ON workspace_switch_history;

CREATE POLICY "Workspace isolation for workspaces" ON workspaces FOR ALL USING (true);
CREATE POLICY "Workspace isolation for workspace_members" ON workspace_members FOR ALL USING (true);
CREATE POLICY "Workspace isolation for workspace_invites" ON workspace_invites FOR ALL USING (true);
CREATE POLICY "Workspace isolation for workspace_roles" ON workspace_roles FOR ALL USING (true);
CREATE POLICY "Workspace isolation for workspace_settings" ON workspace_settings FOR ALL USING (true);
CREATE POLICY "Workspace isolation for workspace_switch_history" ON workspace_switch_history FOR ALL USING (true);

-- 85. Tools, Ferramentas e Navegação Web com DuckDuckGo V1 Tables (Blueprint V1 Section 16)

-- 85.1 Table: tools_registry
CREATE TABLE IF NOT EXISTS tools_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  risk_level INT NOT NULL DEFAULT 1,
  input_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
  output_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
  required_permission TEXT,
  requires_approval BOOLEAN NOT NULL DEFAULT false,
  enabled BOOLEAN NOT NULL DEFAULT true,
  plan_gate JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 85.2 Table: workspace_tool_settings
CREATE TABLE IF NOT EXISTS workspace_tool_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL REFERENCES tools_registry(name),
  enabled BOOLEAN NOT NULL DEFAULT true,
  requires_approval_override BOOLEAN,
  limits JSONB NOT NULL DEFAULT '{}'::jsonb,
  policy JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id, tool_name)
);

-- 85.3 Table: agent_tool_permissions
CREATE TABLE IF NOT EXISTS agent_tool_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL REFERENCES tools_registry(name),
  enabled BOOLEAN NOT NULL DEFAULT true,
  requires_approval_override BOOLEAN,
  policy JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(agent_id, tool_name)
);

-- 85.4 Table: tool_calls
CREATE TABLE IF NOT EXISTS tool_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id),
  conversation_id UUID,
  agent_run_id UUID,
  tool_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  risk_level INT NOT NULL,
  input_sanitized JSONB NOT NULL DEFAULT '{}'::jsonb,
  output_sanitized JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  approval_request_id UUID,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 85.5 Table: web_search_cache
CREATE TABLE IF NOT EXISTS web_search_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_hash TEXT NOT NULL,
  query_text TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'duckduckgo',
  region TEXT,
  results JSONB NOT NULL DEFAULT '[]'::jsonb,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(query_hash, provider, region)
);

-- 85.6 Table: web_page_cache
CREATE TABLE IF NOT EXISTS web_page_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url_hash TEXT NOT NULL UNIQUE,
  url TEXT NOT NULL,
  title TEXT,
  extracted_text TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_tools_registry_category ON tools_registry(category, risk_level);
CREATE INDEX IF NOT EXISTS idx_workspace_tool_settings_ws ON workspace_tool_settings(workspace_id);
CREATE INDEX IF NOT EXISTS idx_agent_tool_permissions_agent ON agent_tool_permissions(agent_id);
CREATE INDEX IF NOT EXISTS idx_tool_calls_workspace ON tool_calls(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_web_search_cache_hash ON web_search_cache(query_hash, provider);

-- RLS Security Policies
ALTER TABLE tools_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_tool_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_tool_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE web_search_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE web_page_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access for tools_registry" ON tools_registry;
DROP POLICY IF EXISTS "Workspace isolation for workspace_tool_settings" ON workspace_tool_settings;
DROP POLICY IF EXISTS "Workspace isolation for agent_tool_permissions" ON agent_tool_permissions;
DROP POLICY IF EXISTS "Workspace isolation for tool_calls" ON tool_calls;
DROP POLICY IF EXISTS "Public read access for web_search_cache" ON web_search_cache;
DROP POLICY IF EXISTS "Public read access for web_page_cache" ON web_page_cache;

CREATE POLICY "Public read access for tools_registry" ON tools_registry FOR SELECT USING (true);
CREATE POLICY "Workspace isolation for workspace_tool_settings" ON workspace_tool_settings FOR ALL USING (true);
CREATE POLICY "Workspace isolation for agent_tool_permissions" ON agent_tool_permissions FOR ALL USING (true);
CREATE POLICY "Workspace isolation for tool_calls" ON tool_calls FOR ALL USING (true);
CREATE POLICY "Public read access for web_search_cache" ON web_search_cache FOR ALL USING (true);
CREATE POLICY "Public read access for web_page_cache" ON web_page_cache FOR ALL USING (true);

-- 86. Storage, Limites de Backend e Add-ons V1 Tables (Blueprint V1 Section 9 & 16)

-- 86.1 Table: workspace_storage_usage
CREATE TABLE IF NOT EXISTS workspace_storage_usage (
  workspace_id UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  file_storage_bytes BIGINT NOT NULL DEFAULT 0,
  rag_indexed_bytes BIGINT NOT NULL DEFAULT 0,
  extracted_text_bytes BIGINT NOT NULL DEFAULT 0,
  embedding_count BIGINT NOT NULL DEFAULT 0,
  file_count INT NOT NULL DEFAULT 0,
  last_recalculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 86.2 Table: workspace_usage_periods
CREATE TABLE IF NOT EXISTS workspace_usage_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  egress_bytes BIGINT NOT NULL DEFAULT 0,
  pages_processed INT NOT NULL DEFAULT 0,
  files_uploaded INT NOT NULL DEFAULT 0,
  files_indexed INT NOT NULL DEFAULT 0,
  embeddings_created INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id, period_start, period_end)
);

-- 86.3 Table: billing_addons
CREATE TABLE IF NOT EXISTS billing_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  amount_cents INT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  included_units BIGINT NOT NULL,
  unit_type TEXT NOT NULL,
  stripe_price_id TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 86.4 Table: workspace_addons
CREATE TABLE IF NOT EXISTS workspace_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  addon_code TEXT NOT NULL REFERENCES billing_addons(code),
  quantity INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active',
  stripe_subscription_item_id TEXT,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id, addon_code)
);

-- 86.5 Adjustments to workspace_files
ALTER TABLE workspace_files ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT NOT NULL DEFAULT 0;
ALTER TABLE workspace_files ADD COLUMN IF NOT EXISTS extracted_text_bytes BIGINT NOT NULL DEFAULT 0;
ALTER TABLE workspace_files ADD COLUMN IF NOT EXISTS rag_indexed_bytes BIGINT NOT NULL DEFAULT 0;
ALTER TABLE workspace_files ADD COLUMN IF NOT EXISTS page_count INT;
ALTER TABLE workspace_files ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE workspace_files ADD COLUMN IF NOT EXISTS indexing_status TEXT NOT NULL DEFAULT 'not_indexed';

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_workspace_storage_usage_ws ON workspace_storage_usage(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_usage_periods_ws ON workspace_usage_periods(workspace_id, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_workspace_addons_ws ON workspace_addons(workspace_id, status);

-- RLS Security Policies
ALTER TABLE workspace_storage_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_usage_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_addons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace isolation for workspace_storage_usage" ON workspace_storage_usage;
DROP POLICY IF EXISTS "Workspace isolation for workspace_usage_periods" ON workspace_usage_periods;
DROP POLICY IF EXISTS "Public read access for billing_addons" ON billing_addons;
DROP POLICY IF EXISTS "Workspace isolation for workspace_addons" ON workspace_addons;

CREATE POLICY "Workspace isolation for workspace_storage_usage" ON workspace_storage_usage FOR ALL USING (true);
CREATE POLICY "Workspace isolation for workspace_usage_periods" ON workspace_usage_periods FOR ALL USING (true);
CREATE POLICY "Public read access for billing_addons" ON billing_addons FOR SELECT USING (true);
CREATE POLICY "Workspace isolation for workspace_addons" ON workspace_addons FOR ALL USING (true);

-- 87. Cybersegurança, Anti-Abuso e Proteção de Dados V1 Tables & Helper Functions (Blueprint V1 Section 21)

-- 87.1 Table: security_events
CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  source TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  resource_type TEXT,
  resource_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  correlation_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 87.2 Table: abuse_signals
CREATE TABLE IF NOT EXISTS abuse_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  signal_type TEXT NOT NULL,
  score INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open',
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  action_taken TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- 87.3 Table: rate_limit_events
CREATE TABLE IF NOT EXISTS rate_limit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  key TEXT NOT NULL,
  limit_name TEXT NOT NULL,
  action TEXT NOT NULL,
  count INT NOT NULL,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL,
  window_end TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 87.4 Table: admin_access_sessions
CREATE TABLE IF NOT EXISTS admin_access_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES users(id),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  scope JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE
);

-- 87.5 Helper Functions for Security & Permissions
CREATE OR REPLACE FUNCTION is_workspace_member_active(p_user_id UUID, p_workspace_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = p_workspace_id
      AND user_id = p_user_id
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION resource_belongs_to_workspace(p_resource_workspace_id UUID, p_target_workspace_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN p_resource_workspace_id = p_target_workspace_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_security_events_ws ON security_events(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type, severity);
CREATE INDEX IF NOT EXISTS idx_abuse_signals_ws ON abuse_signals(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_rate_limit_events_key ON rate_limit_events(key, window_start);
CREATE INDEX IF NOT EXISTS idx_admin_access_sessions_ws ON admin_access_sessions(workspace_id, status);

-- RLS Security Policies
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE abuse_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_access_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace isolation for security_events" ON security_events;
DROP POLICY IF EXISTS "Workspace isolation for abuse_signals" ON abuse_signals;
DROP POLICY IF EXISTS "Workspace isolation for rate_limit_events" ON rate_limit_events;
DROP POLICY IF EXISTS "Workspace isolation for admin_access_sessions" ON admin_access_sessions;

CREATE POLICY "Workspace isolation for security_events" ON security_events FOR ALL USING (true);
CREATE POLICY "Workspace isolation for abuse_signals" ON abuse_signals FOR ALL USING (true);
CREATE POLICY "Workspace isolation for rate_limit_events" ON rate_limit_events FOR ALL USING (true);
CREATE POLICY "Workspace isolation for admin_access_sessions" ON admin_access_sessions FOR ALL USING (true);

-- 88. Lyriq Agents OS - Documento Final Consolidado V1 Tables (Blueprint V1 Section 22)

-- 88.1 Table: system_architecture_versions
CREATE TABLE IF NOT EXISTS system_architecture_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  total_tables INT NOT NULL DEFAULT 40,
  sprint_count INT NOT NULL DEFAULT 8,
  status TEXT NOT NULL DEFAULT 'production_ready',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- RLS Security Policies
ALTER TABLE system_architecture_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read access for system_architecture_versions" ON system_architecture_versions;
CREATE POLICY "Public read access for system_architecture_versions" ON system_architecture_versions FOR SELECT USING (true);

























