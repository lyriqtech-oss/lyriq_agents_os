/**
 * Lyriq Agents OS - Consolidated Architecture & Master Specification V1 Service Module
 * Unifies all 40+ database tables, API contracts, Sprint 0-7 breakdown, security gates, and Master Implementation Prompt.
 */

export const CONSOLIDATED_TABLES_CATALOG = [
  // Core (5)
  { name: 'workspaces', category: 'Core', description: 'Empresas, equipes e escopos isolados de multi-tenancy.', rls: true },
  { name: 'workspace_members', category: 'Core', description: 'Membros e papeis (owner, admin, manager, member, viewer, billing_manager).', rls: true },
  { name: 'workspace_roles', category: 'Core', description: 'Papeis customizados e overrides de permissao.', rls: true },
  { name: 'workspace_settings', category: 'Core', description: 'Configuracoes de timezone, marca e politicas do workspace.', rls: true },
  { name: 'workspace_invites', category: 'Core', description: 'Convites por email com tokens HMAC SHA-256 e expiracao.', rls: true },

  // Billing & Limites (9)
  { name: 'billing_customers', category: 'Billing', description: 'Associacao de workspace a clientes Stripe.', rls: true },
  { name: 'billing_plans', category: 'Billing', description: 'Matriz de planos (Free, Flash, Pro, Max 5X, Max 20X, Business, Enterprise).', rls: false },
  { name: 'workspace_subscriptions', category: 'Billing', description: 'Assinaturas ativas no Stripe.', rls: true },
  { name: 'billing_invoices', category: 'Billing', description: 'Faturas e historicos de cobranca.', rls: true },
  { name: 'billing_events', category: 'Billing', description: 'Eventos idempotentes de webhooks do Stripe.', rls: true },
  { name: 'billing_addons', category: 'Billing', description: 'Add-ons recorrentes de storage, RAG e egress.', rls: false },
  { name: 'workspace_addons', category: 'Billing', description: 'Add-ons adquiridos e vinculados ao workspace.', rls: true },
  { name: 'usage_events', category: 'Billing', description: 'Eventos de consumo de tokens, RAG e creditos.', rls: true },
  { name: 'workspace_storage_usage', category: 'Billing', description: 'Consumo acumulado de File Storage, RAG e embeddings.', rls: true },
  { name: 'workspace_usage_periods', category: 'Billing', description: 'Consumo periodico de egress e uploads.', rls: true },

  // Agentes & Runtime (7)
  { name: 'agents', category: 'Agentes', description: 'Agentes de IA criados com instrucoes e modelos.', rls: true },
  { name: 'agent_versions', category: 'Agentes', description: 'Snapshot imutavel de versoes publicadas do agente.', rls: true },
  { name: 'conversations', category: 'Agentes', description: 'Sessoes de chat e historico de conversas.', rls: true },
  { name: 'messages', category: 'Agentes', description: 'Mensagens trocadas com agentes e evidencias.', rls: true },
  { name: 'agent_runs', category: 'Agentes', description: 'Execucoes autonomas de agentes e pipelines.', rls: true },
  { name: 'agent_run_events', category: 'Agentes', description: 'Eventos de progresso e observabilidade em tempo real.', rls: true },
  { name: 'agent_errors', category: 'Agentes', description: 'Diagnosticos de erros e falhas de runtime.', rls: true },

  // Arquivos, RAG e Memoria (7)
  { name: 'workspace_files', category: 'RAG & Memoria', description: 'Arquivos brutos no S3/Storage com tamanhos.', rls: true },
  { name: 'file_chunks', category: 'RAG & Memoria', description: 'Trechos de texto extraidos de documentos.', rls: true },
  { name: 'knowledge_chunks', category: 'RAG & Memoria', description: 'Base de conhecimento e texto limpo.', rls: true },
  { name: 'embeddings_metadata', category: 'RAG & Memoria', description: 'Vetores pgvector e metadados RAG.', rls: true },
  { name: 'agent_memories', category: 'RAG & Memoria', description: 'Memorias de longo prazo por agente.', rls: true },
  { name: 'workspace_memories', category: 'RAG & Memoria', description: 'Memorias compartilhadas do workspace.', rls: true },
  { name: 'memory_candidates', category: 'RAG & Memoria', description: 'Candidatos a memoria detectados para aprovacao.', rls: true },

  // Tools & Tarefas (7)
  { name: 'tools_registry', category: 'Tools & Tarefas', description: 'Registro global de ferramentas disponiveis.', rls: false },
  { name: 'workspace_tool_settings', category: 'Tools & Tarefas', description: 'Configuracoes de tools por workspace.', rls: true },
  { name: 'agent_tool_permissions', category: 'Tools & Tarefas', description: 'Permissoes de ferramentas concedidas a agentes.', rls: true },
  { name: 'tool_calls', category: 'Tools & Tarefas', description: 'Historico de chamadas de ferramentas e resultados.', rls: true },
  { name: 'tasks', category: 'Tools & Tarefas', description: 'Tarefas assincronas atribuidas a agentes.', rls: true },
  { name: 'task_events', category: 'Tools & Tarefas', description: 'Eventos de transicao de status da tarefa.', rls: true },
  { name: 'jobs', category: 'Tools & Tarefas', description: 'Fila de processamento em segundo plano.', rls: true },

  // Seguranca & Operacao (5)
  { name: 'workspace_audit_logs', category: 'Seguranca', description: 'Audit log de acoes operacionais.', rls: true },
  { name: 'security_events', category: 'Seguranca', description: 'Eventos de auditoria imutaveis e incidentes.', rls: true },
  { name: 'abuse_signals', category: 'Seguranca', description: 'Sinais de risco e scoring de abuso de capacidade.', rls: true },
  { name: 'rate_limit_events', category: 'Seguranca', description: 'Controle de throttling e limites por IP/usuario.', rls: true },
  { name: 'admin_access_sessions', category: 'Seguranca', description: 'Sessoes emergenciais Admin Break-Glass auditadas.', rls: true }
];

export const SPRINT_PLAN = [
  { sprint: 0, title: 'Sprint 0: Setup', duration: '3-5 dias', deliverables: ['Repositório', 'Next.js', 'Supabase', 'Tailwind', 'Stripe Test'], gate: 'Setup base funcionando sem erros.' },
  { sprint: 1, title: 'Sprint 1: Workspace/Auth', duration: '1 semana', deliverables: ['Auth', 'Workspace', 'Members', 'RLS', 'Settings'], gate: 'Usuário A não pode ler dados do Workspace B.' },
  { sprint: 2, title: 'Sprint 2: Billing/BYOK/Limits', duration: '1-2 semanas', deliverables: ['Plans', 'Stripe Checkout', 'BYOK Vault', 'PlanLimits', 'Storage/RAG Limits'], gate: 'Usuário não executa ação acima do plano.' },
  { sprint: 3, title: 'Sprint 3: Agents/Chat Runtime', duration: '2 semanas', deliverables: ['Agents', 'Chat', 'Agent Runs', 'Provider Adapters', 'Error Diagnostics'], gate: 'Usuário cria agente, conversa e vê custo do run.' },
  { sprint: 4, title: 'Sprint 4: Files/RAG/Memory', duration: '2 semanas', deliverables: ['Upload', 'Extraction', 'Chunking', 'Embeddings', 'Retrieval', 'Memory'], gate: 'Agente responde usando arquivo do workspace certo com citação.' },
  { sprint: 5, title: 'Sprint 5: Tools/Web/Tasks', duration: '1-2 semanas', deliverables: ['Tool Registry', 'DuckDuckGo', 'Web Fetch Seguro', 'SSRF Protection', 'Tasks'], gate: 'Agente pesquisa web, lê fontes e não obedece prompt injection.' },
  { sprint: 6, title: 'Sprint 6: Dashboard/Admin/Audit', duration: '1-2 semanas', deliverables: ['Dashboard', 'Usage Cards', 'Audit Logs', 'Admin Interno Mínimo'], gate: 'Owner vê saúde, uso, erros e limites do workspace.' },
  { sprint: 7, title: 'Sprint 7: QA/Demo/Hardening', duration: '1 semana', deliverables: ['Seed Demo', 'Tests Automáticos', 'Security Checklist', 'Deploy Staging'], gate: 'Produto pode ser demonstrado sem gambiarra e sem vazamentos.' }
];

export const MasterPromptGenerator = {
  generatePrompt() {
    return `Você está construindo o MVP do Lyriq Agents OS.

Produto:
SaaS multi-tenant para criação e operação de agentes de IA com workspace, BYOK, memória, arquivos/RAG, tools, tarefas, billing, limites, segurança e dashboard.

Stack recomendada:
- Next.js + TypeScript
- Tailwind + componentes reutilizáveis
- Supabase Auth, Postgres, Storage, Edge Functions e pgvector
- Stripe Billing
- Provider adapters para modelos de IA

Prioridade absoluta:
1. Auth, workspace e RLS
2. Billing, planos, BYOK e limites
3. Agent runtime e chat
4. Files/RAG/memory
5. Tools com DuckDuckGo e web fetch seguro
6. Tasks simples
7. Dashboard, audit logs e admin mínimo
8. QA, seed demo e hardening

Regras duras:
- Todo recurso operacional tem workspace_id.
- RLS em todas as tabelas operacionais.
- Backend checa permissão, plano e limite.
- Service role key nunca no frontend.
- API keys criptografadas e mascaradas.
- Logs sem secrets.
- Tool output, web e RAG são untrusted.
- Prompt injection não pode executar ação.
- SSRF protection obrigatória em web fetch.
- Risk 3/4 exige aprovação.
- Storage e RAG têm limites separados.
- Add-ons são por workspace.
- Não implementar conectores grandes antes do core funcionar.`;
  }
};

export const ConsolidatedArchitectureService = {
  getExecutiveOverview() {
    return {
      productName: 'Lyriq Agents OS V1',
      thesis: 'Sistema operacional de agentes SaaS production-ready com BYOK, RLS e limites backend.',
      totalTablesCount: CONSOLIDATED_TABLES_CATALOG.length,
      sprintsCount: SPRINT_PLAN.length,
      byokFirst: true,
      rlsEnforced: true
    };
  },

  getSchemaCatalog() {
    return CONSOLIDATED_TABLES_CATALOG;
  },

  getSprintPlan() {
    return SPRINT_PLAN;
  },

  generateMasterPrompt() {
    return MasterPromptGenerator.generatePrompt();
  }
};
